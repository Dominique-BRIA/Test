import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis | null => {
    const url = configService.get<string>('REDIS_URL');
    if (!url || process.env.VERCEL) {
      console.warn('REDIS_URL not found or running on Vercel. Redis caching disabled.');
      return null;
    }
    return new Redis(url);
  },
};
