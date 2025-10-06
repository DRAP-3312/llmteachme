import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  PromptTemplate,
  PromptTemplateSchema,
} from '../prompt/schemas/prompt-template.schema';
import {
  ChatSession,
  ChatSessionSchema,
} from '../conversation/schemas/chat-session.schema';
import { PromptModule } from '../prompt/prompt.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
    ]),
    PromptModule,
    ConversationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
