import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { RoomHotState } from '@sujia/shared';

/**
 * Hot room state: Redis when REDIS_URL is reachable, else in-memory Map.
 * Local demo works with Nest alone (no Redis required).
 */
@Injectable()
export class RoomStore implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RoomStore.name);
  private readonly memory = new Map<string, RoomHotState>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null;
  private useRedis = false;
  private readonly ttlSec = 60 * 60;

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.log.log('REDIS_URL unset — using in-memory room store');
      return;
    }
    try {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 1500,
        retryStrategy: () => null,
      });
      client.on('error', (err: Error) => {
        this.log.warn(`Redis error: ${String(err.message || err)}`);
        this.useRedis = false;
      });
      await Promise.race([
        client.ping(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('ping timeout')), 2000)),
      ]);
      this.redis = client;
      this.useRedis = true;
      this.log.log('Redis connected — hot room state on Redis');
    } catch (e) {
      this.log.warn(`Redis unavailable, using in-memory Map: ${String(e)}`);
      try {
        this.redis?.disconnect?.();
      } catch {
        /* ignore */
      }
      this.redis = null;
      this.useRedis = false;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        /* ignore */
      }
    }
  }

  private key(code: string) {
    return `room:${code.toUpperCase()}`;
  }

  async get(code: string): Promise<RoomHotState | null> {
    const c = code.toUpperCase();
    if (this.useRedis && this.redis) {
      try {
        const raw = await this.redis.get(this.key(c));
        if (raw) return JSON.parse(raw) as RoomHotState;
      } catch (e) {
        this.log.warn(`Redis get failed: ${String(e)}`);
        this.useRedis = false;
      }
    }
    return this.memory.get(c) ?? null;
  }

  async set(state: RoomHotState): Promise<void> {
    const c = state.code.toUpperCase();
    state.code = c;
    this.memory.set(c, state);
    if (this.useRedis && this.redis) {
      try {
        await this.redis.set(this.key(c), JSON.stringify(state), 'EX', this.ttlSec);
      } catch (e) {
        this.log.warn(`Redis set failed: ${String(e)}`);
        this.useRedis = false;
      }
    }
  }

  async delete(code: string): Promise<void> {
    const c = code.toUpperCase();
    this.memory.delete(c);
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(this.key(c));
      } catch {
        /* ignore */
      }
    }
  }

  backend(): 'redis' | 'memory' {
    return this.useRedis ? 'redis' : 'memory';
  }
}
