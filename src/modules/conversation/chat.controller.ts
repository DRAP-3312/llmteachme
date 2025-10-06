import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatSessionService } from './services/chat-session.service';
import { TemplateSimulatorService } from './services/template-simulator.service';
import { StartSessionDto } from './dto/start-session.dto';
import { AddFeedbackDto } from './dto/add-feedback.dto';

@ApiTags('chat')
@ApiBearerAuth('JWT-auth')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly templateService: TemplateSimulatorService,
  ) {}

  // ==================== Templates ====================

  @Get('templates')
  @ApiOperation({
    summary: 'Get available templates',
    description: 'Get all templates available for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getTemplates(@CurrentUser('userId') userId: string) {
    return this.templateService.findAvailableForUser(userId);
  }

  @Get('templates/:id')
  @ApiOperation({
    summary: 'Get template details',
    description: 'Get details of a specific template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async getTemplate(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  // ==================== Sessions ====================

  @Post('sessions/start')
  @ApiOperation({
    summary: 'Start new chat session',
    description: 'Start a new conversation session with a selected template',
  })
  @ApiResponse({
    status: 201,
    description: 'Session started successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Template not active or user has active session',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async startSession(
    @CurrentUser('userId') userId: string,
    @Body() dto: StartSessionDto,
  ) {
    return this.chatSessionService.startSession({
      userId,
      templateId: dto.templateId,
      transcriptionsEnabled: dto.transcriptionsEnabled,
    });
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get user sessions',
    description: 'Get all chat sessions for the authenticated user',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  async getSessions(
    @CurrentUser('userId') userId: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.chatSessionService.findByUser(userId, isActiveBool);
  }

  @Get('sessions/active')
  @ApiOperation({
    summary: 'Get active session',
    description: 'Get the current active session for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Active session retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'No active session found',
  })
  async getActiveSession(@CurrentUser('userId') userId: string) {
    return this.chatSessionService.getActiveSession(userId);
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Get session details',
    description: 'Get details of a specific chat session',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSession(@Param('id') id: string) {
    return this.chatSessionService.findById(id);
  }

  @Post('sessions/:id/end')
  @ApiOperation({
    summary: 'End chat session',
    description: 'End an active chat session',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Session ended successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Session already ended',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async endSession(@Param('id') id: string) {
    return this.chatSessionService.endSession({
      sessionId: id,
    });
  }

  @Post('sessions/:id/feedback')
  @ApiOperation({
    summary: 'Add session feedback',
    description: 'Add feedback to a completed session',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot add feedback to active session',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async addFeedback(@Param('id') id: string, @Body() dto: AddFeedbackDto) {
    return this.chatSessionService.addFeedback(id, dto);
  }
}
