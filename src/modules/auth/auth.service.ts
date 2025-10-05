import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserStats, UserStatsDocument } from './schemas/user-stats.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import {
  SecurityLog,
  SecurityLogDocument,
} from './schemas/security-log.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(UserStats.name)
    private userStatsModel: Model<UserStatsDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(SecurityLog.name)
    private securityLogModel: Model<SecurityLogDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Check if user exists
    const existingUser = await this.userModel.findOne({ name: dto.name });
    if (existingUser) {
      throw new ConflictException('User with this name already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = new this.userModel({
      name: dto.name,
      password: hashedPassword,
      preferredTopics: dto.preferredTopics || [],
      role: 'user',
      isActive: true,
    });

    await user.save();

    this.logger.log(`User registered: ${user.name}`);

    // Create UserStats for the user
    const userStats = new this.userStatsModel({
      userId: user._id,
      totalConversations: 0,
      conversationsByTopic: new Map(),
      streak: 0,
      favoriteConversationsCount: 0,
    });

    await userStats.save();

    this.logger.log(`UserStats created for user: ${user.name}`);

    return {
      message: 'Usuario creado exitosamente',
    };
  }

  /**
   * Login user
   */
  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // Find user
    const user = await this.userModel.findOne({ name: dto.name });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    this.logger.log(`User logged in: ${user.name}`);

    // Generate tokens
    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.validateUser(payload.sub);

      // Find all refresh tokens for this user
      const storedTokens = await this.refreshTokenModel.find({
        userId: user._id,
      });

      if (!storedTokens || storedTokens.length === 0) {
        throw new UnauthorizedException('No refresh token found');
      }

      // Try to find a matching token
      let validToken: RefreshTokenDocument | null = null;
      for (const token of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, token.token);
        if (isMatch) {
          validToken = token;
          break;
        }
      }

      if (!validToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check expiration
      if (new Date() > validToken.expiresAt) {
        await this.refreshTokenModel.deleteOne({ _id: validToken._id });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Security validation: Check userAgent and ipAddress (if available)
      const hasStoredInfo = validToken.userAgent && validToken.ipAddress;
      const hasCurrentInfo = userAgent && ipAddress;

      if (hasStoredInfo && hasCurrentInfo) {
        const userAgentMatch = validToken.userAgent === userAgent;
        const ipMatch = validToken.ipAddress === ipAddress;

        if (!userAgentMatch || !ipMatch) {
          // Suspicious activity detected!
          this.logger.warn(
            `Suspicious refresh token use detected for user ${user.name}`,
          );

          // Revoke ALL refresh tokens for this user
          await this.refreshTokenModel.deleteMany({ userId: user._id });

          // Log security event
          await this.securityLogModel.create({
            userId: user._id,
            action: 'suspicious_activity',
            description: 'Refresh token used from different device/location',
            metadata: {
              originalIP: validToken.ipAddress,
              originalUserAgent: validToken.userAgent,
              suspiciousIP: ipAddress,
              suspiciousUserAgent: userAgent,
            },
          });

          throw new UnauthorizedException(
            'Suspicious activity detected. All sessions have been revoked. Please login again.',
          );
        }
      }

      // Generate new access token
      const accessToken = this.jwtService.sign({
        sub: user._id,
        userId: (user._id as any).toString(),
        name: user.name,
        role: user.role,
      });

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: UserDocument,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: (user._id as any).toString(),
      userId: (user._id as any).toString(),
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Hash and store refresh token
    const hashedToken = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshTokenDoc = new this.refreshTokenModel({
      token: hashedToken,
      userId: user._id,
      expiresAt,
      userAgent,
      ipAddress,
    });

    await refreshTokenDoc.save();

    this.logger.log(`Refresh token created for user: ${user.name}`);

    return { accessToken, refreshToken };
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: UserDocument): any {
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  /**
   * Logout user (invalidate all refresh tokens)
   */
  async logout(userId: string): Promise<void> {
    // Delete all refresh tokens for this user
    await this.refreshTokenModel.deleteMany({ userId });
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Invalidate all refresh tokens (force re-login everywhere)
    await this.refreshTokenModel.deleteMany({ userId: user._id });

    // Log security event
    await this.securityLogModel.create({
      userId: user._id,
      action: 'password_changed',
      description: 'User changed their password',
      metadata: {},
    });

    this.logger.log(`User ${user.name} changed password`);

    return {
      message:
        'Password changed successfully. Please login again on all devices.',
    };
  }

  /**
   * Revoke all sessions (delete all refresh tokens)
   */
  async revokeAllSessions(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Delete all refresh tokens
    const result = await this.refreshTokenModel.deleteMany({
      userId: user._id,
    });

    // Log security event
    await this.securityLogModel.create({
      userId: user._id,
      action: 'all_tokens_revoked',
      description: 'User revoked all sessions',
      metadata: {
        tokensRevoked: result.deletedCount,
      },
    });

    this.logger.log(
      `User ${user.name} revoked all sessions (${result.deletedCount} tokens deleted)`,
    );

    return {
      message: `All sessions revoked successfully. ${result.deletedCount} device(s) logged out.`,
    };
  }
}
