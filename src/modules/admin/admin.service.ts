import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
import { PromptService } from '../prompt/prompt.service';
import { ChatSessionService } from '../conversation/services/chat-session.service';
import { GeminiService } from '../gemini/gemini.service';
import { CreatePromptTemplateDto } from '../prompt/dto/create-prompt-template.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(PromptTemplate.name)
    private promptTemplateModel: Model<PromptTemplateDocument>,
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    private promptService: PromptService,
    private chatSessionService: ChatSessionService,
    private geminiService: GeminiService,
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
    const geminiInitialized = this.geminiService.isInitialized();

    const totalSessions = await this.chatSessionModel.countDocuments().exec();

    const messageStats = await this.chatSessionModel.aggregate([
      { $unwind: '$messages' },
      { $count: 'total' },
    ]);

    const totalMessages = messageStats.length > 0 ? messageStats[0].total : 0;

    const totalTemplates = await this.promptTemplateModel
      .countDocuments()
      .exec();

    return {
      status: mongoConnected && geminiInitialized ? 'healthy' : 'degraded',
      services: {
        mongodb: mongoConnected ? 'connected' : 'disconnected',
        gemini: geminiInitialized ? 'initialized' : 'not initialized',
      },
      database: {
        chatSessions: totalSessions,
        messages: totalMessages,
        promptTemplates: totalTemplates,
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
}
