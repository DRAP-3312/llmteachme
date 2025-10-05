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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
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

    // TODO: Create UserStats for the user

    return {
      message: 'Usuario creado exitosamente',
    };
  }

  /**
   * Login user
   */
  async login(
    dto: LoginDto,
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
    const tokens = await this.generateTokens(user);

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
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.validateUser(payload.sub);

      // TODO: Verify stored refresh token in RefreshToken schema

      // Generate new access token
      const accessToken = this.jwtService.sign({
        sub: user._id,
        userId: (user._id as any).toString(),
        name: user.name,
        role: user.role,
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: UserDocument,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: (user._id as any).toString(),
      userId: (user._id as any).toString(),
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // TODO: Store refresh token in RefreshToken schema

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
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    // TODO: Delete refresh token from RefreshToken schema
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
}
