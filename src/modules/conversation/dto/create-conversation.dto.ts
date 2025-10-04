import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  userId: string;

  @IsString()
  @IsIn(['general', 'simulation', 'practice'])
  @IsOptional()
  conversationType?: string;

  @IsOptional()
  metadata?: {
    level?: string;
    topic?: string;
    simulationType?: string;
    userGoals?: string[];
  };
}
