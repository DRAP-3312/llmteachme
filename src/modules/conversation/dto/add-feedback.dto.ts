import {
  IsNumber,
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFeedbackDto {
  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiProperty({
    description: 'Was the session helpful?',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  wasHelpful: boolean;

  @ApiProperty({
    description: 'Difficulty level perception',
    example: 'just_right',
    enum: ['too_easy', 'just_right', 'too_hard'],
  })
  @IsString()
  @IsIn(['too_easy', 'just_right', 'too_hard'])
  @IsNotEmpty()
  difficultyLevel: 'too_easy' | 'just_right' | 'too_hard';

  @ApiProperty({
    description: 'Optional comments',
    example: 'Great conversation! Very helpful.',
    required: false,
  })
  @IsString()
  @IsOptional()
  comments?: string;
}
