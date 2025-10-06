import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Topic, TopicDocument } from '../schemas/topic.schema';

export interface CreateTopicDto {
  name: string;
  description: string;
}

export interface UpdateTopicDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

  constructor(
    @InjectModel(Topic.name)
    private topicModel: Model<TopicDocument>,
  ) {}

  /**
   * Create a new topic
   */
  async create(dto: CreateTopicDto, createdBy: string): Promise<TopicDocument> {
    // Check if topic with same name exists
    const existing = await this.topicModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException('Topic with this name already exists');
    }

    const topic = new this.topicModel({
      name: dto.name,
      description: dto.description,
      isActive: true,
      createdBy,
    });

    await topic.save();

    this.logger.log(`Topic created: ${topic.name}`);

    return topic;
  }

  /**
   * Get all topics
   */
  async findAll(isActive?: boolean): Promise<TopicDocument[]> {
    const filter: any = {};
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    return this.topicModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get topic by ID
   */
  async findById(id: string): Promise<TopicDocument> {
    const topic = await this.topicModel.findById(id);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return topic;
  }

  /**
   * Get topic by name
   */
  async findByName(name: string): Promise<TopicDocument | null> {
    return this.topicModel.findOne({ name });
  }

  /**
   * Update topic
   */
  async update(id: string, dto: UpdateTopicDto): Promise<TopicDocument> {
    const topic = await this.findById(id);

    // Check if name is being changed and if it's unique
    if (dto.name && dto.name !== topic.name) {
      const existing = await this.topicModel.findOne({ name: dto.name });
      if (existing) {
        throw new ConflictException('Topic with this name already exists');
      }
      topic.name = dto.name;
    }

    if (dto.description !== undefined) {
      topic.description = dto.description;
    }

    if (dto.isActive !== undefined) {
      topic.isActive = dto.isActive;
    }

    await topic.save();

    this.logger.log(`Topic updated: ${topic.name}`);

    return topic;
  }

  /**
   * Delete topic
   */
  async delete(id: string): Promise<void> {
    const topic = await this.findById(id);

    // TODO: Check if topic is being used by templates
    // For now, just delete

    await this.topicModel.findByIdAndDelete(id);

    this.logger.log(`Topic deleted: ${topic.name}`);
  }

  /**
   * Toggle topic active status
   */
  async toggleActive(id: string): Promise<TopicDocument> {
    const topic = await this.findById(id);
    topic.isActive = !topic.isActive;
    await topic.save();

    this.logger.log(
      `Topic ${topic.name} set to ${topic.isActive ? 'active' : 'inactive'}`,
    );

    return topic;
  }
}
