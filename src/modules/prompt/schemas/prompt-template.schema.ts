import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptTemplateDocument = PromptTemplate & Document;

@Schema({ timestamps: true })
export class PromptTemplate {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['system', 'user', 'context'] })
  layer: string; // Layer 1 (system), 2 (user), 3 (context)

  @Prop({ required: true })
  template: string; // Template with placeholders like {{variable}}

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  priority: number;

  @Prop({ type: Object })
  metadata?: {
    category?: string;
    targetLevel?: string; // 'beginner', 'intermediate', 'advanced'
    language?: string;
  };
}

export const PromptTemplateSchema =
  SchemaFactory.createForClass(PromptTemplate);

// Indexes
PromptTemplateSchema.index({ name: 1 });
PromptTemplateSchema.index({ layer: 1, isActive: 1 });
PromptTemplateSchema.index({ tags: 1 });
