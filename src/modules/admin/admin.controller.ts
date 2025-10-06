import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreatePromptTemplateDto } from '../prompt/dto/create-prompt-template.dto';
import {
  CreateSystemPromptDto,
  UpdateSystemPromptDto,
  SystemPromptResponseDto,
  PreviewPromptDto,
} from './dto/system-prompt.dto';
import {
  CreateTopicDto,
  UpdateTopicDto,
  TopicResponseDto,
} from './dto/topic.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateResponseDto,
} from './dto/template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== Prompt Templates ====================

  @Get('prompts')
  @ApiOperation({
    summary: 'Get all prompt templates',
    description:
      'Retrieve all prompt templates, optionally filtered by layer (system, user, context)',
  })
  @ApiQuery({
    name: 'layer',
    required: false,
    enum: ['system', 'user', 'context'],
    description: 'Filter by prompt layer',
  })
  @ApiResponse({
    status: 200,
    description: 'List of prompt templates retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an admin' })
  async getAllPrompts(@Query('layer') layer?: string) {
    if (layer) {
      return this.adminService.getTemplatesByLayer(layer as any);
    }
    return this.adminService.getAllTemplates();
  }

  @Get('prompts/:name')
  @ApiOperation({
    summary: 'Get prompt template by name',
    description: 'Retrieve a specific prompt template by its unique name',
  })
  @ApiParam({
    name: 'name',
    description: 'Template name',
    example: 'system_core',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt template retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getPrompt(@Param('name') name: string) {
    return this.adminService.getTemplateByName(name);
  }

  @Post('prompts')
  @ApiOperation({
    summary: 'Create prompt template',
    description: 'Create a new prompt template for the 3-layer prompt system',
  })
  @ApiResponse({
    status: 201,
    description: 'Prompt template created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async createPrompt(@Body() dto: CreatePromptTemplateDto) {
    return this.adminService.createTemplate(dto);
  }

  @Put('prompts/:name')
  @ApiOperation({
    summary: 'Update prompt template',
    description: 'Update an existing prompt template by name',
  })
  @ApiParam({
    name: 'name',
    description: 'Template name to update',
    example: 'system_core',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt template updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async updatePrompt(
    @Param('name') name: string,
    @Body() updates: Partial<CreatePromptTemplateDto>,
  ) {
    return this.adminService.updateTemplate(name, updates);
  }

  @Delete('prompts/:name')
  @ApiOperation({
    summary: 'Delete prompt template',
    description: 'Delete a prompt template by name',
  })
  @ApiParam({
    name: 'name',
    description: 'Template name to delete',
    example: 'user_custom',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt template deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async deletePrompt(@Param('name') name: string) {
    return this.adminService.deleteTemplate(name);
  }

  @Put('prompts/:name/toggle')
  @ApiOperation({
    summary: 'Toggle template status',
    description: 'Toggle the active/inactive status of a prompt template',
  })
  @ApiParam({
    name: 'name',
    description: 'Template name to toggle',
    example: 'system_core',
  })
  @ApiResponse({
    status: 200,
    description: 'Template status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async togglePrompt(@Param('name') name: string) {
    return this.adminService.toggleTemplateStatus(name);
  }

  // ==================== Statistics ====================

  @Get('stats/conversations')
  @ApiOperation({
    summary: 'Get conversation statistics',
    description:
      'Get statistics about conversations (total, active, ended, by type)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter from date (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter to date (ISO 8601 format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation statistics retrieved successfully',
  })
  async getConversationStats(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getConversationStats({
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats/messages')
  @ApiOperation({
    summary: 'Get message statistics',
    description:
      'Get statistics about messages (total, by role, by type, average length)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter from date (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter to date (ISO 8601 format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Message statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getMessageStats(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getMessageStats({
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats/users')
  @ApiOperation({
    summary: 'Get user statistics',
    description:
      'Get user activity summary including total users, active users, and top users by conversation count',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('health')
  @ApiOperation({
    summary: 'System health check',
    description:
      'Get system health status including MongoDB and Gemini API status',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status retrieved successfully',
  })
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  // ==================== Chat Sessions Management ====================

  @Get('sessions')
  @ApiOperation({
    summary: 'Get all chat sessions',
    description:
      'Retrieve all chat sessions with optional filtering and pagination',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status (true/false)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description:
      'Chat sessions retrieved successfully with pagination metadata',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getAllChatSessions(
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getChatSessions({
      userId,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Get chat session details',
    description:
      'Retrieve detailed information about a specific chat session including all messages',
  })
  @ApiParam({ name: 'id', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat session details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getChatSession(@Param('id') id: string) {
    return this.adminService.getChatSessionDetails(id);
  }

  @Delete('sessions/:id')
  @ApiOperation({
    summary: 'Delete chat session',
    description: 'Permanently delete a chat session and all its messages',
  })
  @ApiParam({ name: 'id', description: 'Chat session ID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Chat session deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async deleteChatSession(@Param('id') id: string) {
    return this.adminService.deleteChatSession(id);
  }

  // ==================== System Prompt Management ====================

  @Get('system-prompt/active')
  @ApiOperation({
    summary: 'Get active system prompt',
    description: 'Retrieve the currently active system prompt configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Active system prompt retrieved successfully',
    type: SystemPromptResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active system prompt found',
  })
  async getActiveSystemPrompt() {
    return this.adminService.getActiveSystemPrompt();
  }

  @Get('system-prompt/versions')
  @ApiOperation({
    summary: 'Get all system prompt versions',
    description: 'Retrieve all system prompt configurations (history)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'System prompt versions retrieved successfully',
    type: [SystemPromptResponseDto],
  })
  async getSystemPromptVersions(@Query('isActive') isActive?: string) {
    const filters =
      isActive !== undefined ? { isActive: isActive === 'true' } : undefined;
    return this.adminService.getSystemPromptVersions(filters);
  }

  @Post('system-prompt')
  @ApiOperation({
    summary: 'Create new system prompt version',
    description:
      'Create a new system prompt configuration (inactive by default)',
  })
  @ApiResponse({
    status: 201,
    description: 'System prompt created successfully',
    type: SystemPromptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  async createSystemPrompt(
    @Body() dto: CreateSystemPromptDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.adminService.createSystemPrompt(dto, adminId);
  }

  @Patch('system-prompt/:id')
  @ApiOperation({
    summary: 'Update system prompt',
    description: 'Update a system prompt configuration (only if not active)',
  })
  @ApiParam({ name: 'id', description: 'System prompt ID' })
  @ApiResponse({
    status: 200,
    description: 'System prompt updated successfully',
    type: SystemPromptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot edit active prompt',
  })
  @ApiResponse({
    status: 404,
    description: 'System prompt not found',
  })
  async updateSystemPrompt(
    @Param('id') id: string,
    @Body() dto: UpdateSystemPromptDto,
  ) {
    return this.adminService.updateSystemPrompt(id, dto);
  }

  @Post('system-prompt/:id/activate')
  @ApiOperation({
    summary: 'Activate system prompt',
    description:
      'Activate a system prompt version (deactivates current active prompt)',
  })
  @ApiParam({ name: 'id', description: 'System prompt ID to activate' })
  @ApiResponse({
    status: 200,
    description: 'System prompt activated successfully',
    type: SystemPromptResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'System prompt not found',
  })
  @ApiResponse({
    status: 409,
    description: 'System prompt already active',
  })
  async activateSystemPrompt(@Param('id') id: string) {
    return this.adminService.activateSystemPrompt(id);
  }

  @Post('system-prompt/preview')
  @ApiOperation({
    summary: 'Preview system prompt',
    description: 'Generate a preview of the compiled prompt without saving',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview generated successfully',
    schema: {
      properties: {
        compiledPrompt: {
          type: 'string',
          example: 'You are Mr. Butter, a friendly English teacher...',
        },
      },
    },
  })
  previewSystemPrompt(@Body() dto: PreviewPromptDto) {
    return this.adminService.previewSystemPrompt(dto);
  }

  @Delete('system-prompt/:id')
  @ApiOperation({
    summary: 'Delete system prompt',
    description: 'Delete a system prompt version (only if not active)',
  })
  @ApiParam({ name: 'id', description: 'System prompt ID to delete' })
  @ApiResponse({
    status: 200,
    description: 'System prompt deleted successfully',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'System prompt version 1.2 deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete active prompt',
  })
  @ApiResponse({
    status: 404,
    description: 'System prompt not found',
  })
  async deleteSystemPrompt(@Param('id') id: string) {
    return this.adminService.deleteSystemPrompt(id);
  }

  // ==================== Topics Management ====================

  @Get('topics')
  @ApiOperation({
    summary: 'Get all topics',
    description: 'Retrieve all conversation topics',
  })
  @ApiResponse({
    status: 200,
    description: 'Topics retrieved successfully',
    type: [TopicResponseDto],
  })
  async getAllTopics() {
    return this.adminService.getAllTopics();
  }

  @Get('topics/:id')
  @ApiOperation({
    summary: 'Get topic by ID',
    description: 'Retrieve a specific topic',
  })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({
    status: 200,
    description: 'Topic retrieved successfully',
    type: TopicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  async getTopicById(@Param('id') id: string) {
    return this.adminService.getTopicById(id);
  }

  @Post('topics')
  @ApiOperation({
    summary: 'Create topic',
    description: 'Create a new conversation topic',
  })
  @ApiResponse({
    status: 201,
    description: 'Topic created successfully',
    type: TopicResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Topic name already exists' })
  async createTopic(
    @Body() dto: CreateTopicDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.adminService.createTopic(dto, adminId);
  }

  @Patch('topics/:id')
  @ApiOperation({
    summary: 'Update topic',
    description: 'Update an existing topic',
  })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({
    status: 200,
    description: 'Topic updated successfully',
    type: TopicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  @ApiResponse({ status: 409, description: 'Topic name already exists' })
  async updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.adminService.updateTopic(id, dto);
  }

  @Delete('topics/:id')
  @ApiOperation({
    summary: 'Delete topic',
    description: 'Delete a topic (fails if templates are using it)',
  })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({
    status: 200,
    description: 'Topic deleted successfully',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: "Topic 'Business English' deleted successfully",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - templates are using this topic',
  })
  async deleteTopic(@Param('id') id: string) {
    return this.adminService.deleteTopic(id);
  }

  // ==================== Templates Management ====================

  @Get('templates')
  @ApiOperation({
    summary: 'Get all templates',
    description: 'Retrieve all template simulators',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: [TemplateResponseDto],
  })
  async getAllTemplates() {
    return this.adminService.getAllTemplateSimulators();
  }

  @Get('templates/:id')
  @ApiOperation({
    summary: 'Get template by ID',
    description: 'Retrieve a specific template simulator',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateById(@Param('id') id: string) {
    return this.adminService.getTemplateSimulatorById(id);
  }

  @Post('templates')
  @ApiOperation({
    summary: 'Create template',
    description: 'Create a new template simulator',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.adminService.createTemplateSimulator(dto, adminId);
  }

  @Patch('templates/:id')
  @ApiOperation({
    summary: 'Update template',
    description: 'Update an existing template simulator',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template or topic not found' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.adminService.updateTemplateSimulator(id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({
    summary: 'Delete template',
    description: 'Delete a template (fails if active sessions are using it)',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template deleted successfully',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: "Template 'Job Interview' deleted successfully",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - active sessions are using this template',
  })
  async deleteTemplate(@Param('id') id: string) {
    return this.adminService.deleteTemplateSimulator(id);
  }
}
