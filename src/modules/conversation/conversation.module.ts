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
import { PromptModule } from '../prompt/prompt.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    PromptModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationGateway],
  exports: [ConversationService],
})
export class ConversationModule {}
