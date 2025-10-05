import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserStatsResponseDto } from './dto/user-stats-response.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the authenticated user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getProfile(
    @CurrentUser('userId') userId: string,
  ): Promise<UserResponseDto> {
    return this.userService.getUserProfile(userId);
  }

  @Get('profile/stats')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Retrieve statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: UserStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats(
    @CurrentUser('userId') userId: string,
  ): Promise<UserStatsResponseDto> {
    return this.userService.getUserStats(userId);
  }

  @Get('profile/full')
  @ApiOperation({
    summary: 'Get full user profile',
    description: 'Retrieve complete profile (user data + statistics)',
  })
  @ApiResponse({
    status: 200,
    description: 'Full user profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getFullProfile(
    @CurrentUser('userId') userId: string,
  ): Promise<UserProfileResponseDto> {
    return this.userService.getUserFullProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update the authenticated user profile (name, password, preferred topics)',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username already taken',
  })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.updateUserProfile(userId, updateUserDto);
  }

  @Delete('profile')
  @ApiOperation({
    summary: 'Delete user account',
    description:
      'Permanently delete the authenticated user account and all related data',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Cuenta eliminada exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid confirmation phrase',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Body() deleteAccountDto: DeleteAccountDto,
  ): Promise<{ message: string }> {
    return this.userService.deleteUserAccount(
      userId,
      deleteAccountDto.confirmation,
    );
  }
}
