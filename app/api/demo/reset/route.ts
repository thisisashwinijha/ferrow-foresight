import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { resetLocalStoreData } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import seedData from '@/data/seed_data.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    resetLocalStoreData();

    // If Supabase admin is available, restore test alert and machine
    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        const seedAlert = seedData.alerts.find((a) => a.id === 'AL-1001');
        if (seedAlert) {
          await admin.from('alerts').update({
            status: seedAlert.status,
            decided_by: null,
            decision_reason: null,
          }).eq('id', 'AL-1001');
        }

        const seedMachine = seedData.machines.find((m) => m.id === 'P07-M03');
        if (seedMachine) {
          await admin.from('machines').update({
            status: seedMachine.status,
            risk_score: seedMachine.risk_score,
            health_score: seedMachine.health_score,
          }).eq('id', 'P07-M03');
        }

        // Delete test work orders or observations created during demo
        await admin.from('work_orders').delete().ilike('id', 'WO-%').neq('id', 'WO-4001');
      } catch (e) {
        console.warn('Could not reset Supabase state during demo reset:', e);
      }
    }

    // Refresh all views immediately
    try {
      revalidatePath('/', 'layout');
    } catch (e) {
      console.warn('revalidatePath warning in reset route:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Demo state restored to seed baseline',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to reset demo state',
      },
      { status: 500 }
    );
  }
}
