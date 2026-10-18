/**
 * Global database availability state.
 * If Supabase errors, times out, or keys are missing, we fall back to seed data.
 */

let isLiveDatabaseUnavailable = false;
let databaseErrorReason = '';

export function getDatabaseState() {
  return {
    isUnavailable: isLiveDatabaseUnavailable,
    reason: databaseErrorReason,
  };
}

export function markDatabaseUnavailable(reason: string) {
  isLiveDatabaseUnavailable = true;
  databaseErrorReason = reason;
}

export function markDatabaseAvailable() {
  isLiveDatabaseUnavailable = false;
  databaseErrorReason = '';
}
