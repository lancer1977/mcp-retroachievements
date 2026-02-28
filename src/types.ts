export interface RaRequestOptions {
  forceRefresh?: boolean;
}

export interface CachedApiPayload<T = unknown> {
  cacheKey: string;
  fetchedAtUtc: string;
  expiresAtUtc: string;
  data: T;
}

export interface CacheTtlConfig {
  gamesSeconds: number;
  achievementsSeconds: number;
  userProgressSeconds: number;
  userRecentSeconds: number;
}

export const CacheTtlDefaults: CacheTtlConfig = {
  gamesSeconds: 60 * 60 * 12,
  achievementsSeconds: 60 * 60 * 12,
  userProgressSeconds: 60 * 10,
  userRecentSeconds: 60 * 5,
};
