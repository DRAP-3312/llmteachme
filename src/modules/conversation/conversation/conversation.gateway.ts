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
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConversationService } from '../conversation.service';
import { SendMessageDto } from '../dto/send-message.dto';

@ApiTags('websocket')
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ConversationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private conversationService: ConversationService) {}

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

  @SubscribeMessage('register')
  @ApiOperation({
    summary: 'Register user to WebSocket',
    description: 'Maps userId to socketId for real-time messaging. Client receives "registered" event on success.'
  })
  @ApiResponse({ status: 200, description: 'User registered successfully, emits "registered" event' })
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.userSockets.set(data.userId, client.id);
    this.logger.log(`User ${data.userId} registered to socket ${client.id}`);

    client.emit('registered', {
      success: true,
      userId: data.userId,
    });
  }

  @SubscribeMessage('sendMessage')
  @ApiOperation({
    summary: 'Send chat message',
    description: 'Process user message through AI tutor. Returns analysis and AI response. Emits: assistantTyping, messageReceived, messageResponse, error'
  })
  @ApiResponse({ status: 200, description: 'Message processed, emits messageReceived and messageResponse events' })
  @ApiResponse({ status: 400, description: 'Validation error or prompt injection detected, emits error event' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; message: SendMessageDto },
  ) {
    try {
      this.logger.log(`Message from ${data.userId}: ${data.message.content}`);

      // Emit typing indicator
      this.server.to(client.id).emit('assistantTyping', { isTyping: true });

      // Process message
      const result = await this.conversationService.processMessage(
        data.userId,
        data.message,
      );

      // Stop typing indicator
      this.server.to(client.id).emit('assistantTyping', { isTyping: false });

      // Send user message confirmation
      this.server.to(client.id).emit('messageReceived', {
        message: result.userMessage,
        conversationId: result.userMessage.conversationId,
      });

      // Send AI response
      this.server.to(client.id).emit('messageResponse', {
        message: result.assistantMessage,
        analysis: result.userMessage.analysis,
        conversationId: result.assistantMessage.conversationId,
      });

      this.logger.log(`Response sent to ${data.userId}`);
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);

      this.server.to(client.id).emit('assistantTyping', { isTyping: false });
      this.server.to(client.id).emit('error', {
        message: 'Failed to process message',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('typing')
  @ApiOperation({
    summary: 'Typing indicator',
    description: 'Broadcast typing status to other users. Emits "userTyping" event to other clients.'
  })
  @ApiResponse({ status: 200, description: 'Typing indicator broadcasted' })
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; isTyping: boolean },
  ) {
    // Broadcast to other users in the same conversation if needed
    client.broadcast.emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('getConversation')
  @ApiOperation({
    summary: 'Get conversation history',
    description: 'Retrieve conversation details and all messages by conversationId. Emits "conversationData" event.'
  })
  @ApiResponse({ status: 200, description: 'Conversation retrieved, emits conversationData event' })
  @ApiResponse({ status: 404, description: 'Conversation not found, emits error event' })
  async handleGetConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const conversation = await this.conversationService.getConversation(
        data.conversationId,
      );
      const messages = await this.conversationService.getConversationMessages(
        data.conversationId,
      );

      client.emit('conversationData', {
        conversation,
        messages,
      });
    } catch (error) {
      this.logger.error(`Error getting conversation: ${error.message}`);
      client.emit('error', {
        message: 'Failed to get conversation',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('getActiveConversation')
  @ApiOperation({
    summary: 'Get active conversation',
    description: 'Retrieve the current active conversation for a user. Emits "activeConversation" event with conversation and messages or null.'
  })
  @ApiResponse({ status: 200, description: 'Active conversation retrieved, emits activeConversation event' })
  async handleGetActiveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    try {
      const conversation = await this.conversationService.getActiveConversation(
        data.userId,
      );

      if (conversation) {
        const messages = await this.conversationService.getConversationMessages(
          (conversation._id as any).toString(),
        );

        client.emit('activeConversation', {
          conversation,
          messages,
        });
      } else {
        client.emit('activeConversation', {
          conversation: null,
          messages: [],
        });
      }
    } catch (error) {
      this.logger.error(`Error getting active conversation: ${error.message}`);
      client.emit('error', {
        message: 'Failed to get active conversation',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('endConversation')
  @ApiOperation({
    summary: 'End conversation',
    description: 'Mark conversation as inactive (isActive=false). Emits "conversationEnded" event with updated conversation.'
  })
  @ApiResponse({ status: 200, description: 'Conversation ended, emits conversationEnded event' })
  @ApiResponse({ status: 404, description: 'Conversation not found, emits error event' })
  async handleEndConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const conversation = await this.conversationService.endConversation(
        data.conversationId,
      );

      client.emit('conversationEnded', {
        conversation,
      });

      this.logger.log(`Conversation ${data.conversationId} ended`);
    } catch (error) {
      this.logger.error(`Error ending conversation: ${error.message}`);
      client.emit('error', {
        message: 'Failed to end conversation',
        error: error.message,
      });
    }
  }
}
