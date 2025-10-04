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
import { AdminService } from './admin.service';
import { CreatePromptTemplateDto } from '../prompt/dto/create-prompt-template.dto';

@Controller('admin')
// @UseGuards(ApiKeyGuard) // TODO: Uncomment when authentication is needed
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== Prompt Templates ====================

  /**
   * Get all prompt templates
   */
  @Get('prompts')
  async getAllPrompts(@Query('layer') layer?: string) {
    if (layer) {
      return this.adminService.getTemplatesByLayer(layer as any);
    }
    return this.adminService.getAllTemplates();
  }

  /**
   * Get a specific prompt template by name
   */
  @Get('prompts/:name')
  async getPrompt(@Param('name') name: string) {
    return this.adminService.getTemplateByName(name);
  }

  /**
   * Create a new prompt template
   */
  @Post('prompts')
  async createPrompt(@Body() dto: CreatePromptTemplateDto) {
    return this.adminService.createTemplate(dto);
  }

  /**
   * Update a prompt template
   */
  @Put('prompts/:name')
  async updatePrompt(
    @Param('name') name: string,
    @Body() updates: Partial<CreatePromptTemplateDto>,
  ) {
    return this.adminService.updateTemplate(name, updates);
  }

  /**
   * Delete a prompt template
   */
  @Delete('prompts/:name')
  async deletePrompt(@Param('name') name: string) {
    return this.adminService.deleteTemplate(name);
  }

  /**
   * Toggle template active status
   */
  @Put('prompts/:name/toggle')
  async togglePrompt(@Param('name') name: string) {
    return this.adminService.toggleTemplateStatus(name);
  }

  // ==================== Statistics ====================

  /**
   * Get conversation statistics
   */
  @Get('stats/conversations')
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

  /**
   * Get message statistics
   */
  @Get('stats/messages')
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

  /**
   * Get user activity summary
   */
  @Get('stats/users')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  /**
   * Get system health status
   */
  @Get('health')
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  // ==================== Conversations Management ====================

  /**
   * Get all conversations
   */
  @Get('conversations')
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

  /**
   * Get conversation details
   */
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.adminService.getConversationDetails(id);
  }

  /**
   * Delete a conversation
   */
  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string) {
    return this.adminService.deleteConversation(id);
  }
}
