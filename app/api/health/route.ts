import { NextResponse } from 'next/server';
import { getSupabaseBrowserClient, withTimeout, hasSupabaseKeys } from '@/lib/supabase';
import { getSupabaseAdminClient, hasSupabaseAdminKeys } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const time = new Date().toISOString();
  const hasKeys = hasSupabaseKeys() || hasSupabaseAdminKeys();

  if (!hasKeys) {
    return NextResponse.json({
      ok: true,
      database: 'seed',
      time,
    });
  }

  const client = getSupabaseAdminClient() || getSupabaseBrowserClient();

  if (!client) {
    return NextResponse.json({
      ok: true,
      database: 'seed',
      time,
    });
  }

  try {
    const { error } = await withTimeout<any>(
      client.from('plants').select('id').limit(1) as any,
      4000,
      'health-check'
    );

    if (error) {
      console.error('[API /api/health] Supabase query error:', error.message);
      return NextResponse.json({
        ok: false,
        database: 'error',
        time,
      }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      database: 'connected',
      time,
    });
  } catch (err: any) {
    console.error('[API /api/health] Supabase query exception:', err?.message || err);
    return NextResponse.json({
      ok: false,
      database: 'error',
      time,
    }, { status: 503 });
  }
}
