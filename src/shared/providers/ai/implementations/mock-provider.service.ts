import { Injectable, Logger } from '@nestjs/common';
import { IAIProvider, Message } from '../interfaces/ai-provider.interface';

/**
 * Mock AI Provider for Testing
 *
 * Returns predictable responses without making actual API calls.
 * Useful for unit tests and development without consuming API quota.
 */
@Injectable()
export class MockProvider implements IAIProvider {
  private readonly logger = new Logger(MockProvider.name);
  private initialized = true;

  /**
   * Mock transcription - returns a fixed response
   */
  async transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
    this.logger.debug(
      `[MOCK] Transcribing audio (${audio.length} bytes, ${mimeType})`,
    );

    // Simulate processing delay
    await this.delay(100);

    return 'This is a mock transcription of the audio. Hello, how are you doing today?';
  }

  /**
   * Mock response generation - returns contextual mock response
   */
  async generateResponse(
    systemPrompt: string,
    templateInstructions: string,
    userContext: string,
    history: Message[],
  ): Promise<string> {
    this.logger.debug('[MOCK] Generating response');
    this.logger.debug(`System Prompt: ${systemPrompt.substring(0, 50)}...`);
    this.logger.debug(`Template: ${templateInstructions.substring(0, 50)}...`);
    this.logger.debug(`User Context: ${userContext.substring(0, 50)}...`);
    this.logger.debug(`History length: ${history.length} messages`);

    // Simulate processing delay
    await this.delay(500);

    // Generate a mock response based on history
    const lastUserMessage = history
      .filter((m) => m.role === 'user' && !m.isContextMessage)
      .pop();

    if (lastUserMessage) {
      return `This is a mock AI response to: "${lastUserMessage.text}". I understand your message and I'm here to help you practice English!`;
    }

    return "Hello! This is a mock AI response. I'm ready to help you practice your English. How can I assist you today?";
  }

  /**
   * Mock summary generation
   */
  async generateSummary(messages: Message[]): Promise<string> {
    this.logger.debug(
      `[MOCK] Generating summary for ${messages.length} messages`,
    );

    // Simulate processing delay
    await this.delay(300);

    const nonContextMessages = messages.filter((m) => !m.isContextMessage);
    const messageCount = nonContextMessages.length;
    const userMessages = nonContextMessages.filter(
      (m) => m.role === 'user',
    ).length;
    const assistantMessages = nonContextMessages.filter(
      (m) => m.role === 'model',
    ).length;

    return `Mock session summary: This conversation had ${messageCount} messages (${userMessages} from user, ${assistantMessages} from assistant). Topics discussed included general English practice and conversational skills.`;
  }

  /**
   * Always returns true for mock provider
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * For testing purposes - allow setting initialized state
   */
  setInitialized(value: boolean): void {
    this.initialized = value;
  }
}
