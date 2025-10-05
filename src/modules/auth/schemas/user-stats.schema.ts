import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserStatsDocument = UserStats & Document;

@Schema({ timestamps: true })
export class UserStats {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  totalConversations: number;

  @Prop({ type: Map, of: Number, default: {} })
  conversationsByTopic: Map<string, number>; // { "business": 5, "travel": 3 }

  @Prop({ default: 0 })
  streak: number; // Consecutive days using the app

  @Prop()
  lastActiveAt?: Date; // To calculate if streak was broken

  @Prop({ default: 0 })
  favoriteConversationsCount: number; // Chats marked as favorite
}

export const UserStatsSchema = SchemaFactory.createForClass(UserStats);

// Indexes
UserStatsSchema.index({ userId: 1 }, { unique: true });
