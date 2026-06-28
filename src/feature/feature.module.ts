import { Module } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { FeatureController } from './feature.controller';
import { redisProvider } from '../config/redis.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FeatureController],
  providers: [FeatureService, redisProvider],
  exports: [FeatureService],
})
export class FeatureModule {}
