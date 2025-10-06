import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
  Message,
} from '../schemas/chat-session.schema';
import { TemplateSimulatorService } from './template-simulator.service';
import { SecurityEventService } from './security-event.service';

export interface StartSessionDto {
  userId: string;
  templateId: string;
  transcriptionsEnabled?: boolean;
}

export interface AddMessageDto {
  sessionId: string;
  role: 'user' | 'model';
  text: string;
  isContextMessage?: boolean;
}

export interface EndSessionDto {
  sessionId: string;
  summary?: string;
}

export interface SessionFeedbackDto {
  rating: number; // 1-5
  wasHelpful: boolean;
  difficultyLevel: 'too_easy' | 'just_right' | 'too_hard';
  comments?: string;
}

@Injectable()
export class ChatSessionService {
  private readonly logger = new Logger(ChatSessionService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    private templateService: TemplateSimulatorService,
    private securityEventService: SecurityEventService,
  ) {}

  /**
   * Start a new chat session
   */
  async startSession(dto: StartSessionDto): Promise<ChatSessionDocument> {
    // Validate template exists and is active
    const template = await this.templateService.findById(dto.templateId);

    if (!template.isActive) {
      throw new BadRequestException('Template is not active');
    }

    // Check if user has an active session
    const activeSession = await this.chatSessionModel.findOne({
      userId: dto.userId,
      isActive: true,
    });

    if (activeSession) {
      throw new BadRequestException(
        'You already have an active session. Please end it first.',
      );
    }

    const session = new this.chatSessionModel({
      userId: dto.userId,
      templateId: dto.templateId,
      transcriptionsEnabled: dto.transcriptionsEnabled ?? true,
      messages: [],
      isActive: true,
      startedAt: new Date(),
      metrics: {
        messageCount: 0,
        completedNaturally: false,
      },
    });

    const savedSession = await session.save();

    this.logger.log(
      `Chat session started: ${String(savedSession.toObject()._id)} for user ${dto.userId}`,
    );

    return this.findById(String(savedSession.toObject()._id));
  }

  /**
   * Add a message to session
   */
  async addMessage(dto: AddMessageDto): Promise<ChatSessionDocument> {
    const session = await this.chatSessionModel.findById(dto.sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    const message: Message = {
      role: dto.role,
      text: dto.text,
      timestamp: new Date(),
      isContextMessage: dto.isContextMessage || false,
    };

    session.messages.push(message);
    session.metrics.messageCount = session.messages.length;

    await session.save();

    return session;
  }

  /**
   * End a chat session
   */
  async endSession(dto: EndSessionDto): Promise<ChatSessionDocument> {
    const session = await this.chatSessionModel.findById(dto.sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.isActive) {
      throw new BadRequestException('Session already ended');
    }

    session.isActive = false;
    session.endedAt = new Date();

    if (dto.summary) {
      session.summary = dto.summary;
    }

    // Calculate duration in seconds
    const duration = Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );
    session.metrics.duration = duration;
    session.metrics.completedNaturally = true;

    await session.save();

    this.logger.log(`Chat session ended: ${String(session.toObject()._id)}`);

    // TODO: Update UserStats (totalConversations, conversationsByTopic, etc.)

    return this.findById(dto.sessionId);
  }

  /**
   * Add feedback to session
   */
  async addFeedback(
    sessionId: string,
    feedback: SessionFeedbackDto,
  ): Promise<ChatSessionDocument> {
    const session = await this.chatSessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.isActive) {
      throw new BadRequestException('Cannot add feedback to active session');
    }

    session.feedback = {
      rating: feedback.rating,
      wasHelpful: feedback.wasHelpful,
      difficultyLevel: feedback.difficultyLevel,
      comments: feedback.comments,
    };

    await session.save();

    this.logger.log(`Feedback added to session: ${sessionId}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async findById(id: string): Promise<ChatSessionDocument> {
    const session = await this.chatSessionModel
      .findById(id)
      .populate('userId', 'name')
      .populate('templateId')
      .exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * Get all sessions for a user
   */
  async findByUser(
    userId: string,
    isActive?: boolean,
  ): Promise<ChatSessionDocument[]> {
    const query: any = { userId };

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    return this.chatSessionModel
      .find(query)
      .populate('templateId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get active session for a user
   */
  async getActiveSession(userId: string): Promise<ChatSessionDocument | null> {
    return this.chatSessionModel
      .findOne({ userId, isActive: true })
      .populate('templateId')
      .exec();
  }

  /**
   * Get all sessions (admin)
   */
  async findAll(filters?: {
    userId?: string;
    templateId?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<ChatSessionDocument[]> {
    const query: any = {};

    if (filters?.userId) {
      query.userId = filters.userId;
    }

    if (filters?.templateId) {
      query.templateId = filters.templateId;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const limit = filters?.limit || 50;

    return this.chatSessionModel
      .find(query)
      .populate('userId', 'name')
      .populate('templateId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<void> {
    await this.chatSessionModel.findByIdAndDelete(id);

    this.logger.log(`Chat session deleted: ${id}`);
  }

  /**
   * Check for prompt injection in user message
   */
  async checkPromptInjection(
    sessionId: string,
    userId: string,
    input: string,
  ): Promise<{ isSafe: boolean; reason?: string }> {
    // Simple prompt injection detection patterns
    const suspiciousPatterns = [
      /ignore\s+(previous|all|above)\s+instructions?/i,
      /forget\s+(everything|all|previous)/i,
      /you\s+are\s+now/i,
      /new\s+instructions?:/i,
      /system\s*:/i,
      /\[INST\]/i,
      /<\|im_start\|>/i,
      /<script>/i,
      /prompt\s*:/i,
      /override/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        const reason = `Suspicious pattern detected: ${pattern.source}`;

        // Log security event
        await this.securityEventService.logEvent({
          sessionId,
          userId,
          type: 'prompt_injection_attempt',
          input,
          reason,
          severity: 'medium',
        });

        return { isSafe: false, reason };
      }
    }

    return { isSafe: true };
  }
}
