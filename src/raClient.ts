import { CacheStore } from './cache.js';

export class RetroAchievementsClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly apiKey: string,
    private readonly cache: CacheStore,
  ) {}

  public async searchGames(query: string, forceRefresh: boolean, ttlSeconds: number): Promise<unknown> {
    const cacheKey = `search:${query.toLowerCase()}`;
    return this.getOrFetch(cacheKey, ttlSeconds, forceRefresh, () => this.get('API_GetGameList.php', { g: query }));
  }

  public async getGame(gameId: number, forceRefresh: boolean, ttlSeconds: number): Promise<unknown> {
    const cacheKey = `game:${gameId}`;
    const payload = await this.getOrFetch(cacheKey, ttlSeconds, forceRefresh, () => this.get('API_GetGame.php', { i: gameId }));
    await this.cache.upsertGame(gameId, payload);
    return payload;
  }

  public async getGameAchievements(gameId: number, forceRefresh: boolean, ttlSeconds: number): Promise<unknown> {
    const cacheKey = `game_extended:${gameId}`;
    const payload = await this.getOrFetch(cacheKey, ttlSeconds, forceRefresh, () =>
      this.get('API_GetGameExtended.php', { i: gameId }),
    );
    await this.cache.upsertAchievements(gameId, payload);
    return payload;
  }

  public async getUserRecentlyPlayed(username: string, count: number, forceRefresh: boolean, ttlSeconds: number): Promise<unknown> {
    const cacheKey = `user_recent:${username.toLowerCase()}:${count}`;
    return this.getOrFetch(cacheKey, ttlSeconds, forceRefresh, () =>
      this.get('API_GetUserRecentlyPlayedGames.php', { u: username, c: count }),
    );
  }

  public async getUserProgress(username: string, gameId: number, forceRefresh: boolean, ttlSeconds: number): Promise<unknown> {
    const cacheKey = `user_progress:${username.toLowerCase()}:${gameId}`;
    const payload = await this.getOrFetch(cacheKey, ttlSeconds, forceRefresh, () =>
      this.get('API_GetGameInfoAndUserProgress.php', { u: username, g: gameId }),
    );
    await this.cache.upsertUserProgress(username, gameId, payload);
    return payload;
  }

  private async getOrFetch<T>(
    cacheKey: string,
    ttlSeconds: number,
    forceRefresh: boolean,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = await this.cache.getCached<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const fresh = await fetcher();
    await this.cache.putCached(cacheKey, fresh, ttlSeconds);
    return fresh;
  }

  private async get(endpoint: string, params: Record<string, string | number>): Promise<unknown> {
    const url = new URL(endpoint, this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`);

    url.searchParams.set('z', this.username);
    url.searchParams.set('y', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RetroAchievements API request failed (${response.status}): ${body}`);
    }

    return response.json();
  }
}
