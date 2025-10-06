/**
 * AI Provider Error Codes
 */
export enum AIErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  TOKEN_LIMIT = 'TOKEN_LIMIT',
  API_ERROR = 'API_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_API_KEY = 'INVALID_API_KEY',
  INVALID_AUDIO_FORMAT = 'INVALID_AUDIO_FORMAT',
  AUDIO_TOO_LARGE = 'AUDIO_TOO_LARGE',
  AUDIO_TOO_SHORT = 'AUDIO_TOO_SHORT',
  AUDIO_TOO_LONG = 'AUDIO_TOO_LONG',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  GENERATION_FAILED = 'GENERATION_FAILED',
}

/**
 * Custom error class for AI Provider errors
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly originalError?: any,
    public readonly retryAfter?: number, // Seconds to retry (for rate limits)
  ) {
    super(message);
    this.name = 'AIProviderError';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIProviderError);
    }
  }

  /**
   * Convert error to a JSON-serializable object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryAfter: this.retryAfter,
      stack: this.stack,
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return (
      this.code === AIErrorCode.RATE_LIMIT ||
      this.code === AIErrorCode.SERVICE_UNAVAILABLE
    );
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return (
      this.code === AIErrorCode.INVALID_API_KEY ||
      this.code === AIErrorCode.INVALID_AUDIO_FORMAT ||
      this.code === AIErrorCode.AUDIO_TOO_LARGE ||
      this.code === AIErrorCode.AUDIO_TOO_SHORT ||
      this.code === AIErrorCode.AUDIO_TOO_LONG
    );
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return (
      this.code === AIErrorCode.SERVICE_UNAVAILABLE ||
      this.code === AIErrorCode.API_ERROR
    );
  }
}
