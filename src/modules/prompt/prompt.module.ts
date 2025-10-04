import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptService } from './prompt.service';
import { PromptTemplate, PromptTemplateSchema } from './schemas/prompt-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
    ]),
  ],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
