import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeCacheKey,
  getCachedResponse,
  setCachedResponse,
  checkIpLimit,
  recordLiveCall,
  getTodayLiveCallStats,
  isDailyCapExceeded,
  clearCache,
} from '../lib/agents/cache';

describe('Agent Cache & Rate Limiter (Step 12 Tests)', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('Response Cache', () => {
    it('computes deterministic SHA-256 hash regardless of object key ordering', () => {
      const key1 = computeCacheKey('triage', 'v1.0.0', { a: 1, b: 2 });
      const key2 = computeCacheKey('triage', 'v1.0.0', { b: 2, a: 1 });
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64);
    });

    it('stores and retrieves cached entries within 24 hours', () => {
      const context = { machine_id: 'P01-M01', reading: 42 };
      setCachedResponse('triage', 'v1.0.0', context, { is_alert: true }, 'direct', 'gemini-test');

      const cached = getCachedResponse('triage', 'v1.0.0', context);
      expect(cached).not.toBeNull();
      expect(cached?.data.is_alert).toBe(true);
      expect(cached?.provider).toBe('direct');
      expect(cached?.model).toBe('gemini-test');
    });

    it('returns null on cache miss', () => {
      const missing = getCachedResponse('copilot', 'v1.0.0', { query: 'unknown' });
      expect(missing).toBeNull();
    });
  });

  describe('Per-IP Rate Limiting (10 calls/hour)', () => {
    it('allows up to 10 live calls within the hour window', () => {
      const testIp = '192.168.1.100';
      for (let i = 0; i < 10; i++) {
        const check = checkIpLimit(testIp);
        expect(check.allowed).toBe(true);
        recordLiveCall(testIp);
      }

      // 11th call should be blocked
      const checkBlocked = checkIpLimit(testIp);
      expect(checkBlocked.allowed).toBe(false);
      expect(checkBlocked.remaining).toBe(0);
    });

    it('bypasses rate limit for localhost and unknown IPs', () => {
      for (let i = 0; i < 20; i++) {
        expect(checkIpLimit('127.0.0.1').allowed).toBe(true);
        expect(checkIpLimit('::1').allowed).toBe(true);
        expect(checkIpLimit('unknown').allowed).toBe(true);
      }
    });
  });

  describe('Global Daily Cap (LIVE_AGENT_DAILY_CAP)', () => {
    it('tracks live call count correctly today', () => {
      const initial = getTodayLiveCallStats();
      expect(initial.todayCalls).toBe(0);

      recordLiveCall();
      recordLiveCall();

      const updated = getTodayLiveCallStats();
      expect(updated.todayCalls).toBe(2);
      expect(updated.dailyCap).toBeGreaterThanOrEqual(10);
    });

    it('reports exceeded when daily cap is hit', () => {
      const stats = getTodayLiveCallStats();
      const cap = stats.dailyCap;

      for (let i = 0; i < cap; i++) {
        recordLiveCall();
      }

      const exceededCheck = isDailyCapExceeded();
      expect(exceededCheck.exceeded).toBe(true);
    });
  });
});
