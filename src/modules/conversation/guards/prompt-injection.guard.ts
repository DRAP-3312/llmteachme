import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ChatSessionService } from '../services/chat-session.service';

@Injectable()
export class PromptInjectionGuard implements CanActivate {
  private readonly logger = new Logger(PromptInjectionGuard.name);

  constructor(private readonly chatSessionService: ChatSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT
    const body = request.body;

    // Check if request contains user message
    if (!body || !body.message || !body.message.text) {
      return true; // No message to check
    }

    const userMessage: string = body.message.text;
    const sessionId = body.sessionId || body.message.sessionId;

    if (!sessionId) {
      return true; // Cannot check without session
    }

    // Check for prompt injection
    const check = await this.chatSessionService.checkPromptInjection(
      sessionId,
      user.userId,
      userMessage,
    );

    if (!check.isSafe) {
      this.logger.warn(
        `Prompt injection blocked for user ${user.userId}: ${check.reason}`,
      );
      throw new BadRequestException(
        'Your message contains suspicious patterns and cannot be processed.',
      );
    }

    return true;
  }
}
