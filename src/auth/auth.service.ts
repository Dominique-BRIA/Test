import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async generateKey(workspaceId: string, name: string): Promise<string> {
    const rawKey = crypto.randomBytes(32).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    await this.prisma.apiKey.create({
      data: { workspace_id: workspaceId, key_hash: keyHash, name },
    });
    return rawKey;
  }

  async validateKey(rawKey: string): Promise<{ workspaceId: string } | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { key_hash: keyHash, revoked: false },
    });
    if (!apiKey) return null;
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date() },
    });
    return { workspaceId: apiKey.workspace_id };
  }

  async revokeKey(keyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true },
    });
  }
}
