import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  UserStats,
  UserStatsDocument,
} from '../auth/schemas/user-stats.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserStatsResponseDto } from './dto/user-stats-response.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(UserStats.name)
    private userStatsModel: Model<UserStatsDocument>,
  ) {}

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponseDto(user);
  }

  /**
   * Get user stats by ID
   */
  async getUserStats(userId: string): Promise<UserStatsResponseDto> {
    const stats = await this.userStatsModel.findOne({ userId });

    if (!stats) {
      // Create default stats if not exists
      const newStats = new this.userStatsModel({
        userId,
        totalConversations: 0,
        conversationsByTopic: {},
        streak: 0,
        favoriteConversationsCount: 0,
      });
      await newStats.save();
      return this.toUserStatsResponseDto(newStats);
    }

    return this.toUserStatsResponseDto(stats);
  }

  /**
   * Get full user profile (user + stats)
   */
  async getUserFullProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.getUserProfile(userId);
    const stats = await this.getUserStats(userId);

    return {
      user,
      stats,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if name is being changed and if it's unique
    if (dto.name && dto.name !== user.name) {
      const existingUser = await this.userModel.findOne({ name: dto.name });
      if (existingUser) {
        throw new ConflictException('Username already taken');
      }
      user.name = dto.name;
    }

    // Hash password if being changed
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
      this.logger.log(`User ${userId} changed password`);
    }

    // Update preferred topics
    if (dto.preferredTopics !== undefined) {
      user.preferredTopics = dto.preferredTopics;
    }

    await user.save();

    this.logger.log(`User ${userId} profile updated`);

    return this.toUserResponseDto(user);
  }

  /**
   * Delete user account permanently
   */
  async deleteUserAccount(
    userId: string,
    confirmation: string,
  ): Promise<{ message: string }> {
    // Validate confirmation phrase
    if (confirmation !== 'quiero borrar mi cuenta') {
      throw new BadRequestException(
        'Invalid confirmation phrase. Must be exactly: "quiero borrar mi cuenta"',
      );
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user stats
    await this.userStatsModel.deleteOne({ userId });

    // TODO: Delete all user conversations and related data

    // Delete user
    await this.userModel.findByIdAndDelete(userId);

    this.logger.log(`User ${userId} account deleted`);

    return {
      message: 'Cuenta eliminada exitosamente',
    };
  }

  /**
   * Convert User document to DTO
   */
  private toUserResponseDto(user: UserDocument): UserResponseDto {
    const userObj = user.toObject();
    return {
      id: (user._id as any).toString(),
      name: user.name,
      role: user.role,
      preferredTopics: user.preferredTopics,
      isActive: user.isActive,
      createdAt: userObj.createdAt,
    };
  }

  /**
   * Convert UserStats document to DTO
   */
  private toUserStatsResponseDto(
    stats: UserStatsDocument,
  ): UserStatsResponseDto {
    return {
      totalConversations: stats.totalConversations,
      conversationsByTopic: stats.conversationsByTopic
        ? Object.fromEntries(stats.conversationsByTopic)
        : {},
      streak: stats.streak,
      lastActiveAt: stats.lastActiveAt || new Date(),
      favoriteConversationsCount: stats.favoriteConversationsCount,
    };
  }

  /**
   * Update user stats (called from Chat module)
   */
  async updateUserStats(
    userId: string,
    updates: {
      incrementConversations?: boolean;
      topic?: string;
      incrementFavorites?: boolean;
    },
  ): Promise<void> {
    let stats = await this.userStatsModel.findOne({ userId });

    if (!stats) {
      stats = new this.userStatsModel({
        userId,
        totalConversations: 0,
        conversationsByTopic: {},
        streak: 0,
        favoriteConversationsCount: 0,
      });
    }

    // Increment total conversations
    if (updates.incrementConversations) {
      stats.totalConversations += 1;
    }

    // Update conversations by topic
    if (updates.topic) {
      const topicCount = stats.conversationsByTopic.get(updates.topic) || 0;
      stats.conversationsByTopic.set(updates.topic, topicCount + 1);
    }

    // Increment favorites
    if (updates.incrementFavorites) {
      stats.favoriteConversationsCount += 1;
    }

    // Update streak
    const now = new Date();
    if (stats.lastActiveAt) {
      const lastActive = new Date(stats.lastActiveAt);
      const diffDays = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        // Consecutive day
        stats.streak += 1;
      } else if (diffDays > 1) {
        // Streak broken
        stats.streak = 1;
      }
      // If same day, don't change streak
    } else {
      stats.streak = 1;
    }

    stats.lastActiveAt = now;

    await stats.save();

    this.logger.log(`User ${userId} stats updated`);
  }
}
