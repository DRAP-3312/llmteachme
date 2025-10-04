import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(['user', 'assistant'])
  role: string;

  @IsString()
  content: string;

  @IsEnum(['text', 'audio'])
  @IsOptional()
  type?: string;

  @IsUrl()
  @IsOptional()
  audioUrl?: string;
}
