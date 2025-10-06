import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PromptTemplate,
  PromptTemplateDocument,
} from '../prompt/schemas/prompt-template.schema';
import {
  ChatSession,
  ChatSessionDocument,
} from '../conversation/schemas/chat-session.schema';
import {
  SystemPromptConfig,
  SystemPromptConfigDocument,
} from './schemas/system-prompt-config.schema';
import { PromptService } from '../prompt/prompt.service';
import { ChatSessionService } from '../conversation/services/chat-session.service';
import { SystemPromptCompilerService } from './services/system-prompt-compiler.service';
import { SystemPromptCacheService } from './services/system-prompt-cache.service';
import { CreatePromptTemplateDto } from '../prompt/dto/create-prompt-template.dto';
import {
  CreateSystemPromptDto,
  UpdateSystemPromptDto,
  SystemPromptResponseDto,
  PreviewPromptDto,
} from './dto/system-prompt.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(PromptTemplate.name)
    private promptTemplateModel: Model<PromptTemplateDocument>,
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(SystemPromptConfig.name)
    private systemPromptModel: Model<SystemPromptConfigDocument>,
    private promptService: PromptService,
    private chatSessionService: ChatSessionService,
    private systemPromptCompiler: SystemPromptCompilerService,
    private systemPromptCache: SystemPromptCacheService,
  ) {}

  // ==================== Prompt Templates CRUD ====================

  async getAllTemplates(): Promise<PromptTemplateDocument[]> {
    return this.promptTemplateModel
      .find()
      .sort({ layer: 1, priority: -1 })
      .exec();
  }

  async getTemplatesByLayer(
    layer: 'system' | 'user' | 'context',
  ): Promise<PromptTemplateDocument[]> {
    return this.promptService.getTemplatesByLayer(layer);
  }

  async getTemplateByName(name: string): Promise<PromptTemplateDocument> {
    const template = await this.promptTemplateModel.findOne({ name }).exec();
    if (!template) {
      throw new NotFoundException(`Template '${name}' not found`);
    }
    return template;
  }

  async createTemplate(
    dto: CreatePromptTemplateDto,
  ): Promise<PromptTemplateDocument> {
    return this.promptService.createTemplate(dto);
  }

  async updateTemplate(
    name: string,
    updates: Partial<CreatePromptTemplateDto>,
  ): Promise<PromptTemplateDocument> {
    const result = await this.promptService.updateTemplate(
      name,
      updates as any,
    );
    if (!result) {
      throw new NotFoundException(`Template '${name}' not found`);
    }
    return result;
  }

  async deleteTemplate(name: string): Promise<{ message: string }> {
    await this.promptService.deleteTemplate(name);
    return { message: `Template '${name}' deleted successfully` };
  }

  async toggleTemplateStatus(name: string): Promise<PromptTemplateDocument> {
    const template = await this.getTemplateByName(name);
    return this.updateTemplate(name, { isActive: !template.isActive });
  }

  // ==================== Statistics ====================

  async getConversationStats(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const query: any = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      query.startedAt = {};
      if (filters.startDate) {
        query.startedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.startedAt.$lte = filters.endDate;
      }
    }

    const total = await this.chatSessionModel.countDocuments(query).exec();
    const active = await this.chatSessionModel
      .countDocuments({ ...query, isActive: true })
      .exec();
    const ended = await this.chatSessionModel
      .countDocuments({ ...query, isActive: false })
      .exec();

    return {
      total,
      active,
      ended,
    };
  }

  async getMessageStats(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const query: any = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      query.startedAt = {};
      if (filters.startDate) {
        query.startedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.startedAt.$lte = filters.endDate;
      }
    }

    const result = await this.chatSessionModel.aggregate([
      { $match: query },
      { $unwind: '$messages' },
      {
        $group: {
          _id: '$messages.role',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return {
      total,
      byRole: result.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async getUserStats() {
    const uniqueUsers = await this.chatSessionModel.distinct('userId').exec();

    const userActivity = await Promise.all(
      uniqueUsers.slice(0, 100).map(async (userId) => {
        const sessionCount = await this.chatSessionModel
          .countDocuments({ userId })
          .exec();

        const sessions = await this.chatSessionModel
          .find({ userId })
          .select('messages')
          .exec();

        const messageCount = sessions.reduce(
          (sum, session) => sum + session.messages.length,
          0,
        );

        return {
          userId,
          sessionCount,
          messageCount,
        };
      }),
    );

    return {
      totalUsers: uniqueUsers.length,
      users: userActivity.sort((a, b) => b.messageCount - a.messageCount),
    };
  }

  async getSystemHealth() {
    const mongoConnected =
      (this.chatSessionModel.db.readyState as number) === 1;

    const totalSessions = await this.chatSessionModel.countDocuments().exec();

    const messageStats = await this.chatSessionModel.aggregate([
      { $unwind: '$messages' },
      { $count: 'total' },
    ]);

    const totalMessages = messageStats.length > 0 ? messageStats[0].total : 0;

    const totalTemplates = await this.promptTemplateModel
      .countDocuments()
      .exec();

    const activeSystemPrompt = await this.systemPromptModel
      .findOne({ isActive: true })
      .exec();

    return {
      status: mongoConnected ? 'healthy' : 'degraded',
      services: {
        mongodb: mongoConnected ? 'connected' : 'disconnected',
        systemPrompt: activeSystemPrompt
          ? `active (v${activeSystemPrompt.version})`
          : 'no active prompt',
      },
      database: {
        chatSessions: totalSessions,
        messages: totalMessages,
        promptTemplates: totalTemplates,
        systemPrompts: await this.systemPromptModel.countDocuments().exec(),
      },
      timestamp: new Date(),
    };
  }

  // ==================== Chat Sessions Management ====================

  async getChatSessions(filters: {
    userId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const total = await this.chatSessionModel.countDocuments(query).exec();
    const sessions = await this.chatSessionModel
      .find(query)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('templateId')
      .exec();

    return {
      data: sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChatSessionDetails(sessionId: string) {
    const session = await this.chatSessionService.findById(sessionId);

    return {
      session,
      messageCount: session.messages.length,
    };
  }

  async deleteChatSession(sessionId: string) {
    await this.chatSessionModel.findByIdAndDelete(sessionId).exec();
    return { message: `Chat session ${sessionId} deleted successfully` };
  }

  // ==================== System Prompt Management ====================

  /**
   * Get active system prompt
   */
  async getActiveSystemPrompt(): Promise<SystemPromptResponseDto> {
    const activePrompt = await this.systemPromptModel
      .findOne({ isActive: true })
      .exec();

    if (!activePrompt) {
      throw new NotFoundException(
        'No active system prompt found. Please activate a configuration.',
      );
    }

    return this.mapToResponseDto(activePrompt);
  }

  /**
   * Get all system prompt versions
   */
  async getSystemPromptVersions(filters?: {
    isActive?: boolean;
  }): Promise<SystemPromptResponseDto[]> {
    const query: any = {};

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const prompts = await this.systemPromptModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    return prompts.map((prompt) => this.mapToResponseDto(prompt));
  }

  /**
   * Create new system prompt version
   */
  async createSystemPrompt(
    dto: CreateSystemPromptDto,
    adminId: string,
  ): Promise<SystemPromptResponseDto> {
    // Auto-increment version
    const latestVersion = await this.getLatestVersion();
    const newVersion = this.incrementVersion(latestVersion);

    // Compile the prompt
    const compiledPrompt = this.systemPromptCompiler.compile({
      botName: dto.botName || 'Mr. Butter',
      personality: dto.personality,
      correctionStyle: dto.correctionStyle,
      responseLengthByLevel: dto.responseLengthByLevel,
      simulationBehavior: dto.simulationBehavior,
      securityRules: dto.securityRules,
    });

    // Create new configuration (not active by default)
    const newPrompt = new this.systemPromptModel({
      version: newVersion,
      botName: dto.botName || 'Mr. Butter',
      personality: dto.personality,
      correctionStyle: dto.correctionStyle,
      responseLengthByLevel: dto.responseLengthByLevel,
      simulationBehavior: dto.simulationBehavior,
      securityRules: dto.securityRules,
      compiledPrompt,
      isActive: false,
      createdBy: adminId,
    });

    const saved = await newPrompt.save();

    this.logger.log(
      `Created new system prompt version ${newVersion} by admin ${adminId}`,
    );

    return this.mapToResponseDto(saved);
  }

  /**
   * Update system prompt (only if not active)
   */
  async updateSystemPrompt(
    id: string,
    dto: UpdateSystemPromptDto,
  ): Promise<SystemPromptResponseDto> {
    const prompt = await this.systemPromptModel.findById(id).exec();

    if (!prompt) {
      throw new NotFoundException(`System prompt with id ${id} not found`);
    }

    if (prompt.isActive) {
      throw new BadRequestException(
        'Cannot edit an active system prompt. Deactivate it first or create a new version.',
      );
    }

    // Update fields
    if (dto.botName !== undefined) prompt.botName = dto.botName;
    if (dto.personality !== undefined) prompt.personality = dto.personality;
    if (dto.correctionStyle !== undefined)
      prompt.correctionStyle = dto.correctionStyle;
    if (dto.responseLengthByLevel !== undefined)
      prompt.responseLengthByLevel = dto.responseLengthByLevel;
    if (dto.simulationBehavior !== undefined)
      prompt.simulationBehavior = dto.simulationBehavior;
    if (dto.securityRules !== undefined)
      prompt.securityRules = dto.securityRules;

    // Re-compile prompt
    prompt.compiledPrompt = this.systemPromptCompiler.compile(prompt);

    const updated = await prompt.save();

    this.logger.log(`Updated system prompt version ${prompt.version}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Activate a system prompt version
   */
  async activateSystemPrompt(id: string): Promise<SystemPromptResponseDto> {
    const prompt = await this.systemPromptModel.findById(id).exec();

    if (!prompt) {
      throw new NotFoundException(`System prompt with id ${id} not found`);
    }

    if (prompt.isActive) {
      throw new ConflictException(
        `System prompt version ${prompt.version} is already active`,
      );
    }

    // Deactivate all prompts
    await this.systemPromptModel
      .updateMany({ isActive: true }, { isActive: false })
      .exec();

    // Activate selected prompt
    prompt.isActive = true;
    prompt.activatedAt = new Date();
    const activated = await prompt.save();

    // Invalidate cache
    this.systemPromptCache.invalidateCache();

    this.logger.log(
      `Activated system prompt version ${prompt.version}. Cache invalidated.`,
    );

    return this.mapToResponseDto(activated);
  }

  /**
   * Preview compiled prompt without saving
   */
  previewSystemPrompt(dto: PreviewPromptDto): { compiledPrompt: string } {
    const compiledPrompt = this.systemPromptCompiler.compile({
      botName: dto.botName || 'Mr. Butter',
      personality: dto.personality,
      correctionStyle: dto.correctionStyle,
      responseLengthByLevel: dto.responseLengthByLevel,
      simulationBehavior: dto.simulationBehavior,
      securityRules: dto.securityRules,
    });

    return { compiledPrompt };
  }

  /**
   * Delete a system prompt version (only if not active)
   */
  async deleteSystemPrompt(id: string): Promise<{ message: string }> {
    const prompt = await this.systemPromptModel.findById(id).exec();

    if (!prompt) {
      throw new NotFoundException(`System prompt with id ${id} not found`);
    }

    if (prompt.isActive) {
      throw new BadRequestException(
        'Cannot delete an active system prompt. Activate another version first.',
      );
    }

    await this.systemPromptModel.findByIdAndDelete(id).exec();

    this.logger.log(`Deleted system prompt version ${prompt.version}`);

    return {
      message: `System prompt version ${prompt.version} deleted successfully`,
    };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get latest version number
   */
  private async getLatestVersion(): Promise<string> {
    const latestPrompt = await this.systemPromptModel
      .findOne()
      .sort({ version: -1 })
      .exec();

    return latestPrompt ? latestPrompt.version : '0.0';
  }

  /**
   * Increment version number (e.g., "1.2" -> "1.3")
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 0;
    const minor = parseInt(parts[1]) || 0;

    return `${major}.${minor + 1}`;
  }

  /**
   * Map document to response DTO
   */
  private mapToResponseDto(
    doc: SystemPromptConfigDocument,
  ): SystemPromptResponseDto {
    return {
      id: (doc._id as any).toString(),
      version: doc.version,
      botName: doc.botName,
      personality: doc.personality as any,
      correctionStyle: doc.correctionStyle as any,
      responseLengthByLevel: doc.responseLengthByLevel as any,
      simulationBehavior: doc.simulationBehavior as any,
      securityRules: doc.securityRules,
      compiledPrompt: doc.compiledPrompt,
      isActive: doc.isActive,
      createdBy: doc.createdBy.toString(),
      createdAt: (doc as any).createdAt,
      activatedAt: doc.activatedAt,
    };
  }
}
