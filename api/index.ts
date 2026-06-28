import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import path from 'path';

const server = express();
let app: any = null;

const bootstrap = async () => {
  if (app) return server;
  // dist/ is copied into api/dist/ by the build command (cp -r dist api/dist).
  // At runtime __dirname = /var/task/api, so this resolves to /var/task/api/dist.
  // includeFiles: "dist/**" in vercel.json deploys those files alongside the function.
  const distModulePath = path.resolve(__dirname, 'dist', 'app.module');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppModule } = require(distModulePath);
  app = await NestFactory.create(AppModule, new ExpressAdapter(server), { logger: ['error', 'warn'] });
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  return server;
};

export default async (req: any, res: any) => {
  await bootstrap();
  server(req, res);
};
