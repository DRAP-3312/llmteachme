import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ enum: ['text', 'audio'] })
  type: string; // 'text' or 'audio'

  @Prop()
  audioUrl?: string;

  @Prop({ type: Object })
  analysis?: {
    grammarErrors?: Array<{
      error: string;
      suggestion: string;
      position: number;
    }>;
    vocabularyLevel?: string;
    suggestions?: string[];
    score?: number;
  };

  @Prop({ type: Object })
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ role: 1 });
