import { NextResponse } from 'next/server';
import { getSupabaseBrowserClient, withTimeout, hasSupabaseKeys } from '@/lib/supabase';
import { getSupabaseAdminClient, hasSupabaseAdminKeys } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKeys = hasSupabaseKeys() || hasSupabaseAdminKeys();

  if (!hasKeys) {
    return NextResponse.json({
      hasKeys: false,
      live: false,
      reason: 'Supabase keys not configured',
    });
  }

  // Use admin client if available, otherwise browser anon client
  const client = getSupabaseAdminClient() || getSupabaseBrowserClient();

  if (!client) {
    return NextResponse.json({
      hasKeys: true,
      live: false,
      reason: 'Failed to initialize Supabase client',
    });
  }

  try {
    const { error } = await withTimeout<any>(
      client.from('plants').select('id').limit(1) as any,
      4000,
      'db-status-check'
    );

    if (error) {
      console.error('[API /api/db-status] Supabase ping error:', error);
      return NextResponse.json({
        hasKeys: true,
        live: false,
        reason: error.message,
      });
    }

    return NextResponse.json({
      hasKeys: true,
      live: true,
    });
  } catch (err: any) {
    console.error('[API /api/db-status] Supabase ping exception:', err);
    return NextResponse.json({
      hasKeys: true,
      live: false,
      reason: err?.message || 'Database connection timeout',
    });
  }
}
