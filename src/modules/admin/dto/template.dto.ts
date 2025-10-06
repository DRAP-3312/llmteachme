import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Template Simulator DTO
 */
export class CreateTemplateDto {
  @ApiProperty({
    example: 'Job Interview at Tech Company',
    description: 'Title of the template',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'You are a hiring manager conducting a technical interview...',
    description: 'Specific instructions for the bot in this scenario',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Topic ID this template belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  topicId: string;

  @ApiProperty({
    enum: ['global', 'test', 'user'],
    example: 'global',
    description:
      'Scope: global = all users, test = admin only, user = personal',
  })
  @IsEnum(['global', 'test', 'user'])
  @IsNotEmpty()
  scope: 'global' | 'test' | 'user';

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the template is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Update Template Simulator DTO
 */
export class UpdateTemplateDto {
  @ApiPropertyOptional({
    example: 'Job Interview at Tech Company',
    description: 'Title of the template',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'You are a hiring manager conducting a technical interview...',
    description: 'Specific instructions for the bot in this scenario',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Topic ID this template belongs to',
  })
  @IsMongoId()
  @IsOptional()
  topicId?: string;

  @ApiPropertyOptional({
    enum: ['global', 'test', 'user'],
    example: 'global',
    description:
      'Scope: global = all users, test = admin only, user = personal',
  })
  @IsEnum(['global', 'test', 'user'])
  @IsOptional()
  scope?: 'global' | 'test' | 'user';

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the template is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Template Simulator Response DTO
 */
export class TemplateResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Job Interview at Tech Company' })
  title: string;

  @ApiProperty({
    example: 'You are a hiring manager conducting a technical interview...',
  })
  description: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  topicId: string;

  @ApiProperty({ example: 'global', enum: ['global', 'test', 'user'] })
  scope: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  createdBy: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T12:00:00.000Z' })
  updatedAt: Date;
}
