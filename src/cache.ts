import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

interface CacheRow {
  cache_key: string;
  payload_json: string;
  fetched_at_utc: string;
  expires_at_utc: string;
}

export class CacheStore {
  private db!: Database;

  public constructor(private readonly dbPath: string) {}

  public async init(): Promise<void> {
    await mkdir(path.dirname(this.dbPath), { recursive: true });
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS api_cache (
        cache_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        fetched_at_utc TEXT NOT NULL,
        expires_at_utc TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS games (
        game_id INTEGER PRIMARY KEY,
        title TEXT,
        console_name TEXT,
        image_icon TEXT,
        payload_json TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS achievements (
        achievement_id INTEGER PRIMARY KEY,
        game_id INTEGER,
        title TEXT,
        points INTEGER,
        type TEXT,
        payload_json TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_game_progress (
        username TEXT NOT NULL,
        game_id INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL,
        PRIMARY KEY (username, game_id)
      );

      CREATE TABLE IF NOT EXISTS user_achievement_unlocks (
        username TEXT NOT NULL,
        achievement_id INTEGER NOT NULL,
        game_id INTEGER,
        unlocked_at_utc TEXT,
        payload_json TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL,
        PRIMARY KEY (username, achievement_id)
      );
    `);
  }

  public async getCached<T>(cacheKey: string): Promise<T | null> {
    const row = await this.db.get<CacheRow>(
      `SELECT cache_key, payload_json, fetched_at_utc, expires_at_utc FROM api_cache WHERE cache_key = ?`,
      cacheKey,
    );
    if (!row) {
      return null;
    }

    const isExpired = new Date(row.expires_at_utc).getTime() <= Date.now();
    if (isExpired) {
      return null;
    }

    return JSON.parse(row.payload_json) as T;
  }

  public async putCached<T>(cacheKey: string, payload: T, ttlSeconds: number): Promise<void> {
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + ttlSeconds * 1000);

    await this.db.run(
      `INSERT INTO api_cache (cache_key, payload_json, fetched_at_utc, expires_at_utc)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         fetched_at_utc = excluded.fetched_at_utc,
         expires_at_utc = excluded.expires_at_utc`,
      cacheKey,
      JSON.stringify(payload),
      fetchedAt.toISOString(),
      expiresAt.toISOString(),
    );
  }

  public async upsertGame(gameId: number, payload: unknown): Promise<void> {
    const title = this.pickText(payload, ['Title', 'GameTitle']);
    const consoleName = this.pickText(payload, ['ConsoleName']);
    const imageIcon = this.pickText(payload, ['ImageIcon']);

    await this.db.run(
      `INSERT INTO games (game_id, title, console_name, image_icon, payload_json, updated_at_utc)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(game_id) DO UPDATE SET
         title = excluded.title,
         console_name = excluded.console_name,
         image_icon = excluded.image_icon,
         payload_json = excluded.payload_json,
         updated_at_utc = excluded.updated_at_utc`,
      gameId,
      title,
      consoleName,
      imageIcon,
      JSON.stringify(payload),
      new Date().toISOString(),
    );
  }

  public async upsertUserProgress(username: string, gameId: number, payload: unknown): Promise<void> {
    await this.db.run(
      `INSERT INTO user_game_progress (username, game_id, payload_json, updated_at_utc)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(username, game_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         updated_at_utc = excluded.updated_at_utc`,
      username,
      gameId,
      JSON.stringify(payload),
      new Date().toISOString(),
    );
  }

  public async upsertAchievements(gameId: number, payload: unknown): Promise<void> {
    const candidates = this.extractAchievementArray(payload);
    const now = new Date().toISOString();

    for (const achievement of candidates) {
      const achievementId = Number(achievement?.ID ?? achievement?.AchievementID ?? 0);
      if (!Number.isFinite(achievementId) || achievementId <= 0) {
        continue;
      }

      const title = String(achievement?.Title ?? achievement?.Name ?? '');
      const points = Number(achievement?.Points ?? 0);
      const type = String(achievement?.Type ?? '');

      await this.db.run(
        `INSERT INTO achievements (achievement_id, game_id, title, points, type, payload_json, updated_at_utc)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(achievement_id) DO UPDATE SET
           game_id = excluded.game_id,
           title = excluded.title,
           points = excluded.points,
           type = excluded.type,
           payload_json = excluded.payload_json,
           updated_at_utc = excluded.updated_at_utc`,
        achievementId,
        gameId,
        title,
        Number.isFinite(points) ? points : 0,
        type,
        JSON.stringify(achievement),
        now,
      );
    }
  }

  private pickText(payload: unknown, keys: string[]): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    for (const key of keys) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return null;
  }

  private extractAchievementArray(payload: unknown): Array<Record<string, unknown>> {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const asRecord = payload as Record<string, unknown>;

    if (Array.isArray(asRecord.Achievements)) {
      return asRecord.Achievements.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
    }

    if (asRecord.Achievements && typeof asRecord.Achievements === 'object') {
      return Object.values(asRecord.Achievements as Record<string, unknown>).filter(
        (x): x is Record<string, unknown> => !!x && typeof x === 'object',
      );
    }

    if (Array.isArray(payload)) {
      return payload.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
    }

    return [];
  }
}
