import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { SessionGuard } from './session.guard';
import { UserService } from '../user/user.service';

@Module({
  providers: [AuthService, ApiKeyGuard, UserService, SessionGuard],
  controllers: [AuthController],
  exports: [AuthService, ApiKeyGuard, UserService, SessionGuard],
})
export class AuthModule {}
