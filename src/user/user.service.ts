import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(email: string, password: string): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = this.hashPassword(password);
    return this.prisma.user.create({
      data: { email, password_hash: passwordHash },
      select: { id: true, email: true },
    });
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!this.verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { raw, hash } = this.generateToken();
    await this.prisma.userSession.create({
      data: {
        user_id: user.id,
        token_hash: hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return raw;
  }

  async validateSession(rawToken: string): Promise<{ userId: string; email: string } | null> {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const session = await this.prisma.userSession.findFirst({
      where: { token_hash: hash, expires_at: { gt: new Date() } },
      include: { user: true },
    });
    if (!session) return null;
    return { userId: session.user_id, email: session.user.email };
  }

  async revokeSession(rawToken: string): Promise<void> {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.userSession.deleteMany({ where: { token_hash: hash } });
  }

  private hashPassword(password: string, salt?: string): string {
    const s = salt ?? randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, s, 100_000, 64, 'sha512').toString('hex');
    return `${s}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const colonIdx = stored.indexOf(':');
    if (colonIdx === -1) return false;
    const salt = stored.slice(0, colonIdx);
    const computed = this.hashPassword(password, salt);
    if (computed.length !== stored.length) return false;
    try {
      return timingSafeEqual(Buffer.from(computed), Buffer.from(stored));
    } catch {
      return false;
    }
  }

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }
}
