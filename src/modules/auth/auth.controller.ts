import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  Req,
  Ip,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email, password, and name',
  })
  @ApiResponse({
    status: 201,
    description:
      'User successfully registered. Returns access token and user data.',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user and receive JWT access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Returns access token, refresh token, and user data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or user account disabled',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, userAgent, ipAddress);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token',
  })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Token refreshed successfully. Returns new access token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshToken(refreshToken, userAgent, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: "Retrieve the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description: "Invalidate all user's refresh tokens",
  })
  @ApiResponse({ status: 201, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser('userId') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description:
      'Change user password. All active sessions will be invalidated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized or wrong password' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoke all sessions',
    description: 'Logout from all devices by invalidating all refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeAllSessions(@CurrentUser('userId') userId: string) {
    return this.authService.revokeAllSessions(userId);
  }
}
