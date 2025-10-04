import { IsString, IsOptional, IsEnum } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsEnum(['text', 'audio'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}
