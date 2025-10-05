import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationModule } from './modules/conversation/conversation.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { PromptModule } from './modules/prompt/prompt.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    ConversationModule,

    GeminiModule,

    PromptModule,

    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
