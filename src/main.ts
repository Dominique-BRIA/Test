import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // ── Swagger / OpenAPI ──────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('YowLinker API')
    .setDescription(
      `## Graph-Based Recommendation & Link Prediction Platform

YowLinker exposes a REST API that lets you model any domain as a **weighted, directed graph**
(nodes + edges in PostgreSQL, traversal queries in Neo4j) and run multi-strategy link prediction
and ranking on top of it.

### Architecture

\`\`\`
Scoring Providers  ──►  Recommendation Engine  ──►  Ranking  ──►  Top-K
    (features)               (aggregate)            (score)     (results)
\`\`\`

### Authentication

| Route group | Method | Header |
|---|---|---|
| Dashboard routes (auth, workspaces, usage) | Session | \`Authorization: Bearer <token>\` |
| API routes (graph, features, prediction, ranking) | API Key | \`X-API-Key: <key>\` |

### Quick start

\`\`\`bash
# 1. Register & get a session token
curl -X POST http://localhost:3001/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"secret123"}'

# 2. Create a workspace
curl -X POST http://localhost:3001/workspaces \\
  -H "Authorization: Bearer <token>" \\
  -d '{"name":"my-graph","adapter_name":"education"}'

# 3. Generate an API key
curl -X POST http://localhost:3001/workspaces/<id>/api-keys \\
  -H "Authorization: Bearer <token>" \\
  -d '{"name":"production"}'

# 4. Use the API key to build your graph
curl -X POST http://localhost:3001/graph/nodes \\
  -H "X-API-Key: <key>" \\
  -d '{"id":"<uuid>","workspace_id":"<ws-id>","type":"student"}'
\`\`\`
`,
    )
    .setVersion('1.0.0')
    .setContact('YowLinker', 'https://github.com/S-dev237/YowLinker', '')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description:
          'Machine API key for graph/feature/prediction/ranking endpoints. ' +
          'Obtain one via POST /workspaces/:id/api-keys (requires a session token).',
      },
      'api-key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'token',
        description:
          'Session token for dashboard endpoints (auth, workspaces, usage). ' +
          'Obtain one via POST /auth/login.',
      },
      'session',
    )
    .addTag('Auth', 'User registration, login, session management')
    .addTag('Workspaces', 'Multi-tenant workspace and API key management')
    .addTag('Graph', 'Node and edge CRUD, subgraph traversal (Neo4j)')
    .addTag('Features', 'Pluggable scoring providers with Redis caching')
    .addTag('Prediction', 'Link prediction pipeline (score, rank, explain, async jobs)')
    .addTag('Ranking', 'Top-K candidate ranking with four scoring strategies')
    .addTag('Usage', 'Request logs and aggregated usage statistics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'YowLinker API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      docExpansion: 'list',
      filter: true,
      displayRequestDuration: true,
    },
    customCss: `
      .swagger-ui .topbar { background: #22313F; }
      .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 24"><text y="18" font-size="16" font-weight="bold" fill="%23FECC00" font-family="system-ui">YowLinker</text></svg>'); width: 120px; }
      .swagger-ui .info .title { color: #22313F; }
      .swagger-ui .btn.authorize { background: #FECC00; border-color: #FECC00; color: #22313F; font-weight: 600; }
      .swagger-ui .btn.authorize svg { fill: #22313F; }
    `,
  });
  // ─────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`YowLinker API running on http://localhost:${port}`);
  console.log(`API Docs available at http://localhost:${port}/docs`);
}

bootstrap();
