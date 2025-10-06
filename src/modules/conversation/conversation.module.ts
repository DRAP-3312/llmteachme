import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
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
import { AIProviderModule } from '../../shared/providers/ai';
import { TopicService } from './services/topic.service';
import { TemplateSimulatorService } from './services/template-simulator.service';
import { ChatSessionService } from './services/chat-session.service';
import { SecurityEventService } from './services/security-event.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: TemplateSimulator.name, schema: TemplateSimulatorSchema },
      { name: SecurityEvent.name, schema: SecurityEventSchema },
    ]),
    PromptModule,
    AIProviderModule,
  ],
  controllers: [ChatController],
  providers: [
    TopicService,
    TemplateSimulatorService,
    ChatSessionService,
    SecurityEventService,
    ChatGateway,
  ],
  exports: [
    TopicService,
    TemplateSimulatorService,
    ChatSessionService,
    SecurityEventService,
    MongooseModule,
  ],
})
export class ConversationModule {}
