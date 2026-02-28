#!/usr/bin/env node
import 'dotenv/config';

import { resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { CacheStore } from './cache.js';
import { RetroAchievementsClient } from './raClient.js';
import { CacheTtlDefaults } from './types.js';

const requiredEnv = ['RA_USERNAME', 'RA_API_KEY'] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required. Copy .env.example to .env and provide values.`);
  }
}

const ttlGames = Number(process.env.CACHE_TTL_GAMES_SECONDS ?? CacheTtlDefaults.gamesSeconds);
const ttlAchievements = Number(process.env.CACHE_TTL_ACHIEVEMENTS_SECONDS ?? CacheTtlDefaults.achievementsSeconds);
const ttlUserProgress = Number(process.env.CACHE_TTL_USER_PROGRESS_SECONDS ?? CacheTtlDefaults.userProgressSeconds);
const ttlUserRecent = Number(process.env.CACHE_TTL_USER_RECENT_SECONDS ?? CacheTtlDefaults.userRecentSeconds);

const dbPath = resolve(process.cwd(), process.env.CACHE_DB_PATH ?? './data/retroachievements.sqlite');
const cache = new CacheStore(dbPath);
await cache.init();

const raClient = new RetroAchievementsClient(
  process.env.RA_BASE_URL ?? 'https://retroachievements.org/API',
  process.env.RA_USERNAME as string,
  process.env.RA_API_KEY as string,
  cache,
);

const server = new Server(
  { name: 'retroachievements-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'ra_search_games',
      description: 'Search RetroAchievements games by title.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          forceRefresh: { type: 'boolean' },
        },
        required: ['query'],
      },
    },
    {
      name: 'ra_get_game',
      description: 'Get game metadata by RetroAchievements game id.',
      inputSchema: {
        type: 'object',
        properties: {
          gameId: { type: 'number' },
          forceRefresh: { type: 'boolean' },
        },
        required: ['gameId'],
      },
    },
    {
      name: 'ra_get_game_achievements',
      description: 'Get extended game payload including achievements.',
      inputSchema: {
        type: 'object',
        properties: {
          gameId: { type: 'number' },
          forceRefresh: { type: 'boolean' },
        },
        required: ['gameId'],
      },
    },
    {
      name: 'ra_get_user_recently_played',
      description: 'Get recently played RetroAchievements games for a user.',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          count: { type: 'number' },
          forceRefresh: { type: 'boolean' },
        },
        required: ['username'],
      },
    },
    {
      name: 'ra_get_user_progress',
      description: 'Get user progress for a game.',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          gameId: { type: 'number' },
          forceRefresh: { type: 'boolean' },
        },
        required: ['username', 'gameId'],
      },
    },
    {
      name: 'ra_sync_game',
      description: 'Force refresh game metadata + achievement payload.',
      inputSchema: {
        type: 'object',
        properties: {
          gameId: { type: 'number' },
        },
        required: ['gameId'],
      },
    },
    {
      name: 'ra_sync_user',
      description: 'Force refresh user recent + per-game progress for a single game.',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          gameId: { type: 'number' },
          count: { type: 'number' },
        },
        required: ['username'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};

  try {
    switch (request.params.name) {
      case 'ra_search_games': {
        const query = expectString(args.query, 'query');
        const forceRefresh = Boolean(args.forceRefresh ?? false);
        const payload = await raClient.searchGames(query, forceRefresh, ttlGames);
        return asText(payload);
      }
      case 'ra_get_game': {
        const gameId = expectNumber(args.gameId, 'gameId');
        const forceRefresh = Boolean(args.forceRefresh ?? false);
        const payload = await raClient.getGame(gameId, forceRefresh, ttlGames);
        return asText(payload);
      }
      case 'ra_get_game_achievements': {
        const gameId = expectNumber(args.gameId, 'gameId');
        const forceRefresh = Boolean(args.forceRefresh ?? false);
        const payload = await raClient.getGameAchievements(gameId, forceRefresh, ttlAchievements);
        return asText(payload);
      }
      case 'ra_get_user_recently_played': {
        const username = expectString(args.username, 'username');
        const count = args.count === undefined ? 10 : expectNumber(args.count, 'count');
        const forceRefresh = Boolean(args.forceRefresh ?? false);
        const payload = await raClient.getUserRecentlyPlayed(username, count, forceRefresh, ttlUserRecent);
        return asText(payload);
      }
      case 'ra_get_user_progress': {
        const username = expectString(args.username, 'username');
        const gameId = expectNumber(args.gameId, 'gameId');
        const forceRefresh = Boolean(args.forceRefresh ?? false);
        const payload = await raClient.getUserProgress(username, gameId, forceRefresh, ttlUserProgress);
        return asText(payload);
      }
      case 'ra_sync_game': {
        const gameId = expectNumber(args.gameId, 'gameId');
        const game = await raClient.getGame(gameId, true, ttlGames);
        const achievements = await raClient.getGameAchievements(gameId, true, ttlAchievements);
        return asText({ game, achievements, synced: true });
      }
      case 'ra_sync_user': {
        const username = expectString(args.username, 'username');
        const count = args.count === undefined ? 10 : expectNumber(args.count, 'count');
        const recent = await raClient.getUserRecentlyPlayed(username, count, true, ttlUserRecent);
        let progress: unknown = null;
        if (args.gameId !== undefined) {
          progress = await raClient.getUserProgress(username, expectNumber(args.gameId, 'gameId'), true, ttlUserProgress);
        }
        return asText({ recent, progress, synced: true });
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    };
  }
});

server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('RetroAchievements MCP server running on stdio');

function asText(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function expectString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new McpError(ErrorCode.InvalidParams, `${name} must be a non-empty string`);
  }
  return value;
}

function expectNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${name} must be a number`);
  }
  return value;
}
