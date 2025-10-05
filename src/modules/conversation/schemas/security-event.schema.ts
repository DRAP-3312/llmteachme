import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityEventDocument = SecurityEvent & Document;

@Schema({ timestamps: true })
export class SecurityEvent {
  @Prop({ type: Types.ObjectId, ref: 'ChatSession', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'prompt_injection_attempt',
      'rate_limit_exceeded',
      'suspicious_pattern',
    ],
    required: true,
  })
  type: string;

  @Prop({ required: true })
  input: string; // The suspicious input

  @Prop({ required: true })
  reason: string; // Why it was flagged

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
  })
  severity: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);

// Indexes
SecurityEventSchema.index({ sessionId: 1 });
SecurityEventSchema.index({ userId: 1 });
SecurityEventSchema.index({ type: 1 });
SecurityEventSchema.index({ severity: 1 });
SecurityEventSchema.index({ timestamp: -1 });
