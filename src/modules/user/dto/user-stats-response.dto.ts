import { ApiProperty } from '@nestjs/swagger';

export class UserStatsResponseDto {
  @ApiProperty({
    description: 'Total number of conversations',
    example: 42,
  })
  totalConversations: number;

  @ApiProperty({
    description: 'Conversations grouped by topic',
    example: { business: 15, travel: 10, technology: 17 },
  })
  conversationsByTopic: { [topic: string]: number };

  @ApiProperty({
    description: 'Current streak (consecutive days)',
    example: 7,
  })
  streak: number;

  @ApiProperty({
    description: 'Last activity date',
    example: '2025-01-15T10:30:00.000Z',
  })
  lastActiveAt: Date;

  @ApiProperty({
    description: 'Number of favorite conversations',
    example: 5,
  })
  favoriteConversationsCount: number;
}
