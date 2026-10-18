import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

import { POST, OPTIONS } from '@/app/api/agent/route';

describe('Public /api/agent endpoint', () => {
  it('handles OPTIONS preflight with CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('rejects payloads exceeding 50 KB with 413', async () => {
    const largeContext = 'x'.repeat(55 * 1024);
    const req = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': String(largeContext.length),
      },
      body: JSON.stringify({
        agent: 'copilot',
        context: { blob: largeContext },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Payload too large');
  });

  it('rejects invalid agent names with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'invalid_agent_name',
        context: {},
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Validation failed');
  });

  it('successfully processes valid agent request and returns safe sanitized response', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'copilot',
        context: {
          question: 'What is blocking work order WO-2201?',
          work_order_id: 'WO-2201',
          plant_id: 'P-07',
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.provider).toBeDefined();
    // Verify no keys or URLs leaked
    const jsonStr = JSON.stringify(json);
    expect(jsonStr).not.toContain('MAKE_AUTH_TOKEN');
    expect(jsonStr).not.toContain('GEMINI_API_KEY');
    expect(jsonStr).not.toContain('hook.eu2.make.com');
  });
});
