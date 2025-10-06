import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TemplateSimulator,
  TemplateSimulatorDocument,
} from '../schemas/template-simulator.schema';
import { TopicService } from './topic.service';

export interface CreateTemplateDto {
  title: string;
  description: string;
  topicId: string;
  scope: 'global' | 'test' | 'user';
}

export interface UpdateTemplateDto {
  title?: string;
  description?: string;
  topicId?: string;
  scope?: 'global' | 'test' | 'user';
  isActive?: boolean;
}

@Injectable()
export class TemplateSimulatorService {
  private readonly logger = new Logger(TemplateSimulatorService.name);

  constructor(
    @InjectModel(TemplateSimulator.name)
    private templateModel: Model<TemplateSimulatorDocument>,
    private topicService: TopicService,
  ) {}

  /**
   * Create a new template
   */
  async create(
    dto: CreateTemplateDto,
    createdBy: string,
  ): Promise<TemplateSimulatorDocument> {
    // Validate topic exists
    await this.topicService.findById(dto.topicId);

    const template = new this.templateModel({
      title: dto.title,
      description: dto.description,
      topicId: dto.topicId,
      scope: dto.scope,
      createdBy,
      isActive: true,
    });

    await template.save();

    this.logger.log(`Template created: ${template.title}`);

    return template;
  }

  /**
   * Get all templates with optional filters
   */
  async findAll(filters?: {
    scope?: 'global' | 'test' | 'user';
    topicId?: string;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<TemplateSimulatorDocument[]> {
    const query: any = {};

    if (filters?.scope) {
      query.scope = filters.scope;
    }

    if (filters?.topicId) {
      query.topicId = filters.topicId;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.createdBy) {
      query.createdBy = filters.createdBy;
    }

    return this.templateModel
      .find(query)
      .populate('topicId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get templates available for a user
   */
  async findAvailableForUser(
    userId: string,
  ): Promise<TemplateSimulatorDocument[]> {
    // User can see: global (active) + their own user templates
    return this.templateModel
      .find({
        $or: [
          { scope: 'global', isActive: true },
          { scope: 'user', createdBy: userId, isActive: true },
        ],
      })
      .populate('topicId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get template by ID
   */
  async findById(id: string): Promise<TemplateSimulatorDocument> {
    const template = await this.templateModel.findById(id).populate('topicId');

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Update template
   */
  async update(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<TemplateSimulatorDocument> {
    const template = await this.findById(id);

    // Validate topic if being changed
    if (dto.topicId && dto.topicId !== template.topicId.toString()) {
      await this.topicService.findById(dto.topicId);
      template.topicId = dto.topicId as any;
    }

    if (dto.title) {
      template.title = dto.title;
    }

    if (dto.description) {
      template.description = dto.description;
    }

    if (dto.scope) {
      template.scope = dto.scope;
    }

    if (dto.isActive !== undefined) {
      template.isActive = dto.isActive;
    }

    await template.save();

    this.logger.log(`Template updated: ${template.title}`);

    return this.findById(id); // Return populated
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    const template = await this.findById(id);

    // TODO: Check if template is being used in active sessions
    // For now, just delete

    await this.templateModel.findByIdAndDelete(id);

    this.logger.log(`Template deleted: ${template.title}`);
  }

  /**
   * Toggle template active status
   */
  async toggleActive(id: string): Promise<TemplateSimulatorDocument> {
    const template = await this.findById(id);
    template.isActive = !template.isActive;
    await template.save();

    this.logger.log(
      `Template ${template.title} set to ${template.isActive ? 'active' : 'inactive'}`,
    );

    return this.findById(id);
  }

  /**
   * Get templates by topic
   */
  async findByTopic(topicId: string): Promise<TemplateSimulatorDocument[]> {
    return this.templateModel
      .find({ topicId, isActive: true })
      .populate('topicId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
