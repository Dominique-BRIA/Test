import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { Driver, Session } from 'neo4j-driver';
import { NEO4J_DRIVER } from '../config/neo4j.provider';
import { PrismaService } from '../prisma/prisma.service';

interface KafkaGraphMessage {
  version: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'node' | 'edge';
  payload: Record<string, unknown>;
}

@Injectable()
export class KafkaSyncService implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(NEO4J_DRIVER) private readonly neo4j: Driver,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.VERCEL) {
      console.log('[KafkaSyncService] Running on Vercel — skipping Kafka consumer initialization.');
      return;
    }

    const broker = this.configService.get<string>('KAFKA_BROKER');
    if (!broker) {
      console.warn('[KafkaSyncService] KAFKA_BROKER not set — sync disabled.');
      return;
    }

    try {
      const kafka = new Kafka({
        clientId: 'yow-linker',
        brokers: [broker],
        retry: { retries: 5 },
      });
      this.consumer = kafka.consumer({ groupId: 'graph-sync' });
      await this.consumer.connect();
      await this.consumer.subscribe({ topics: ['graph.changes'], fromBeginning: false });
      void this.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          const msg = JSON.parse(message.value.toString()) as KafkaGraphMessage;
          await this.handleMessage(msg);
        },
      });
    } catch (err) {
      console.warn('[KafkaSyncService] Failed to connect to Kafka — sync disabled:', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private async handleMessage(msg: KafkaGraphMessage): Promise<void> {
    try {
      await this.withRetry(() => this.applyToNeo4j(msg));
    } catch (err) {
      await this.prisma.deadLetterQueue.create({
        data: {
          operation: msg.operation,
          entity: msg.entity,
          payload: msg.payload as object,
          error: String(err),
        },
      });
    }
  }

  private async applyToNeo4j(msg: KafkaGraphMessage): Promise<void> {
    const session: Session = this.neo4j.session();
    const p = msg.payload;
    try {
      if (msg.entity === 'node') {
        if (msg.operation === 'CREATE' || msg.operation === 'UPDATE') {
          await session.run(
            'MERGE (n:Node {id: $id}) SET n += $attributes, n.type = $type',
            { id: p['id'], attributes: p['attributes'] ?? {}, type: p['type'] },
          );
        } else if (msg.operation === 'DELETE') {
          await session.run('MATCH (n {id: $id}) DETACH DELETE n', { id: p['id'] });
        }
      } else if (msg.entity === 'edge') {
        if (msg.operation === 'CREATE') {
          const relType = String(p['type'] ?? '').replace(/[^A-Z0-9_]/g, '').toUpperCase();
          if (!relType) return;
          await session.run(
            `MATCH (a:Node {id: $source}), (b:Node {id: $target})
             MERGE (a)-[r:\`${relType}\`]->(b)
             SET r.weight = $weight`,
            { source: p['source_id'], target: p['target_id'], weight: p['weight'] ?? 1 },
          );
        } else if (msg.operation === 'DELETE') {
          await session.run('MATCH ()-[r {id: $id}]->() DELETE r', { id: p['id'] });
        }
      }
    } finally {
      await session.close();
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
      }
    }
    throw lastErr;
  }
}
