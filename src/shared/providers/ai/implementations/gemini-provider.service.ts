import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { IAIProvider, Message } from '../interfaces/ai-provider.interface';
import { AIProviderError, AIErrorCode } from '../errors/ai-provider.error';

/**
 * Gemini AI Provider Implementation
 *
 * Uses Google's Gemini API for:
 * - Audio transcription
 * - Text generation
 * - Conversation summarization
 */
@Injectable()
export class GeminiProvider implements IAIProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;

  // Audio validation constants
  private readonly ALLOWED_MIME_TYPES = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/wav',
    'audio/wave',
  ];
  private readonly MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB
  private readonly MIN_AUDIO_DURATION = 2; // seconds
  private readonly MAX_AUDIO_DURATION = 60; // seconds

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.logger.warn(
        'Gemini API Key not configured. Set GEMINI_API_KEY in .env file',
      );
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);

      // Use gemini-2.0-flash-exp for text generation (supports multimodal)
      const model = this.configService.get<string>(
        'GEMINI_MODEL',
        'gemini-2.0-flash-exp',
      );
      this.textModel = this.genAI.getGenerativeModel({ model });

      this.logger.log(
        `Gemini Provider initialized successfully with model: ${model}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Gemini API', error);
      throw new AIProviderError(
        'Failed to initialize Gemini API',
        AIErrorCode.API_ERROR,
        error,
      );
    }
  }

  /**
   * Transcribe audio to text using Gemini
   */
  async transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new AIProviderError(
        'Gemini API not initialized. Check your API key configuration.',
        AIErrorCode.API_ERROR,
      );
    }

    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new AIProviderError(
        `Invalid audio format: ${mimeType}. Allowed formats: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
        AIErrorCode.INVALID_AUDIO_FORMAT,
      );
    }

    // Validate file size
    if (audio.length > this.MAX_AUDIO_SIZE) {
      throw new AIProviderError(
        `Audio file too large: ${audio.length} bytes. Maximum size: ${this.MAX_AUDIO_SIZE} bytes (5 MB)`,
        AIErrorCode.AUDIO_TOO_LARGE,
      );
    }

    // Validate audio header (magic bytes)
    if (!this.validateAudioHeader(audio, mimeType)) {
      throw new AIProviderError(
        'Invalid audio file: Header validation failed',
        AIErrorCode.INVALID_AUDIO_FORMAT,
      );
    }

    try {
      // Convert buffer to base64
      const base64Audio = audio.toString('base64');

      // Prepare the request with audio
      const result = await this.textModel.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        {
          text: 'Transcribe this audio to text. Only return the transcription, nothing else.',
        },
      ]);

      const response = result.response;
      const transcription = response.text().trim();

      if (!transcription) {
        throw new AIProviderError(
          'Transcription returned empty text',
          AIErrorCode.TRANSCRIPTION_FAILED,
        );
      }

      this.logger.debug(
        `Transcribed audio (${audio.length} bytes): ${transcription.substring(0, 100)}...`,
      );

      return transcription;
    } catch (error) {
      this.logger.error('Error transcribing audio with Gemini', error);

      if (error instanceof AIProviderError) {
        throw error;
      }

      // Handle Gemini API errors
      throw this.handleGeminiError(error, 'transcription');
    }
  }

  /**
   * Generate AI response based on context and history
   */
  async generateResponse(
    systemPrompt: string,
    templateInstructions: string,
    userContext: string,
    history: Message[],
  ): Promise<string> {
    if (!this.isInitialized()) {
      throw new AIProviderError(
        'Gemini API not initialized. Check your API key configuration.',
        AIErrorCode.API_ERROR,
      );
    }

    try {
      // Build the complete prompt
      const fullPrompt = this.buildPrompt(
        systemPrompt,
        templateInstructions,
        userContext,
        history,
      );

      this.logger.debug('Generating response with Gemini');

      const result = await this.textModel.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text().trim();

      if (!text) {
        throw new AIProviderError(
          'Generation returned empty text',
          AIErrorCode.GENERATION_FAILED,
        );
      }

      this.logger.debug(`Generated response: ${text.substring(0, 100)}...`);

      return text;
    } catch (error) {
      this.logger.error('Error generating response with Gemini', error);

      if (error instanceof AIProviderError) {
        throw error;
      }

      throw this.handleGeminiError(error, 'generation');
    }
  }

  /**
   * Generate session summary
   */
  async generateSummary(messages: Message[]): Promise<string> {
    if (!this.isInitialized()) {
      throw new AIProviderError(
        'Gemini API not initialized. Check your API key configuration.',
        AIErrorCode.API_ERROR,
      );
    }

    try {
      // Build conversation text
      const conversationText = messages
        .filter((msg) => !msg.isContextMessage)
        .map(
          (msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`,
        )
        .join('\n');

      const summaryPrompt = `
You are tasked with creating a brief summary of an English learning conversation.

Conversation:
${conversationText}

Create a summary that includes:
1. Main topics discussed
2. Key vocabulary or grammar points covered
3. Overall performance (if applicable)

Keep it concise (2-3 sentences).
      `.trim();

      this.logger.debug('Generating session summary with Gemini');

      const result = await this.textModel.generateContent(summaryPrompt);
      const response = result.response;
      const summary = response.text().trim();

      if (!summary) {
        throw new AIProviderError(
          'Summary generation returned empty text',
          AIErrorCode.GENERATION_FAILED,
        );
      }

      this.logger.debug(`Generated summary: ${summary.substring(0, 100)}...`);

      return summary;
    } catch (error) {
      this.logger.error('Error generating summary with Gemini', error);

      if (error instanceof AIProviderError) {
        throw error;
      }

      throw this.handleGeminiError(error, 'summary generation');
    }
  }

  /**
   * Check if the provider is properly initialized
   */
  isInitialized(): boolean {
    return !!this.textModel;
  }

  /**
   * Build complete prompt from all components
   */
  private buildPrompt(
    systemPrompt: string,
    templateInstructions: string,
    userContext: string,
    history: Message[],
  ): string {
    let prompt = '';

    // 1. System Prompt
    if (systemPrompt) {
      prompt += `${systemPrompt}\n\n`;
    }

    // 2. Template Instructions
    if (templateInstructions) {
      prompt += `SCENARIO:\n${templateInstructions}\n\n`;
    }

    // 3. User Context
    if (userContext) {
      prompt += `STUDENT PROFILE:\n${userContext}\n\n`;
    }

    // 4. Conversation History
    if (history.length > 0) {
      prompt += `CONVERSATION HISTORY:\n`;
      history
        .filter((msg) => !msg.isContextMessage)
        .forEach((msg) => {
          const role = msg.role === 'user' ? 'Student' : 'Teacher';
          prompt += `${role}: ${msg.text}\n`;
        });
      prompt += '\n';
    }

    // 5. Instruction for next response
    prompt += `Please respond as the Teacher in this conversation.`;

    return prompt;
  }

  /**
   * Validate audio file header (magic bytes)
   */
  private validateAudioHeader(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) {
      return false;
    }

    if (mimeType.includes('webm')) {
      // WebM starts with: 0x1A 0x45 0xDF 0xA3
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    }

    if (mimeType.includes('wav')) {
      // WAV starts with: "RIFF"
      return buffer.toString('ascii', 0, 4) === 'RIFF';
    }

    return false;
  }

  /**
   * Handle Gemini API errors and convert to AIProviderError
   */
  private handleGeminiError(error: any, operation: string): AIProviderError {
    // Rate limit error
    if (error.status === 429 || error.message?.includes('quota')) {
      const retryAfter = error.headers?.['retry-after']
        ? parseInt(error.headers['retry-after'])
        : 60;

      return new AIProviderError(
        `Rate limit exceeded during ${operation}`,
        AIErrorCode.RATE_LIMIT,
        error,
        retryAfter,
      );
    }

    // Token limit error
    if (
      error.status === 400 &&
      (error.message?.includes('token') || error.message?.includes('length'))
    ) {
      return new AIProviderError(
        `Token limit exceeded during ${operation}`,
        AIErrorCode.TOKEN_LIMIT,
        error,
      );
    }

    // Invalid API key
    if (error.status === 401 || error.status === 403) {
      return new AIProviderError(
        `Invalid or expired API key during ${operation}`,
        AIErrorCode.INVALID_API_KEY,
        error,
      );
    }

    // Service unavailable
    if (error.status >= 500) {
      return new AIProviderError(
        `Gemini service unavailable during ${operation}`,
        AIErrorCode.SERVICE_UNAVAILABLE,
        error,
      );
    }

    // Generic API error
    return new AIProviderError(
      `Gemini API error during ${operation}: ${error.message}`,
      AIErrorCode.API_ERROR,
      error,
    );
  }
}
