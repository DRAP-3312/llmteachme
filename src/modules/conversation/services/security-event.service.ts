import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SecurityEvent,
  SecurityEventDocument,
} from '../schemas/security-event.schema';

export interface CreateSecurityEventDto {
  sessionId: string;
  userId: string;
  type:
    | 'prompt_injection_attempt'
    | 'rate_limit_exceeded'
    | 'suspicious_pattern';
  input: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(
    @InjectModel(SecurityEvent.name)
    private securityEventModel: Model<SecurityEventDocument>,
  ) {}

  /**
   * Log a security event
   */
  async logEvent(dto: CreateSecurityEventDto): Promise<SecurityEventDocument> {
    const event = new this.securityEventModel({
      sessionId: dto.sessionId,
      userId: dto.userId,
      type: dto.type,
      input: dto.input,
      reason: dto.reason,
      severity: dto.severity,
      timestamp: new Date(),
    });

    await event.save();

    this.logger.warn(
      `Security event [${dto.severity.toUpperCase()}]: ${dto.type} - ${dto.reason}`,
    );

    return event;
  }

  /**
   * Get security events with filters
   */
  async findAll(filters?: {
    userId?: string;
    sessionId?: string;
    type?: string;
    severity?: string;
    limit?: number;
  }): Promise<SecurityEventDocument[]> {
    const query: any = {};

    if (filters?.userId) {
      query.userId = filters.userId;
    }

    if (filters?.sessionId) {
      query.sessionId = filters.sessionId;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.severity) {
      query.severity = filters.severity;
    }

    const limit = filters?.limit || 100;

    return this.securityEventModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name')
      .exec();
  }

  /**
   * Get security events for a specific user
   */
  async findByUser(userId: string): Promise<SecurityEventDocument[]> {
    return this.securityEventModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();
  }

  /**
   * Get security events for a specific session
   */
  async findBySession(sessionId: string): Promise<SecurityEventDocument[]> {
    return this.securityEventModel
      .find({ sessionId })
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Count security events by severity
   */
  async countBySeverity(): Promise<{
    low: number;
    medium: number;
    high: number;
  }> {
    const result = await this.securityEventModel.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = { low: 0, medium: 0, high: 0 };

    result.forEach((item) => {
      if (item._id in counts) {
        counts[item._id as keyof typeof counts] = item.count;
      }
    });

    return counts;
  }

  /**
   * Get recent security events (last 7 days)
   */
  async getRecentEvents(days: number = 7): Promise<SecurityEventDocument[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.securityEventModel
      .find({ timestamp: { $gte: date } })
      .sort({ timestamp: -1 })
      .populate('userId', 'name')
      .exec();
  }
}
