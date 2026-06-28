import { Module } from '@nestjs/common';
import { RepresentationService } from './representation.service';
import { neo4jProvider } from '../config/neo4j.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [RepresentationService, neo4jProvider],
  exports: [RepresentationService],
})
export class RepresentationModule {}
