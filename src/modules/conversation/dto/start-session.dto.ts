import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty({
    description: 'Template ID for the conversation',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'Enable transcriptions in frontend',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  transcriptionsEnabled?: boolean;
}
