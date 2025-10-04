import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationGateway } from './conversation/conversation.gateway';

@Module({
  providers: [ConversationService, ConversationGateway]
})
export class ConversationModule {}
