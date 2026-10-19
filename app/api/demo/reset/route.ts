import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { resetLocalStoreData } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { normalizeSeededWorkOrders } from '@/lib/workflow';
import seedData from '@/data/seed_data.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    resetLocalStoreData();

    // If Supabase admin is available, restore test alerts, work orders, machines, and spares
    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        // 1. Delete test work orders created during demo that are not part of seed data
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

        // 2. Delete test alerts created during demo that are not part of seed data
        const seedAlertIds = seedData.alerts.map((a: any) => a.id);
        const { data: existingAlerts } = await admin.from('alerts').select('id');
        if (existingAlerts && existingAlerts.length > 0) {
          const toDeleteAlerts = existingAlerts
            .filter((a: any) => !seedAlertIds.includes(a.id))
            .map((a: any) => a.id);
          if (toDeleteAlerts.length > 0) {
            await admin.from('alerts').delete().in('id', toDeleteAlerts);
          }
        }

        // 3. FULL OVERWRITE of all alerts from seed data (all columns, including failure_mode, risk_score, etc.)
        await admin.from('alerts').upsert(seedData.alerts);

        // 4. Restore all seeded machines
        await admin.from('machines').upsert(seedData.machines);

        // 5. Restore all seeded work orders with canonical normalized states
        const normalizedWos = normalizeSeededWorkOrders(seedData.work_orders);
        await admin.from('work_orders').upsert(normalizedWos);

        // 6. Delete test observations created during demo
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

        // 7. Restore all seeded spares
        await admin.from('spares').upsert(seedData.spares);
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
