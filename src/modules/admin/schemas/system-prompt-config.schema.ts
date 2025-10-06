import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemPromptConfigDocument = SystemPromptConfig & Document;

/**
 * Personality Configuration
 */
@Schema({ _id: false })
export class PersonalityConfig {
  @Prop({
    type: String,
    enum: ['professional', 'friendly', 'motivational', 'mixed'],
    required: true,
  })
  type: string;

  @Prop({ required: true })
  description: string; // Text describing the personality
}

export const PersonalityConfigSchema =
  SchemaFactory.createForClass(PersonalityConfig);

/**
 * Correction Style Configuration
 */
@Schema({ _id: false })
export class CorrectionStyleConfig {
  @Prop({
    type: String,
    enum: [
      'immediate',
      'major_only',
      'end_of_conversation',
      'subtle_reformulation',
    ],
    required: true,
  })
  type: string;

  @Prop({ required: true })
  instructions: string; // How to implement corrections
}

export const CorrectionStyleConfigSchema = SchemaFactory.createForClass(
  CorrectionStyleConfig,
);

/**
 * Response Length Configuration by Level
 */
@Schema({ _id: false })
export class ResponseLengthByLevel {
  @Prop({ required: true })
  sentenceCount: string; // e.g., "2-3 short sentences"

  @Prop({ required: true })
  instructions: string;
}

export const ResponseLengthByLevelSchema = SchemaFactory.createForClass(
  ResponseLengthByLevel,
);

/**
 * Response Length Configuration
 */
@Schema({ _id: false })
export class ResponseLengthConfig {
  @Prop({ type: ResponseLengthByLevelSchema, required: true })
  A1_A2: ResponseLengthByLevel;

  @Prop({ type: ResponseLengthByLevelSchema, required: true })
  B1_B2: ResponseLengthByLevel;

  @Prop({ type: ResponseLengthByLevelSchema, required: true })
  C1_C2: ResponseLengthByLevel;
}

export const ResponseLengthConfigSchema =
  SchemaFactory.createForClass(ResponseLengthConfig);

/**
 * Simulation Behavior Configuration
 */
@Schema({ _id: false })
export class SimulationBehaviorConfig {
  @Prop({ required: true, default: true })
  stayInRole: boolean;

  @Prop({ required: true, default: true })
  canProvideHelp: boolean;

  @Prop({ required: true })
  helpStyle: string; // e.g., "Subtle, within role"
}

export const SimulationBehaviorConfigSchema = SchemaFactory.createForClass(
  SimulationBehaviorConfig,
);

/**
 * Main System Prompt Configuration Schema
 *
 * Defines the modular structure for the system prompt.
 * Only ONE configuration can be active at a time.
 */
@Schema({ timestamps: true })
export class SystemPromptConfig {
  @Prop({ required: true, unique: true })
  version: string; // "1.0", "1.1", etc. - Auto-incremented

  @Prop({ required: true, default: 'Mr. Butter' })
  botName: string; // Name of the AI tutor

  @Prop({ type: PersonalityConfigSchema, required: true })
  personality: PersonalityConfig;

  @Prop({ type: CorrectionStyleConfigSchema, required: true })
  correctionStyle: CorrectionStyleConfig;

  @Prop({ type: ResponseLengthConfigSchema, required: true })
  responseLengthByLevel: ResponseLengthConfig;

  @Prop({ type: SimulationBehaviorConfigSchema, required: true })
  simulationBehavior: SimulationBehaviorConfig;

  @Prop({ required: true })
  securityRules: string; // Anti-prompt injection rules

  @Prop({ required: true })
  compiledPrompt: string; // Final compiled text sent to AI

  @Prop({ default: false })
  isActive: boolean; // Only ONE can be active at a time

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // Admin who created it

  @Prop()
  activatedAt?: Date; // When it was activated
}

export const SystemPromptConfigSchema =
  SchemaFactory.createForClass(SystemPromptConfig);

// Indexes
SystemPromptConfigSchema.index({ version: 1 }, { unique: true });
SystemPromptConfigSchema.index({ isActive: 1 });
SystemPromptConfigSchema.index({ createdAt: -1 });

// Ensure only one active prompt
SystemPromptConfigSchema.index(
  { isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  },
);
