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
 * Logs the underlying Supabase error to the server console whenever fallback triggers.
 * Never throws a raw error or exposes raw database errors in the UI.
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
    // Keys missing - silent fallback to seed data without raising error alert
    markDatabaseUnavailable('Supabase keys missing');
    return fallbackFn();
  }

  try {
    const result = await withTimeout(queryFn(client), 5000, context);

    if (result.error) {
      // Log underlying error to server console (never shown to UI)
      console.error(`[DataLayer Supabase Error] ${context}:`, {
        message: result.error?.message,
        details: result.error?.details,
        hint: result.error?.hint,
        code: result.error?.code,
      });
      markDatabaseUnavailable(result.error?.message || 'Database query error');
      tripDbCircuit(20000);
      return fallbackFn();
    }

    markDatabaseAvailable();
    resetDbCircuit();
    return result.data as T;
  } catch (err: any) {
    // Log timeout or network exception to server console
    console.error(`[DataLayer Supabase Exception] ${context}:`, err?.message || err);
    markDatabaseUnavailable(err?.message || 'Database unavailable');
    tripDbCircuit(20000);
    return fallbackFn();
  }
}
