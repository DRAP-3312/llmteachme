import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SystemPromptConfig,
  SystemPromptConfigDocument,
} from '../schemas/system-prompt-config.schema';

/**
 * System Prompt Cache Service
 *
 * Caches the active system prompt in memory to avoid constant database queries.
 * The cache is invalidated when:
 * - A new prompt is activated
 * - The TTL expires (5 minutes by default)
 */
@Injectable()
export class SystemPromptCacheService {
  private readonly logger = new Logger(SystemPromptCacheService.name);

  private cachedPrompt: string | null = null;
  private cachedVersion: string | null = null;
  private lastUpdate: Date | null = null;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    @InjectModel(SystemPromptConfig.name)
    private systemPromptModel: Model<SystemPromptConfigDocument>,
  ) {}

  /**
   * Get the active system prompt (from cache or database)
   */
  async getActivePrompt(): Promise<string> {
    // Check if cache is valid
    if (this.cachedPrompt && this.isCacheValid()) {
      this.logger.debug(
        `Returning cached system prompt (version: ${this.cachedVersion})`,
      );
      return this.cachedPrompt;
    }

    // Cache is invalid or doesn't exist - fetch from database
    this.logger.debug(
      'Cache miss - fetching active system prompt from database',
    );
    await this.refreshCache();

    if (!this.cachedPrompt) {
      throw new Error(
        'No active system prompt found. Please activate a system prompt configuration.',
      );
    }

    return this.cachedPrompt;
  }

  /**
   * Get the active system prompt version
   */
  async getActiveVersion(): Promise<string | null> {
    if (this.cachedVersion && this.isCacheValid()) {
      return this.cachedVersion;
    }

    await this.refreshCache();
    return this.cachedVersion;
  }

  /**
   * Invalidate the cache (call this when activating a new prompt)
   */
  invalidateCache(): void {
    this.logger.log('Cache invalidated - will refresh on next request');
    this.cachedPrompt = null;
    this.cachedVersion = null;
    this.lastUpdate = null;
  }

  /**
   * Force refresh the cache from database
   */
  async refreshCache(): Promise<void> {
    const activeConfig = await this.systemPromptModel
      .findOne({ isActive: true })
      .exec();

    if (!activeConfig) {
      this.logger.warn('No active system prompt configuration found');
      this.cachedPrompt = null;
      this.cachedVersion = null;
      this.lastUpdate = null;
      return;
    }

    this.cachedPrompt = activeConfig.compiledPrompt;
    this.cachedVersion = activeConfig.version;
    this.lastUpdate = new Date();

    this.logger.log(
      `Cache refreshed with version ${this.cachedVersion} (${this.cachedPrompt.length} chars)`,
    );
  }

  /**
   * Check if the cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.lastUpdate) {
      return false;
    }

    const now = new Date().getTime();
    const lastUpdateTime = this.lastUpdate.getTime();
    const age = now - lastUpdateTime;

    const isValid = age < this.TTL;

    if (!isValid) {
      this.logger.debug(
        `Cache expired (age: ${Math.round(age / 1000)}s, TTL: ${this.TTL / 1000}s)`,
      );
    }

    return isValid;
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats(): {
    isCached: boolean;
    version: string | null;
    age: number | null;
    isValid: boolean;
  } {
    const age = this.lastUpdate
      ? new Date().getTime() - this.lastUpdate.getTime()
      : null;

    return {
      isCached: !!this.cachedPrompt,
      version: this.cachedVersion,
      age: age ? Math.round(age / 1000) : null, // in seconds
      isValid: this.isCacheValid(),
    };
  }
}
