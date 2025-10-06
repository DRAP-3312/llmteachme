import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, UseGuards } from '@nestjs/common';
import { ChatSessionService } from './services/chat-session.service';
import type { IAIProvider } from '../../shared/providers/ai';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { AudioValidator } from './helpers/audio-validator.helper';

interface UserMessagePayload {
  sessionId: string;
  text?: string;
  audio?: {
    data: string; // base64 encoded audio
    mimeType: string;
  };
}

interface EndSessionPayload {
  sessionId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatSessionService: ChatSessionService,
    @Inject('IAIProvider') private aiProvider: IAIProvider,
  ) {}

  /**
   * Handle client connection (after JWT validation by WsJwtGuard)
   */
  handleConnection(client: Socket) {
    const userId = (client as any).user?.userId;
    this.logger.log(
      `Client connected: socketId=${client.id}, userId=${userId}`,
    );

    // Emit connection success
    client.emit('connected', {
      success: true,
      userId,
      socketId: client.id,
    });
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    const userId = (client as any).user?.userId;
    this.logger.log(
      `Client disconnected: socketId=${client.id}, userId=${userId}`,
    );
  }

  /**
   * Handle user message (text or audio)
   */
  @SubscribeMessage('user_message')
  async handleUserMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UserMessagePayload,
  ) {
    try {
      const userId = (client as any).user?.userId;
      const { sessionId, text, audio } = data;

      // Validate session ownership
      await this.validateSessionOwnership(sessionId, userId);

      let userText: string;

      // Process audio if provided
      if (audio) {
        this.logger.debug(`Processing audio message for session ${sessionId}`);

        // Validate and transcribe audio
        userText = await this.processAudio(audio.data, audio.mimeType);

        this.logger.debug(
          `Transcribed audio: ${userText.substring(0, 100)}...`,
        );
      } else if (text) {
        userText = text;
      } else {
        throw new Error('Either text or audio must be provided');
      }

      // Check prompt injection
      const injectionCheck = await this.chatSessionService.checkPromptInjection(
        sessionId,
        userId,
        userText,
      );

      if (!injectionCheck.isSafe) {
        client.emit('error', {
          message: 'Your message contains suspicious patterns',
          reason: injectionCheck.reason,
        });
        return;
      }

      // Add user message to session
      await this.chatSessionService.addMessage({
        sessionId,
        role: 'user',
        text: userText,
        isContextMessage: false,
      });

      // Emit typing indicator
      client.emit('assistant_typing', {
        sessionId,
        isTyping: true,
      });

      // Get session to build context
      const session = await this.chatSessionService.findById(sessionId);

      // Map messages to IAIProvider Message type
      const mappedMessages = session.messages.map((msg) => ({
        role: msg.role as 'user' | 'model',
        text: msg.text,
        timestamp: msg.timestamp,
        isContextMessage: msg.isContextMessage,
      }));

      // Generate AI response
      // TODO: Use proper system prompt and template instructions
      const aiResponse = await this.aiProvider.generateResponse(
        'You are a helpful English tutor.', // TODO: Get from SystemPromptCache
        'Practice conversation', // TODO: Get from TemplateSimulator
        'Student context', // TODO: Build user context
        mappedMessages,
      );

      // Add AI message to session
      await this.chatSessionService.addMessage({
        sessionId,
        role: 'model',
        text: aiResponse,
        isContextMessage: false,
      });

      // Emit AI response
      client.emit('ai_response', {
        sessionId,
        text: aiResponse,
        timestamp: new Date(),
      });

      // Stop typing indicator
      client.emit('assistant_typing', {
        sessionId,
        isTyping: false,
      });
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        message: 'Error processing your message',
        error: error.message,
      });

      // Stop typing indicator on error
      client.emit('assistant_typing', {
        sessionId: data.sessionId,
        isTyping: false,
      });
    }
  }

  /**
   * End session
   */
  @SubscribeMessage('end_session')
  async handleEndSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EndSessionPayload,
  ) {
    try {
      const userId = (client as any).user?.userId;
      const { sessionId } = data;

      // Validate session ownership
      await this.validateSessionOwnership(sessionId, userId);

      // Get session for summary generation
      const session = await this.chatSessionService.findById(sessionId);

      // Map messages for AI summary
      const mappedMessages = session.messages
        .filter((msg) => !msg.isContextMessage)
        .map((msg) => ({
          role: msg.role as 'user' | 'model',
          text: msg.text,
          timestamp: msg.timestamp,
          isContextMessage: msg.isContextMessage,
        }));

      // Generate summary using AI
      let summary = 'Session ended';
      try {
        summary = await this.aiProvider.generateSummary(mappedMessages);
      } catch (error) {
        this.logger.error(`Error generating summary: ${error.message}`);
        summary = 'Session completed';
      }

      // End session with summary
      const endedSession = await this.chatSessionService.endSession({
        sessionId,
        summary,
      });

      client.emit('session_ended', {
        sessionId,
        summary: endedSession.summary,
        metrics: endedSession.metrics,
      });

      this.logger.log(`Session ${sessionId} ended by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`);
      client.emit('error', {
        message: 'Error ending session',
        error: error.message,
      });
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Validate that the user owns the session
   */
  private async validateSessionOwnership(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await this.chatSessionService.findById(sessionId);

    if (session.userId.toString() !== userId) {
      throw new Error(
        `Unauthorized: User ${userId} does not own session ${sessionId}`,
      );
    }
  }

  /**
   * Process audio: validate and transcribe
   */
  private async processAudio(
    audioBase64: string,
    mimeType: string,
  ): Promise<string> {
    // Decode base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Validate audio
    AudioValidator.validate(audioBuffer, mimeType);

    // Transcribe using AI provider
    const transcription = await this.aiProvider.transcribeAudio(
      audioBuffer,
      mimeType,
    );

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Audio transcription resulted in empty text');
    }

    return transcription;
  }
}
