import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { CandidateGeneratorService } from './candidate-generator.service';
import { TopKSelectorService } from './top-k-selector.service';
import { ExplanationService } from './explanation.service';
import { neo4jProvider } from '../config/neo4j.provider';
import { AuthModule } from '../auth/auth.module';
import { FeatureModule } from '../feature/feature.module';
import { RepresentationModule } from '../representation/representation.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [AuthModule, FeatureModule, RepresentationModule, DomainModule],
  controllers: [RankingController],
  providers: [
    RankingService,
    CandidateGeneratorService,
    TopKSelectorService,
    ExplanationService,
    neo4jProvider,
  ],
  exports: [RankingService],
})
export class RankingModule {}
