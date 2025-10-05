import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  name: string; // Username for login

  @Prop({ required: true })
  password: string; // Hashed

  @Prop({ type: String, enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ type: [String], default: [] })
  preferredTopics: string[]; // Topic IDs

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ name: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
