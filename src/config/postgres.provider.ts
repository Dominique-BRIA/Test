import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

export const POSTGRES_POOL = 'POSTGRES_POOL';

export const postgresProvider = {
  provide: POSTGRES_POOL,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Pool => {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      console.error('DATABASE_URL is missing. Postgres connection failed.');
    } else {
      try {
        const u = new URL(connectionString);
        console.log(`[Postgres] connecting → host=${u.hostname} port=${u.port} user=${u.username}`);
      } catch { /* invalid url */ }
    }
    const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
    return new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  },
};
