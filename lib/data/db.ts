import { getSupabaseBrowserClient, withTimeout } from '../supabase';
import { getLocalStoreData } from './localStore';
import { markDatabaseAvailable, markDatabaseUnavailable } from './dbState';
import { SupabaseClient } from '@supabase/supabase-js';

let unavailableUntil = 0;

export function isDbCircuitOpen(): boolean {
  return Date.now() < unavailableUntil;
}

export function tripDbCircuit(cooldownMs = 20000) {
  unavailableUntil = Date.now() + cooldownMs;
}

export function resetDbCircuit() {
  unavailableUntil = 0;
}

export function getSeedData() {
  return getLocalStoreData();
}

/**
 * Executes a Supabase query with 5-second timeout resilience and circuit breaker.
 * On any failure, timeout, or missing client, gracefully falls back to seed data.
 * Never throws a raw error.
 */
export async function queryWithFallback<T>(
  queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
  fallbackFn: () => T,
  context = 'query'
): Promise<T> {
  // If circuit breaker is open (recent failure/timeout), return fallback immediately
  if (isDbCircuitOpen()) {
    return fallbackFn();
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    markDatabaseUnavailable('Supabase keys missing');
    tripDbCircuit(60000);
    return fallbackFn();
  }

  try {
    const result = await withTimeout(queryFn(client), 5000, context);
    if (result.error || result.data === null) {
      console.warn(`[DataLayer] Supabase error in ${context}:`, result.error?.message || 'Null data returned');
      markDatabaseUnavailable(result.error?.message || 'Database returned error');
      tripDbCircuit(20000);
      return fallbackFn();
    }
    markDatabaseAvailable();
    resetDbCircuit();
    return result.data;
  } catch (err: any) {
    console.warn(`[DataLayer] Database exception or timeout in ${context}:`, err?.message);
    markDatabaseUnavailable(err?.message || 'Database unavailable');
    tripDbCircuit(20000);
    return fallbackFn();
  }
}
