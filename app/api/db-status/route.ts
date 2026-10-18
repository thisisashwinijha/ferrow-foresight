import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { withTimeout } from '@/lib/supabase';
import { getDatabaseState } from '@/lib/data/dbState';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminClient = getSupabaseAdminClient();

  if (!adminClient) {
    return NextResponse.json({
      live: false,
      reason: 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing',
    });
  }

  try {
    const { error } = await withTimeout<any>(
      adminClient.from('plants').select('id', { head: true, count: 'exact' }) as any,
      2500,
      'db-ping'
    );

    if (error) {
      return NextResponse.json({
        live: false,
        reason: error.message,
      });
    }

    return NextResponse.json({
      live: true,
    });
  } catch (err: any) {
    return NextResponse.json({
      live: false,
      reason: err?.message || 'Database connection timeout',
    });
  }
}
