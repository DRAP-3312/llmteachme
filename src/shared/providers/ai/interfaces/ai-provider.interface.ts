/**
 * AI Provider Interface
 *
 * Abstraction for AI service providers (Gemini, OpenAI, Claude, etc.)
 * This allows switching between different AI providers without changing business logic.
 */

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp?: Date;
  isContextMessage?: boolean;
}

export interface IAIProvider {
  /**
   * Transcribe audio to text
   * @param audio - Audio buffer (WebM or WAV format)
   * @param mimeType - MIME type of the audio file
   * @returns Transcribed text
   */
  transcribeAudio(audio: Buffer, mimeType: string): Promise<string>;

  /**
   * Generate AI response based on context and history
   * @param systemPrompt - Global system prompt (personality, rules, etc.)
   * @param templateInstructions - Template-specific instructions for the scenario
   * @param userContext - User context message (level, interests, native language)
   * @param history - Conversation history (sliding window already applied)
   * @returns AI response text
   */
  generateResponse(
    systemPrompt: string,
    templateInstructions: string,
    userContext: string,
    history: Message[],
  ): Promise<string>;

  /**
   * Generate session summary
   * @param messages - All messages from the session
   * @returns Summary text
   */
  generateSummary(messages: Message[]): Promise<string>;

  /**
   * Check if the provider is properly initialized
   * @returns true if initialized and ready to use
   */
  isInitialized(): boolean;
}
