import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TemplateSimulatorDocument = TemplateSimulator & Document;

@Schema({ timestamps: true })
export class TemplateSimulator {
  @Prop({ required: true })
  title: string; // "Job Interview at Tech Company"

  @Prop({ required: true })
  description: string; // Specific instructions for the bot in this scenario

  @Prop({ type: Types.ObjectId, ref: 'Topic', required: true })
  topicId: Types.ObjectId; // Ref to Topic

  @Prop({
    type: String,
    enum: ['global', 'test', 'user'],
    required: true,
  })
  scope: string; // global = all, test = admin only, user = personal (future)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // Ref to User (admin or user in the future)

  @Prop({ default: true })
  isActive: boolean; // true = available, false = disabled
}

export const TemplateSimulatorSchema =
  SchemaFactory.createForClass(TemplateSimulator);

// Indexes
TemplateSimulatorSchema.index({ topicId: 1 });
TemplateSimulatorSchema.index({ scope: 1 });
TemplateSimulatorSchema.index({ isActive: 1 });
TemplateSimulatorSchema.index({ createdBy: 1 });
