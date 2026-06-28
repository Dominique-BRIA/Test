import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import { PredictionController } from './prediction.controller';
import { PredictionService } from './prediction.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuthService } from '../auth/auth.service';
import { APP_GUARD } from '@nestjs/core';

const mockPredictionService = {
  predictLink: jest.fn(),
  rank: jest.fn(),
  explain: jest.fn(),
  createJob: jest.fn(),
  getJob: jest.fn(),
};

const alwaysAllowGuard = { canActivate: () => true };

describe('PredictionController (mocked guard)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionController],
      providers: [{ provide: PredictionService, useValue: mockPredictionService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(alwaysAllowGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('POST /prediction/link returns 200 with score', async () => {
    mockPredictionService.predictLink.mockResolvedValue(0.87);

    const res = await request(app.getHttpServer())
      .post('/prediction/link')
      .send({
        source: '00000000-0000-0000-0000-000000000001',
        target: '00000000-0000-0000-0000-000000000002',
        relation_type: 'ENROLLED',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.score).toBe(0.87);
  });

  it('POST /prediction/link returns 400 for missing body', async () => {
    const res = await request(app.getHttpServer()).post('/prediction/link').send({});
    expect(res.status).toBe(400);
  });

  it('POST /prediction/rank returns 200 with sorted results', async () => {
    const ranked = [
      { id: '00000000-0000-0000-0000-000000000003', score: 0.9 },
      { id: '00000000-0000-0000-0000-000000000004', score: 0.6 },
    ];
    mockPredictionService.rank.mockResolvedValue(ranked);

    const res = await request(app.getHttpServer())
      .post('/prediction/rank')
      .send({
        source: '00000000-0000-0000-0000-000000000001',
        candidates: [
          '00000000-0000-0000-0000-000000000003',
          '00000000-0000-0000-0000-000000000004',
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data[0].score).toBeGreaterThanOrEqual(res.body.data[1].score);
  });

  it('POST /prediction/rank returns 400 for empty candidates array', async () => {
    const res = await request(app.getHttpServer())
      .post('/prediction/rank')
      .send({
        source: '00000000-0000-0000-0000-000000000001',
        candidates: [],
      });
    expect(res.status).toBe(400);
  });

  it('POST /prediction/explain returns 200 with top_features', async () => {
    mockPredictionService.explain.mockResolvedValue({
      top_features: ['community_overlap', 'feature_score'],
    });

    const res = await request(app.getHttpServer())
      .post('/prediction/explain')
      .send({
        source: '00000000-0000-0000-0000-000000000001',
        target: '00000000-0000-0000-0000-000000000002',
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.data.top_features)).toBe(true);
  });

  it('returns 404 when PredictionService throws NotFoundException', async () => {
    mockPredictionService.predictLink.mockRejectedValue(
      new NotFoundException("Node 'abc' not found"),
    );

    const res = await request(app.getHttpServer())
      .post('/prediction/link')
      .send({
        source: '00000000-0000-0000-0000-000000000001',
        target: '00000000-0000-0000-0000-000000000002',
        relation_type: 'ENROLLED',
      });

    expect(res.status).toBe(404);
  });
});

describe('PredictionController (auth integration)', () => {
  let app: INestApplication;

  const mockAuthService = {
    validateKey: jest.fn().mockResolvedValue(null),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionController],
      providers: [
        { provide: PredictionService, useValue: mockPredictionService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: APP_GUARD, useClass: ApiKeyGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('returns 401 when no API key is provided', async () => {
    const res = await request(app.getHttpServer())
      .post('/prediction/link')
      .send({
        source: '00000000-0000-0000-0000-000000000001',
        target: '00000000-0000-0000-0000-000000000002',
        relation_type: 'ENROLLED',
      });

    expect(res.status).toBe(401);
  });
});
