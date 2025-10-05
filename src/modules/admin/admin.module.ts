import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  PromptTemplate,
  PromptTemplateSchema,
} from '../prompt/schemas/prompt-template.schema';
import {
  Conversation,
  ConversationSchema,
} from '../conversation/schemas/conversation.schema';
import { Message, MessageSchema } from '../conversation/schemas/message.schema';
import { PromptModule } from '../prompt/prompt.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    PromptModule,
    ConversationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
