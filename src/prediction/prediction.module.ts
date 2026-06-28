import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';
import { AuthModule } from '../auth/auth.module';
import { FeatureModule } from '../feature/feature.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [AuthModule, FeatureModule, GraphModule],
  controllers: [PredictionController],
  providers: [PredictionService],
  exports: [PredictionService],
})
export class PredictionModule {}
