import crypto from 'crypto';
import { AgentType, AgentProviderName } from './types';

export interface CachedEntry {
  data: any;
  provider: AgentProviderName;
  model?: string;
  timestamp: number;
  expiresAt: number;
}

// In-memory response cache: hash -> CachedEntry
const responseCache = new Map<string, CachedEntry>();

// Per-IP rate limiting: IP -> timestamps[] of live calls in last hour
const ipCallTimestamps = new Map<string, number[]>();

export function getClientIpFromHeaders(headers: any): string {
  if (!headers) return 'unknown';
  let forwarded = '';
  if (typeof headers.get === 'function') {
    forwarded = headers.get('x-forwarded-for') || headers.get('x-real-ip') || '';
  } else {
    forwarded = headers['x-forwarded-for'] || headers['x-real-ip'] || '';
  }
  if (Array.isArray(forwarded)) forwarded = forwarded[0];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

// Global daily cap tracking
let dailyCallCount = 0;
let currentDayKey = new Date().toISOString().slice(0, 10);

export function getDailyCap(): number {
  const envCap = process.env.LIVE_AGENT_DAILY_CAP;
  if (envCap) {
    const parsed = parseInt(envCap, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 150;
}

export function getTodayLiveCallStats() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDayKey) {
    dailyCallCount = 0;
    currentDayKey = today;
  }
  return {
    todayCalls: dailyCallCount,
    dailyCap: getDailyCap(),
    isCapped: dailyCallCount >= getDailyCap(),
  };
}

export function recordLiveCall(ip?: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDayKey) {
    dailyCallCount = 0;
    currentDayKey = today;
  }
  dailyCallCount++;

  if (ip) {
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;
    const timestamps = (ipCallTimestamps.get(ip) || []).filter((t) => t > windowStart);
    timestamps.push(now);
    ipCallTimestamps.set(ip, timestamps);
  }
}

export function checkIpLimit(ip?: string): { allowed: boolean; remaining: number } {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') {
    return { allowed: true, remaining: 10 };
  }
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const timestamps = (ipCallTimestamps.get(ip) || []).filter((t) => t > windowStart);
  ipCallTimestamps.set(ip, timestamps);

  const maxPerHour = 10;
  if (timestamps.length >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: maxPerHour - timestamps.length };
}

/**
 * Computes deterministic SHA-256 hash for agent + prompt_version + context
 */
export function computeCacheKey(agent: AgentType, promptVersion: string, context: any): string {
  function stableStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
  }

  const raw = `${agent}:${promptVersion}:${stableStringify(context || {})}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Retrieves valid cached response if not expired (reused 24 hours)
 */
export function getCachedResponse(agent: AgentType, promptVersion: string, context: any): CachedEntry | null {
  const key = computeCacheKey(agent, promptVersion, context);
  const entry = responseCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry;
}

/**
 * Stores validated agent response in 24-hour cache
 */
export function setCachedResponse(
  agent: AgentType,
  promptVersion: string,
  context: any,
  data: any,
  provider: AgentProviderName,
  model?: string
): void {
  const key = computeCacheKey(agent, promptVersion, context);
  const now = Date.now();
  responseCache.set(key, {
    data,
    provider,
    model,
    timestamp: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  });
}

/**
 * Resets cache and counters (useful in tests)
 */
export function clearCache(): void {
  responseCache.clear();
  ipCallTimestamps.clear();
  dailyCallCount = 0;
}
