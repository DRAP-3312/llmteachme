import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeminiProvider } from './implementations/gemini-provider.service';
import { MockProvider } from './implementations/mock-provider.service';
import { IAIProvider } from './interfaces/ai-provider.interface';

/**
 * AI Provider Module
 *
 * Provides AI services with abstraction layer.
 * The actual provider (Gemini, Mock, etc.) is selected via environment variable.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'IAIProvider',
      useFactory: (configService: ConfigService): IAIProvider => {
        const provider = configService.get<string>('AI_PROVIDER', 'gemini');

        switch (provider.toLowerCase()) {
          case 'gemini':
            return new GeminiProvider(configService);

          case 'mock':
            return new MockProvider();

          default:
            throw new Error(
              `Unknown AI provider: ${provider}. Valid options: gemini, mock`,
            );
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['IAIProvider'],
})
export class AIProviderModule {}
