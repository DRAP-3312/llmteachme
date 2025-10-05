import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Username (unique, used for login)',
    example: 'johndoe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'SecurePass123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Preferred topics (optional)',
    example: ['technology', 'business'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  preferredTopics?: string[];
}
