import { BadRequestException } from '@nestjs/common';

/**
 * Audio Validation Helper
 *
 * Validates audio files before processing:
 * - Format (WebM, WAV)
 * - Size (max 5 MB)
 * - Magic bytes (file header validation)
 */
export class AudioValidator {
  // Constants
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  private static readonly ALLOWED_MIME_TYPES = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
  ];

  /**
   * Validate audio buffer
   */
  static validate(audioBuffer: Buffer, mimeType?: string): void {
    // Validate buffer exists and is not empty
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadRequestException('Audio buffer is empty');
    }

    // Validate size
    this.validateSize(audioBuffer);

    // Validate MIME type if provided
    if (mimeType) {
      this.validateMimeType(mimeType);
    }

    // Validate magic bytes
    this.validateMagicBytes(audioBuffer, mimeType);
  }

  /**
   * Validate audio size (max 5 MB)
   */
  private static validateSize(buffer: Buffer): void {
    if (buffer.length > this.MAX_SIZE) {
      throw new BadRequestException(
        `Audio file too large: ${buffer.length} bytes. Maximum size: ${this.MAX_SIZE} bytes (5 MB)`,
      );
    }

    // Minimum size check (at least 100 bytes)
    if (buffer.length < 100) {
      throw new BadRequestException(
        `Audio file too small: ${buffer.length} bytes. Minimum size: 100 bytes`,
      );
    }
  }

  /**
   * Validate MIME type
   */
  private static validateMimeType(mimeType: string): void {
    const normalizedMimeType = mimeType.toLowerCase().trim();

    const isValid = this.ALLOWED_MIME_TYPES.some((allowed) =>
      normalizedMimeType.includes(allowed.toLowerCase()),
    );

    if (!isValid) {
      throw new BadRequestException(
        `Invalid audio format: ${mimeType}. Allowed formats: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Validate magic bytes (file header)
   */
  private static validateMagicBytes(buffer: Buffer, mimeType?: string): void {
    if (buffer.length < 4) {
      throw new BadRequestException('Audio file header is invalid');
    }

    // Determine expected format from MIME type or auto-detect
    const isWebM = mimeType?.includes('webm') || this.isWebMHeader(buffer);
    const isWav = mimeType?.includes('wav') || this.isWavHeader(buffer);

    if (!isWebM && !isWav) {
      throw new BadRequestException(
        'Invalid audio file: Header validation failed. File does not match WebM or WAV format.',
      );
    }
  }

  /**
   * Check if buffer has WebM magic bytes
   * WebM starts with: 0x1A 0x45 0xDF 0xA3
   */
  private static isWebMHeader(buffer: Buffer): boolean {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }

  /**
   * Check if buffer has WAV magic bytes
   * WAV starts with: "RIFF" (0x52 0x49 0x46 0x46)
   */
  private static isWavHeader(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;

    // Check for "RIFF"
    const hasRiff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;

    // Check for "WAVE" at offset 8
    const hasWave =
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45;

    return hasRiff && hasWave;
  }

  /**
   * Get detected MIME type from buffer
   */
  static detectMimeType(buffer: Buffer): string | null {
    if (this.isWebMHeader(buffer)) {
      return 'audio/webm';
    }

    if (this.isWavHeader(buffer)) {
      return 'audio/wav';
    }

    return null;
  }
}
