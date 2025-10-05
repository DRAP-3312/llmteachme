import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityLogDocument = SecurityLog & Document;

@Schema({ timestamps: true })
export class SecurityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  action: string; // "suspicious_activity", "all_tokens_revoked", etc.

  @Prop({ required: true })
  description: string; // Details of the incident

  @Prop({
    type: {
      originalIP: String,
      originalUserAgent: String,
      suspiciousIP: String,
      suspiciousUserAgent: String,
    },
    default: {},
  })
  metadata: {
    originalIP?: string;
    originalUserAgent?: string;
    suspiciousIP?: string;
    suspiciousUserAgent?: string;
  };
}

export const SecurityLogSchema = SchemaFactory.createForClass(SecurityLog);

// Indexes
SecurityLogSchema.index({ userId: 1 });
SecurityLogSchema.index({ action: 1 });
SecurityLogSchema.index({ createdAt: -1 });
