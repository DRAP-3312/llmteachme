import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Topic DTO
 */
export class CreateTopicDto {
  @ApiProperty({
    example: 'Business English',
    description: 'Name of the topic',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Practice professional English for business scenarios',
    description: 'Brief description of the topic',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the topic is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Update Topic DTO
 */
export class UpdateTopicDto {
  @ApiPropertyOptional({
    example: 'Business English',
    description: 'Name of the topic',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Practice professional English for business scenarios',
    description: 'Brief description of the topic',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the topic is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Topic Response DTO
 */
export class TopicResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Business English' })
  name: string;

  @ApiProperty({
    example: 'Practice professional English for business scenarios',
  })
  description: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  createdBy: string;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T12:00:00.000Z' })
  updatedAt: Date;
}
