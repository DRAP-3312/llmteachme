import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromptTemplateDto {
  @ApiProperty({
    description: 'Unique template name',
    example: 'system_core',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Core system instructions for the AI tutor',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Prompt layer in the 3-layer system',
    enum: ['system', 'user', 'context'],
    example: 'system',
  })
  @IsEnum(['system', 'user', 'context'])
  layer: string;

  @ApiProperty({
    description: 'Prompt template content with {{variable}} placeholders',
    example: 'You are an AI English tutor. Student level: {{level}}',
  })
  @IsString()
  template: string;

  @ApiProperty({
    description: 'List of variable names used in template',
    example: ['level', 'topic'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @ApiProperty({
    description: 'Tags for categorization',
    example: ['grammar', 'beginner'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Whether template is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Template priority (higher = more important)',
    example: 10,
    required: false,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
    example: {
      category: 'conversation',
      targetLevel: 'intermediate',
      language: 'en',
    },
  })
  @IsOptional()
  metadata?: {
    category?: string;
    targetLevel?: string;
    language?: string;
  };
}
