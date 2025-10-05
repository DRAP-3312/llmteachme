import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  refreshToken?: string; // Hashed refresh token
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
