import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GraphModule } from './graph/graph.module';
import { DomainModule } from './domain/domain.module';
import { AuthModule } from './auth/auth.module';
import { FeatureModule } from './feature/feature.module';
import { PredictionModule } from './prediction/prediction.module';
import { RepresentationModule } from './representation/representation.module';
import { SyncModule } from './sync/sync.module';
import { RankingModule } from './ranking/ranking.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { UsageModule } from './usage/usage.module';
import { UsageLoggerInterceptor } from './common/usage-logger.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { neo4jProvider } from './config/neo4j.provider';
import { redisProvider } from './config/redis.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GraphModule,
    DomainModule,
    AuthModule,
    FeatureModule,
    PredictionModule,
    RepresentationModule,
    SyncModule,
    RankingModule,
    WorkspaceModule,
    UsageModule,
  ],
  providers: [
    neo4jProvider,
    redisProvider,
    { provide: APP_INTERCEPTOR, useClass: UsageLoggerInterceptor },
  ],
  exports: [neo4jProvider, redisProvider],
})
export class AppModule {}
