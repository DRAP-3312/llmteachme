import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (text or audio data)',
    example: 'Hello, I want to practice my English conversation skills'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Message type',
    enum: ['text', 'audio'],
    example: 'text',
    required: false,
    default: 'text'
  })
  @IsEnum(['text', 'audio'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Existing conversation ID (omit to create new conversation)',
    example: '507f1f77bcf86cd799439011',
    required: false
  })
  @IsString()
  @IsOptional()
  conversationId?: string;
}
