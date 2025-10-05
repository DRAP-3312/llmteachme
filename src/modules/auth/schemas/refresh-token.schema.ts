import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true })
  token: string; // Hashed

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date; // 7 days from creation

  @Prop()
  userAgent?: string; // Browser/device that created the token

  @Prop()
  ipAddress?: string; // IP where it was created
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Indexes
RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
