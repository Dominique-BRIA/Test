import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageLoggerInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & Record<string, unknown>>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const workspaceId = request['workspaceId'] as string | undefined;
        if (!workspaceId) return;

        const response = http.getResponse<Response>();
        const latency = Date.now() - start;

        void this.prisma.usageLog.create({
          data: {
            workspace_id: workspaceId,
            endpoint: request.path,
            method: request.method,
            status_code: response.statusCode,
            latency_ms: latency,
          },
        });
      }),
    );
  }
}
