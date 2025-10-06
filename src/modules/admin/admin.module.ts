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
import {
  SystemPromptConfig,
  SystemPromptConfigSchema,
} from './schemas/system-prompt-config.schema';
import { PromptModule } from '../prompt/prompt.module';
import { ConversationModule } from '../conversation/conversation.module';
import { SystemPromptCompilerService } from './services/system-prompt-compiler.service';
import { SystemPromptCacheService } from './services/system-prompt-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: SystemPromptConfig.name, schema: SystemPromptConfigSchema },
    ]),
    PromptModule,
    ConversationModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    SystemPromptCompilerService,
    SystemPromptCacheService,
  ],
  exports: [SystemPromptCacheService],
})
export class AdminModule {}
