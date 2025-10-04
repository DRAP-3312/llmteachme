import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress;

    const ttl = this.configService.get<number>('RATE_LIMIT_TTL', 60) * 1000; // Convert to ms
    const maxRequests = this.configService.get<number>('RATE_LIMIT_MAX', 10);

    const now = Date.now();
    const clientData = this.requestCounts.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize
      this.requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + ttl,
      });
      return true;
    }

    if (clientData.count >= maxRequests) {
      throw new HttpException(
        'Rate limit exceeded. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    clientData.count++;
    return true;
  }
}
