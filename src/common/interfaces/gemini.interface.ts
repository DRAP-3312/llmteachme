export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  text: string;
  tokensUsed?: number;
  processingTime?: number;
}

export interface AudioTranscriptionOptions {
  language?: string;
  format?: string;
}

export interface AudioTranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
}
