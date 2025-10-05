import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('conversations')
@ApiBearerAuth('JWT-auth')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new conversation',
    description: 'Create a new conversation with specified type and metadata',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    const dto = {
      ...createConversationDto,
      userId: user._id.toString(),
    };
    return this.conversationService.createConversation(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user conversations',
    description:
      'Retrieve all conversations for the authenticated user with optional filtering',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'conversationType',
    required: false,
    type: String,
    description: 'Filter by conversation type',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserConversations(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: boolean,
    @Query('conversationType') conversationType?: string,
  ) {
    const userId = user._id.toString();
    let conversations = await this.conversationService.getUserConversations(userId);

    // Aplicar filtros manualmente si se proporcionan
    if (isActive !== undefined) {
      conversations = conversations.filter(conv => conv.isActive === isActive);
    }
    if (conversationType) {
      conversations = conversations.filter(conv => conv.conversationType === conversationType);
    }

    return conversations;
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active conversation',
    description:
      'Retrieve the current active conversation for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Active conversation retrieved' })
  @ApiResponse({ status: 404, description: 'No active conversation found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveConversation(@CurrentUser() user: any) {
    return this.conversationService.getActiveConversation(user._id.toString());
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get conversation details',
    description: 'Retrieve a specific conversation by ID with all its messages',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not your conversation',
  })
  async getConversation(@CurrentUser() user: any, @Param('id') id: string) {
    const conversation = await this.conversationService.getConversation(id);

    // Verify ownership
    if (conversation.userId.toString() !== user._id.toString()) {
      throw new Error('Forbidden - Not your conversation');
    }

    const messages = await this.conversationService.getConversationMessages(id);

    return {
      conversation,
      messages,
    };
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Get conversation messages',
    description: 'Retrieve all messages from a specific conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not your conversation',
  })
  async getConversationMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const conversation = await this.conversationService.getConversation(id);

    // Verify ownership
    if (conversation.userId.toString() !== user._id.toString()) {
      throw new Error('Forbidden - Not your conversation');
    }

    return this.conversationService.getConversationMessages(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Permanently delete a conversation and all its messages',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not your conversation',
  })
  async deleteConversation(@CurrentUser() user: any, @Param('id') id: string) {
    const conversation = await this.conversationService.getConversation(id);

    // Verify ownership
    if (conversation.userId.toString() !== user._id.toString()) {
      throw new Error('Forbidden - Not your conversation');
    }

    return this.conversationService.deleteConversation(id);
  }

  @Post(':id/end')
  @ApiOperation({
    summary: 'End conversation',
    description: 'Mark a conversation as inactive (ended)',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID to end' })
  @ApiResponse({ status: 200, description: 'Conversation ended successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not your conversation',
  })
  async endConversation(@CurrentUser() user: any, @Param('id') id: string) {
    const conversation = await this.conversationService.getConversation(id);

    // Verify ownership
    if (conversation.userId.toString() !== user._id.toString()) {
      throw new Error('Forbidden - Not your conversation');
    }

    return this.conversationService.endConversation(id);
  }
}
