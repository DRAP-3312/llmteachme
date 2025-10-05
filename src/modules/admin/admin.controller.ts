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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreatePromptTemplateDto } from '../prompt/dto/create-prompt-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== Prompt Templates ====================

  @Get('prompts')
  @ApiOperation({ summary: 'Get all prompt templates', description: 'Retrieve all prompt templates, optionally filtered by layer (system, user, context)' })
  @ApiQuery({ name: 'layer', required: false, enum: ['system', 'user', 'context'], description: 'Filter by prompt layer' })
  @ApiResponse({ status: 200, description: 'List of prompt templates retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an admin' })
  async getAllPrompts(@Query('layer') layer?: string) {
    if (layer) {
      return this.adminService.getTemplatesByLayer(layer as any);
    }
    return this.adminService.getAllTemplates();
  }

  @Get('prompts/:name')
  @ApiOperation({ summary: 'Get prompt template by name', description: 'Retrieve a specific prompt template by its unique name' })
  @ApiParam({ name: 'name', description: 'Template name', example: 'system_core' })
  @ApiResponse({ status: 200, description: 'Prompt template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getPrompt(@Param('name') name: string) {
    return this.adminService.getTemplateByName(name);
  }

  @Post('prompts')
  @ApiOperation({ summary: 'Create prompt template', description: 'Create a new prompt template for the 3-layer prompt system' })
  @ApiResponse({ status: 201, description: 'Prompt template created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async createPrompt(@Body() dto: CreatePromptTemplateDto) {
    return this.adminService.createTemplate(dto);
  }

  @Put('prompts/:name')
  @ApiOperation({ summary: 'Update prompt template', description: 'Update an existing prompt template by name' })
  @ApiParam({ name: 'name', description: 'Template name to update', example: 'system_core' })
  @ApiResponse({ status: 200, description: 'Prompt template updated successfully' })
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
  @ApiOperation({ summary: 'Delete prompt template', description: 'Delete a prompt template by name' })
  @ApiParam({ name: 'name', description: 'Template name to delete', example: 'user_custom' })
  @ApiResponse({ status: 200, description: 'Prompt template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async deletePrompt(@Param('name') name: string) {
    return this.adminService.deleteTemplate(name);
  }

  @Put('prompts/:name/toggle')
  @ApiOperation({ summary: 'Toggle template status', description: 'Toggle the active/inactive status of a prompt template' })
  @ApiParam({ name: 'name', description: 'Template name to toggle', example: 'system_core' })
  @ApiResponse({ status: 200, description: 'Template status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async togglePrompt(@Param('name') name: string) {
    return this.adminService.toggleTemplateStatus(name);
  }

  // ==================== Statistics ====================

  @Get('stats/conversations')
  @ApiOperation({ summary: 'Get conversation statistics', description: 'Get statistics about conversations (total, active, ended, by type)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO 8601 format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO 8601 format)' })
  @ApiResponse({ status: 200, description: 'Conversation statistics retrieved successfully' })
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
  @ApiOperation({ summary: 'Get message statistics', description: 'Get statistics about messages (total, by role, by type, average length)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO 8601 format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO 8601 format)' })
  @ApiResponse({ status: 200, description: 'Message statistics retrieved successfully' })
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
  @ApiOperation({ summary: 'Get user statistics', description: 'Get user activity summary including total users, active users, and top users by conversation count' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'System health check', description: 'Get system health status including MongoDB and Gemini API status' })
  @ApiResponse({ status: 200, description: 'System health status retrieved successfully' })
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  // ==================== Conversations Management ====================

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations', description: 'Retrieve all conversations with optional filtering and pagination' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status (true/false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully with pagination metadata' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getAllConversations(
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getConversations({
      userId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details', description: 'Retrieve detailed information about a specific conversation including all messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getConversation(@Param('id') id: string) {
    return this.adminService.getConversationDetails(id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation', description: 'Permanently delete a conversation and all its messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID to delete' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async deleteConversation(@Param('id') id: string) {
    return this.adminService.deleteConversation(id);
  }
}
