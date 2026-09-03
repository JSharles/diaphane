import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { GithubConnectionService } from '../auth/github-connection.service';
import { GithubOauthClient } from '../auth/github-oauth.client';
import { InvitationAcceptanceController } from '../invitations/invitation-acceptance.controller';
import { InvitationsService } from '../invitations/invitations.service';
import { GLOBAL_RATE_LIMIT, SENSITIVE_RATE_LIMIT } from './rate-limit.config';
import { RateLimitModule } from './rate-limit.module';

const fakeUser = {
  id: 'user-1',
  email: 'client@example.com',
  passwordHash: 'hashed',
  accountKind: 'client',
};

// The rate limit is observed where an attacker would meet it: at the HTTP
// boundary, with the real controllers and their decorators, and the services
// replaced so no password is ever verified.
describe('rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [
        AppController,
        AuthController,
        InvitationAcceptanceController,
      ],
      providers: [
        { provide: AppService, useValue: { getHello: () => 'Hello World!' } },
        {
          provide: AuthService,
          useValue: {
            login: jest
              .fn()
              .mockResolvedValue({ user: fakeUser, sessionId: 'session-1' }),
          },
        },
        { provide: GithubOauthClient, useValue: {} },
        { provide: GithubConnectionService, useValue: {} },
        {
          provide: InvitationsService,
          useValue: {
            getByToken: jest.fn().mockResolvedValue({
              email: 'client@example.com',
              projectTitle: 'Site vitrine',
              accountExists: false,
              status: 'invited',
            }),
            accept: jest
              .fn()
              .mockResolvedValue({ user: fakeUser, sessionId: 'session-1' }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    // Same setting as main.ts: the client address is the one the proxy
    // forwards, which is what lets the test speak from several addresses.
    (app as NestExpressApplication).set('trust proxy', true);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const hit = (method: 'get' | 'post', path: string, ip = '203.0.113.1') =>
    request(app.getHttpServer() as Server)
      [method](path)
      .set('X-Forwarded-For', ip)
      .send(method === 'post' ? { password: 'supersecret123' } : undefined);

  async function exhaust(method: 'get' | 'post', path: string, limit: number) {
    for (let i = 0; i < limit; i += 1) {
      const res = await hit(method, path);
      expect(res.status).toBe(200);
    }
    return hit(method, path);
  }

  it.each([
    ['POST /auth/login', 'post', '/auth/login'],
    ['GET /invitations/:token', 'get', '/invitations/some-token'],
    [
      'POST /invitations/:token/accept',
      'post',
      '/invitations/some-token/accept',
    ],
  ] as const)(
    '%s answers 429 once the same address exceeds the sensitive limit',
    async (_label, method, path) => {
      const blocked = await exhaust(method, path, SENSITIVE_RATE_LIMIT.limit);

      expect(blocked.status).toBe(429);
      expect(blocked.body).toEqual({
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
        message: expect.stringContaining('Too many requests'),
        retryAfterSeconds: expect.any(Number),
      });
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    },
  );

  it('counts each address separately', async () => {
    await exhaust('post', '/auth/login', SENSITIVE_RATE_LIMIT.limit);

    const other = await hit('post', '/auth/login', '203.0.113.2');

    expect(other.status).toBe(200);
  });

  it('applies the global limit to every other route', async () => {
    expect(GLOBAL_RATE_LIMIT.limit).toBeGreaterThan(SENSITIVE_RATE_LIMIT.limit);

    const blocked = await exhaust('get', '/', GLOBAL_RATE_LIMIT.limit);

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('TOO_MANY_REQUESTS');
  });
});
