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
import { Logger, Inject } from '@nestjs/common';
import { ChatSessionService } from './services/chat-session.service';
import type { IAIProvider } from '../../shared/providers/ai';

interface RegisterPayload {
  userId: string;
  token: string; // JWT token
}

interface UserMessagePayload {
  userId: string;
  sessionId: string;
  text: string;
  audioUrl?: string;
}

interface EndSessionPayload {
  userId: string;
  sessionId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    private chatSessionService: ChatSessionService,
    @Inject('IAIProvider') private aiProvider: IAIProvider,
  ) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from user sockets map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  /**
   * Register user to WebSocket
   */
  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RegisterPayload,
  ) {
    // TODO: Validate JWT token

    this.userSockets.set(data.userId, client.id);
    this.logger.log(`User ${data.userId} registered to socket ${client.id}`);

    client.emit('registered', {
      success: true,
      userId: data.userId,
    });
  }

  /**
   * Handle user message
   */
  @SubscribeMessage('user_message')
  async handleUserMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UserMessagePayload,
  ) {
    try {
      const { userId, sessionId, text } = data;

      // Check prompt injection
      const injectionCheck = await this.chatSessionService.checkPromptInjection(
        sessionId,
        userId,
        text,
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
        text,
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
      const { userId, sessionId } = data;

      // TODO: Generate summary using AI

      const session = await this.chatSessionService.endSession({
        sessionId,
        summary: 'Session ended by user',
      });

      client.emit('session_ended', {
        sessionId,
        summary: session.summary,
        metrics: session.metrics,
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
}
