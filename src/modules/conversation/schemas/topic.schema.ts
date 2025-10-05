import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TopicDocument = Topic & Document;

@Schema({ timestamps: true })
export class Topic {
  @Prop({ required: true, unique: true })
  name: string; // "Career", "Travel", "Technology", etc.

  @Prop({ required: true })
  description: string; // Brief description of the topic

  @Prop({ default: true })
  isActive: boolean; // true = available, false = disabled

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // Ref to User (admin)
}

export const TopicSchema = SchemaFactory.createForClass(Topic);

// Indexes
TopicSchema.index({ name: 1 }, { unique: true });
TopicSchema.index({ isActive: 1 });
