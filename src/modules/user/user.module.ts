import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Import AuthModule to access User and UserStats schemas
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
