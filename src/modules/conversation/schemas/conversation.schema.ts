import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: 'general' })
  conversationType: string; // 'general', 'simulation', 'practice'

  @Prop({ type: Object })
  metadata: {
    level?: string; // 'beginner', 'intermediate', 'advanced'
    topic?: string;
    simulationType?: string;
    userGoals?: string[];
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  endedAt?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  messages: Types.ObjectId[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ userId: 1, isActive: 1 });
ConversationSchema.index({ createdAt: -1 });
