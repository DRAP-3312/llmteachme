import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { GeminiService } from '../gemini/gemini.service';
import { PromptService } from '../prompt/prompt.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GeminiMessage } from '../../common/interfaces/gemini.interface';
import { ConversationContext, ConversationMetadata } from '../../common/interfaces/conversation.interface';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    private geminiService: GeminiService,
    private promptService: PromptService,
  ) {}

  /**
   * Create a new conversation
   */
  async createConversation(dto: CreateConversationDto): Promise<ConversationDocument> {
    const conversation = new this.conversationModel({
      userId: dto.userId,
      conversationType: dto.conversationType || 'general',
      metadata: dto.metadata || {},
      isActive: true,
      messages: [],
    });

    await conversation.save();
    this.logger.log(`Created conversation ${conversation._id} for user ${dto.userId}`);

    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('messages')
      .exec();

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get active conversation for a user
   */
  async getActiveConversation(userId: string): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOne({ userId, isActive: true })
      .populate('messages')
      .exec();
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Process user message and generate AI response
   */
  async processMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<{ userMessage: MessageDocument; assistantMessage: MessageDocument }> {
    // 1. Get or create conversation
    let conversation: ConversationDocument;

    if (dto.conversationId) {
      conversation = await this.getConversation(dto.conversationId);
    } else {
      const activeConversation = await this.getActiveConversation(userId);
      if (activeConversation) {
        conversation = activeConversation;
      } else {
        conversation = await this.createConversation({
          userId,
          conversationType: 'general',
          metadata: { level: 'intermediate' },
        });
      }
    }

    // 2. Check for prompt injection
    const injectionCheck = this.promptService.checkPromptInjection(dto.content);

    if (!injectionCheck.isSafe) {
      this.logger.warn(`Prompt injection detected from user ${userId}: ${injectionCheck.threats.join(', ')}`);
      // Use sanitized input
      dto.content = injectionCheck.sanitizedInput || dto.content;
    }

    // 3. Save user message
    const conversationId = (conversation._id as any).toString();
    const userMessage = await this.createMessage({
      conversationId,
      role: 'user',
      content: dto.content,
      type: dto.type || 'text',
    });

    // 4. Build conversation context
    const messages = await this.getConversationMessages(conversationId);
    const context: ConversationContext = {
      userId,
      conversationId,
      history: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      metadata: conversation.metadata as ConversationMetadata,
    };

    // 5. Compile prompts using 3-layer system
    const compiledPrompt = await this.promptService.compilePrompt(context);

    // 6. Generate AI response
    const geminiMessages: GeminiMessage[] = context.history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const aiResponse = await this.geminiService.generateResponse(
      geminiMessages,
      compiledPrompt.fullPrompt,
    );

    // 7. Analyze user message (grammar, vocabulary)
    let analysis;
    try {
      analysis = await this.geminiService.analyzeText(
        dto.content,
        conversation.metadata?.level || 'intermediate',
      );
    } catch (error) {
      this.logger.error('Error analyzing text', error);
      analysis = null;
    }

    // 8. Save assistant message
    const assistantMessage = await this.createMessage({
      conversationId,
      role: 'assistant',
      content: aiResponse.text,
      type: 'text',
    });

    // 9. Update user message with analysis
    if (analysis) {
      userMessage.analysis = analysis;
      await userMessage.save();
    }

    // 10. Update assistant message metadata
    assistantMessage.metadata = {
      model: 'gemini-pro',
      tokensUsed: aiResponse.tokensUsed,
      processingTime: aiResponse.processingTime,
    };
    await assistantMessage.save();

    this.logger.log(`Processed message for conversation ${conversation._id}`);

    return { userMessage, assistantMessage };
  }

  /**
   * Create a message
   */
  async createMessage(dto: CreateMessageDto): Promise<MessageDocument> {
    const message = new this.messageModel({
      conversationId: new Types.ObjectId(dto.conversationId),
      role: dto.role,
      content: dto.content,
      type: dto.type || 'text',
      audioUrl: dto.audioUrl,
    });

    await message.save();

    // Update conversation's message array
    await this.conversationModel.findByIdAndUpdate(
      dto.conversationId,
      { $push: { messages: message._id } },
    );

    return message;
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          isActive: false,
          endedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    this.logger.log(`Ended conversation ${conversationId}`);
    return conversation;
  }

  /**
   * Delete a conversation and its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    // Delete all messages
    await this.messageModel.deleteMany({ conversationId }).exec();

    // Delete conversation
    await this.conversationModel.findByIdAndDelete(conversationId).exec();

    this.logger.log(`Deleted conversation ${conversationId}`);
  }
}
