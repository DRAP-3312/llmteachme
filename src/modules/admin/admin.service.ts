import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptTemplate, PromptTemplateDocument } from '../prompt/schemas/prompt-template.schema';
import { Conversation, ConversationDocument } from '../conversation/schemas/conversation.schema';
import { Message, MessageDocument } from '../conversation/schemas/message.schema';
import { PromptService } from '../prompt/prompt.service';
import { ConversationService } from '../conversation/conversation.service';
import { GeminiService } from '../gemini/gemini.service';
import { CreatePromptTemplateDto } from '../prompt/dto/create-prompt-template.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(PromptTemplate.name)
    private promptTemplateModel: Model<PromptTemplateDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    private promptService: PromptService,
    private conversationService: ConversationService,
    private geminiService: GeminiService,
  ) {}

  // ==================== Prompt Templates CRUD ====================

  async getAllTemplates(): Promise<PromptTemplateDocument[]> {
    return this.promptTemplateModel.find().sort({ layer: 1, priority: -1 }).exec();
  }

  async getTemplatesByLayer(layer: 'system' | 'user' | 'context'): Promise<PromptTemplateDocument[]> {
    return this.promptService.getTemplatesByLayer(layer);
  }

  async getTemplateByName(name: string): Promise<PromptTemplateDocument> {
    const template = await this.promptTemplateModel.findOne({ name }).exec();
    if (!template) {
      throw new NotFoundException(`Template '${name}' not found`);
    }
    return template;
  }

  async createTemplate(dto: CreatePromptTemplateDto): Promise<PromptTemplateDocument> {
    return this.promptService.createTemplate(dto);
  }

  async updateTemplate(
    name: string,
    updates: Partial<CreatePromptTemplateDto>,
  ): Promise<PromptTemplateDocument> {
    const result = await this.promptService.updateTemplate(name, updates as any);
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
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const total = await this.conversationModel.countDocuments(query).exec();
    const active = await this.conversationModel.countDocuments({ ...query, isActive: true }).exec();
    const ended = await this.conversationModel.countDocuments({ ...query, isActive: false }).exec();

    const conversationsByType = await this.conversationModel.aggregate([
      { $match: query },
      { $group: { _id: '$conversationType', count: { $sum: 1 } } },
    ]);

    return {
      total,
      active,
      ended,
      byType: conversationsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  async getMessageStats(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const query: any = {};

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    // If userId filter, need to join with conversations
    let totalMessages;
    let messagesByRole;

    if (filters.userId) {
      const conversations = await this.conversationModel
        .find({ userId: filters.userId })
        .select('_id')
        .exec();
      const conversationIds = conversations.map((c) => c._id);

      query.conversationId = { $in: conversationIds };

      totalMessages = await this.messageModel.countDocuments(query).exec();
      messagesByRole = await this.messageModel.aggregate([
        { $match: query },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]);
    } else {
      totalMessages = await this.messageModel.countDocuments(query).exec();
      messagesByRole = await this.messageModel.aggregate([
        { $match: query },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]);
    }

    return {
      total: totalMessages,
      byRole: messagesByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  async getUserStats() {
    const uniqueUsers = await this.conversationModel.distinct('userId').exec();

    const userActivity = await Promise.all(
      uniqueUsers.slice(0, 100).map(async (userId) => {
        const conversationCount = await this.conversationModel.countDocuments({ userId }).exec();
        const conversations = await this.conversationModel
          .find({ userId })
          .select('_id')
          .exec();
        const conversationIds = conversations.map((c) => c._id);
        const messageCount = await this.messageModel
          .countDocuments({ conversationId: { $in: conversationIds } })
          .exec();

        return {
          userId,
          conversationCount,
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
    const mongoConnected = this.conversationModel.db.readyState === 1;
    const geminiInitialized = this.geminiService.isInitialized();

    const totalConversations = await this.conversationModel.countDocuments().exec();
    const totalMessages = await this.messageModel.countDocuments().exec();
    const totalTemplates = await this.promptTemplateModel.countDocuments().exec();

    return {
      status: mongoConnected && geminiInitialized ? 'healthy' : 'degraded',
      services: {
        mongodb: mongoConnected ? 'connected' : 'disconnected',
        gemini: geminiInitialized ? 'initialized' : 'not initialized',
      },
      database: {
        conversations: totalConversations,
        messages: totalMessages,
        promptTemplates: totalTemplates,
      },
      timestamp: new Date(),
    };
  }

  // ==================== Conversations Management ====================

  async getConversations(filters: {
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

    const total = await this.conversationModel.countDocuments(query).exec();
    const conversations = await this.conversationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data: conversations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversationDetails(conversationId: string) {
    const conversation = await this.conversationService.getConversation(conversationId);
    const messages = await this.conversationService.getConversationMessages(conversationId);

    return {
      conversation,
      messages,
      messageCount: messages.length,
    };
  }

  async deleteConversation(conversationId: string) {
    await this.conversationService.deleteConversation(conversationId);
    return { message: `Conversation ${conversationId} deleted successfully` };
  }
}
