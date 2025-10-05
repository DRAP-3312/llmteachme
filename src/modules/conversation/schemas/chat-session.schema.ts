import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

// Embedded Message schema
@Schema({ _id: false })
export class Message {
  @Prop({ type: String, enum: ['user', 'model'], required: true })
  role: string;

  @Prop({ required: true })
  text: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: false })
  isContextMessage: boolean; // True for context messages (not shown in UI)
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Session Feedback embedded schema
@Schema({ _id: false })
export class SessionFeedback {
  @Prop({ required: true, min: 1, max: 5 })
  rating: number; // 1-5 stars

  @Prop({ required: true })
  wasHelpful: boolean; // 👍👎

  @Prop({
    type: String,
    enum: ['too_easy', 'just_right', 'too_hard'],
    required: true,
  })
  difficultyLevel: string;

  @Prop()
  comments?: string;
}

export const SessionFeedbackSchema =
  SchemaFactory.createForClass(SessionFeedback);

// Session Metrics embedded schema
@Schema({ _id: false })
export class SessionMetrics {
  @Prop()
  duration?: number; // In seconds

  @Prop({ default: 0 })
  messageCount: number;

  @Prop({ default: false })
  completedNaturally: boolean; // User ended vs timeout/error
}

export const SessionMetricsSchema =
  SchemaFactory.createForClass(SessionMetrics);

// Main ChatSession schema
@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TemplateSimulator', required: true })
  templateId: Types.ObjectId;

  @Prop({ default: true })
  transcriptionsEnabled: boolean; // Show transcriptions in frontend

  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  summary?: string; // AI-generated summary at the end

  @Prop({ default: Date.now })
  startedAt: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: SessionFeedbackSchema })
  feedback?: SessionFeedback;

  @Prop({ type: SessionMetricsSchema, default: {} })
  metrics: SessionMetrics;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);

// Indexes
ChatSessionSchema.index({ userId: 1 });
ChatSessionSchema.index({ templateId: 1 });
ChatSessionSchema.index({ isActive: 1 });
ChatSessionSchema.index({ userId: 1, isActive: 1 });
ChatSessionSchema.index({ createdAt: -1 });
