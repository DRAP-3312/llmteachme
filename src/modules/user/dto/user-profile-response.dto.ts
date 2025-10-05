import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';
import { UserStatsResponseDto } from './user-stats-response.dto';

export class UserProfileResponseDto {
  @ApiProperty({
    description: 'User data',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'User statistics',
    type: UserStatsResponseDto,
  })
  stats: UserStatsResponseDto;
}
