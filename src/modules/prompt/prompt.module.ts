import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';

@Module({
  providers: [PromptService]
})
export class PromptModule {}
