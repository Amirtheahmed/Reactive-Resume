import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

@Injectable()
export class AICacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AICacheService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly cacheDir = join(process.cwd(), ".cache", "ai");
  private readonly cacheFile = join(this.cacheDir, "cache.json");
  private readonly defaultTTLMs = 24 * 60 * 60 * 1000;

  private get isEnabled(): boolean {
    return process.env.AI_CACHE_ENABLED !== "false";
  }

  private get persistEnabled(): boolean {
    return process.env.AI_CACHE_PERSIST !== "false";
  }

  onModuleInit() {
    if (this.isEnabled && this.persistEnabled) {
      this.loadFromDisk();
    }
    this.logger.log(`AI Cache ${this.isEnabled ? "enabled" : "disabled"}`);
  }

  onModuleDestroy() {
    if (this.isEnabled && this.persistEnabled) {
      this.saveToDisk();
    }
  }

  generateKey(operation: string, userId: string, inputs: Record<string, unknown>): string {
    const payload = JSON.stringify({ operation, userId, inputs });
    return createHash("sha256").update(payload).digest("hex");
  }

  get<T>(key: string): T | null {
    if (!this.isEnabled) return null;

    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache HIT: ${key.slice(0, 16)}...`);
    return entry.data;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTLMs): void {
    if (!this.isEnabled) return;

    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    this.logger.debug(`Cache SET: ${key.slice(0, 16)}...`);

    if (this.persistEnabled) {
      this.saveToDisk();
    }
  }

  clear(pattern?: string): number {
    let cleared = 0;

    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          cleared++;
        }
      }
    } else {
      cleared = this.cache.size;
      this.cache.clear();
    }

    if (this.persistEnabled) {
      this.saveToDisk();
    }

    this.logger.log(`Cache cleared: ${cleared} entries`);
    return cleared;
  }

  getStats(): { size: number; enabled: boolean; persistEnabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.isEnabled,
      persistEnabled: this.persistEnabled,
    };
  }

  private loadFromDisk(): void {
    try {
      if (existsSync(this.cacheFile)) {
        const data = readFileSync(this.cacheFile, "utf8");
        const entries = JSON.parse(data) as [string, CacheEntry<unknown>][];
        const now = Date.now();

        for (const [key, entry] of entries) {
          if (now - entry.timestamp < entry.ttl) {
            this.cache.set(key, entry);
          }
        }

        this.logger.log(`Loaded ${this.cache.size} cache entries from disk`);
      }
    } catch {
      this.logger.warn("Failed to load cache from disk");
    }
  }

  private saveToDisk(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }

      const entries = [...this.cache.entries()];
      writeFileSync(this.cacheFile, JSON.stringify(entries), "utf8");
    } catch {
      this.logger.warn("Failed to save cache to disk");
    }
  }
}
