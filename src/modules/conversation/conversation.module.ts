import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationService } from './conversation.service';
import { ConversationGateway } from './conversation/conversation.gateway';
import { ConversationController } from './conversation.controller';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema';
import { Topic, TopicSchema } from './schemas/topic.schema';
import {
  TemplateSimulator,
  TemplateSimulatorSchema,
} from './schemas/template-simulator.schema';
import {
  SecurityEvent,
  SecurityEventSchema,
} from './schemas/security-event.schema';
import { PromptModule } from '../prompt/prompt.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Old schemas (keep for backward compatibility during migration)
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      // New schemas according to documentation
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: TemplateSimulator.name, schema: TemplateSimulatorSchema },
      { name: SecurityEvent.name, schema: SecurityEventSchema },
    ]),
    PromptModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationGateway],
  exports: [ConversationService, MongooseModule],
})
export class ConversationModule {}
