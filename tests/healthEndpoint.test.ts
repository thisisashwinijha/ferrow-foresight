import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { GET } from '../app/api/health/route';

describe('/api/health endpoint', () => {
  it('returns ok, database, and valid ISO timestamp without secrets', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('ok');
    expect(typeof data.ok).toBe('boolean');
    expect(data).toHaveProperty('database');
    expect(['connected', 'seed', 'error']).toContain(data.database);
    expect(data).toHaveProperty('time');
    expect(new Date(data.time).toString()).not.toBe('Invalid Date');

    // Verify no secret leak
    const jsonStr = JSON.stringify(data);
    expect(jsonStr).not.toContain('key');
    expect(jsonStr).not.toContain('secret');
    expect(jsonStr).not.toContain('supabase.co');
  });
});
