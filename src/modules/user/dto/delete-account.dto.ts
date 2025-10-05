import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Confirmation phrase (must match exactly)',
    example: 'quiero borrar mi cuenta',
  })
  @IsString()
  @IsNotEmpty()
  confirmation: string;
}
