import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket JWT Guard
 *
 * Validates JWT tokens in WebSocket connections.
 * Extracts token from:
 * 1. Handshake auth header (preferred)
 * 2. Handshake query parameter
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('No token provided in WebSocket connection');
        throw new WsException('Unauthorized: No token provided');
      }

      // Verify JWT token
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      // Attach user data to client for later use
      (client as any).user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      this.logger.debug(
        `WebSocket authenticated: userId=${payload.userId}, socketId=${client.id}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `WebSocket authentication failed: ${error.message}`,
        error.stack,
      );

      if (error.name === 'TokenExpiredError') {
        throw new WsException('Unauthorized: Token expired');
      }

      if (error.name === 'JsonWebTokenError') {
        throw new WsException('Unauthorized: Invalid token');
      }

      throw new WsException('Unauthorized');
    }
  }

  /**
   * Extract JWT token from WebSocket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try to get token from Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    // Try to get token from query parameter (fallback)
    const tokenFromQuery = client.handshake?.query?.token;
    if (tokenFromQuery && typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    // Try to get token from auth object (Socket.IO client can send it this way)
    const tokenFromAuth = (client.handshake as any)?.auth?.token;
    if (tokenFromAuth && typeof tokenFromAuth === 'string') {
      return tokenFromAuth;
    }

    return null;
  }
}
