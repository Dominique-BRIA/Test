import neo4j, { Driver } from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';

export const NEO4J_DRIVER = 'NEO4J_DRIVER';

export const neo4jProvider = {
  provide: NEO4J_DRIVER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Driver => {
    const uri = configService.get<string>('NEO4J_URI');
    const user = configService.get<string>('NEO4J_USER');
    const password = configService.get<string>('NEO4J_PASSWORD');
    
    if (!uri || !user || !password) {
      console.warn('Neo4j configuration missing (URI/USER/PASSWORD). Defaulting to localhost.');
    }

    return neo4j.driver(
      uri || 'bolt://localhost:7687',
      neo4j.auth.basic(user || 'neo4j', password || 'password'),
    );
  },
};
