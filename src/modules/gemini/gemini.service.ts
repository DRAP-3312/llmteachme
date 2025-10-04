import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  GeminiMessage,
  GeminiResponse,
  AudioTranscriptionResult,
} from '../../common/interfaces/gemini.interface';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private chatModel: GenerativeModel;
  private audioModel: GenerativeModel;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.logger.warn('Gemini API Key not configured. Set GEMINI_API_KEY in .env file');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.chatModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      this.audioModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      this.logger.log('Gemini API initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gemini API', error);
    }
  }

  /**
   * Generate a response from Gemini based on conversation history
   */
  async generateResponse(
    messages: GeminiMessage[],
    systemPrompt?: string,
  ): Promise<GeminiResponse> {
    if (!this.chatModel) {
      throw new Error('Gemini API not initialized. Check your API key configuration.');
    }

    const startTime = Date.now();

    try {
      // Build the prompt with system instructions if provided
      let fullPrompt = '';
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n`;
      }

      // Add conversation history
      messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        fullPrompt += `${role}: ${msg.parts[0].text}\n`;
      });

      const result = await this.chatModel.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      const processingTime = Date.now() - startTime;

      this.logger.debug(`Generated response in ${processingTime}ms`);

      return {
        text,
        processingTime,
        tokensUsed: 0, // TODO: Get actual token count from Gemini API
      };
    } catch (error) {
      this.logger.error('Error generating response from Gemini', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Generate a streaming response from Gemini
   */
  async generateStreamingResponse(
    messages: GeminiMessage[],
    systemPrompt?: string,
  ): Promise<AsyncGenerator<string>> {
    if (!this.chatModel) {
      throw new Error('Gemini API not initialized. Check your API key configuration.');
    }

    try {
      let fullPrompt = '';
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n`;
      }

      messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        fullPrompt += `${role}: ${msg.parts[0].text}\n`;
      });

      const result = await this.chatModel.generateContentStream(fullPrompt);

      return this.streamGenerator(result);
    } catch (error) {
      this.logger.error('Error generating streaming response', error);
      throw new Error(`Failed to generate streaming response: ${error.message}`);
    }
  }

  private async *streamGenerator(result: any): AsyncGenerator<string> {
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }
  }

  /**
   * Transcribe audio to text using Gemini
   * Note: Gemini Pro doesn't natively support audio transcription
   * This is a placeholder for future implementation or integration with other services
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<AudioTranscriptionResult> {
    this.logger.warn('Audio transcription not yet implemented with Gemini API');

    // TODO: Implement audio transcription
    // Options:
    // 1. Use Google Cloud Speech-to-Text API
    // 2. Use Gemini Pro Vision/Audio when available
    // 3. Use alternative transcription service

    throw new Error('Audio transcription not yet implemented');
  }

  /**
   * Analyze text for grammar and vocabulary
   */
  async analyzeText(text: string, targetLevel: string = 'intermediate'): Promise<any> {
    if (!this.chatModel) {
      throw new Error('Gemini API not initialized. Check your API key configuration.');
    }

    const analysisPrompt = `
You are an English language teacher. Analyze the following text for grammar errors and provide suggestions.
Target level: ${targetLevel}

Text: "${text}"

Provide a JSON response with the following structure:
{
  "grammarErrors": [{ "error": "description", "suggestion": "correction", "position": 0 }],
  "vocabularyLevel": "beginner|intermediate|advanced",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "score": 0-100
}
`;

    try {
      const result = await this.chatModel.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        grammarErrors: [],
        vocabularyLevel: targetLevel,
        suggestions: [],
        score: 0,
      };
    } catch (error) {
      this.logger.error('Error analyzing text', error);
      throw new Error(`Failed to analyze text: ${error.message}`);
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return !!this.chatModel;
  }
}
