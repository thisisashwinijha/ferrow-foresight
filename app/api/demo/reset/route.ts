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
        // Restore seed alert AL-1001 and machine P07-M03
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

        // Delete test work orders created during demo that are not part of seed data
        const seedWoIds = seedData.work_orders.map((w: any) => w.id);
        const { data: existingWos } = await admin.from('work_orders').select('id');
        if (existingWos && existingWos.length > 0) {
          const toDelete = existingWos
            .filter((w: any) => !seedWoIds.includes(w.id))
            .map((w: any) => w.id);
          if (toDelete.length > 0) {
            await admin.from('work_orders').delete().in('id', toDelete);
          }
        }

        // Restore all seeded work orders in Supabase (WO-2201 for AL-1004, WO-2202 for AL-1005, plus history)
        await admin.from('work_orders').upsert(seedData.work_orders);

        // Delete test observations created during demo
        const seedObsIds = seedData.observations.map((o: any) => o.id);
        const { data: existingObs } = await admin.from('observations').select('id');
        if (existingObs && existingObs.length > 0) {
          const obsToDelete = existingObs
            .filter((o: any) => !seedObsIds.includes(o.id))
            .map((o: any) => o.id);
          if (obsToDelete.length > 0) {
            await admin.from('observations').delete().in('id', obsToDelete);
          }
        }
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
