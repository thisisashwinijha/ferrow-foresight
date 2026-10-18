import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { triageService } from '@/lib/triageService';
import { formatFailureMode } from '@/lib/lifecycle';
import { getClientIpFromHeaders } from '@/lib/agents';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ObservationPayloadSchema = z.object({
  machine_id: z.string().min(1, 'Machine selection is required'),
  plant_id: z.string().default('P-07'),
  symptom_tags: z.array(z.string()).min(1, 'At least one symptom tag must be selected'),
  note: z.string().min(2, 'Observation note is required'),
  technician_id: z.string().default('P07-T01'),
});

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = ObservationPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues.map((i) => i.message).join('; '),
        },
        { status: 400 }
      );
    }

    const clientIp = getClientIpFromHeaders(request.headers);
    const result = await triageService({
      ...parseResult.data,
      forceLive: process.env.AGENT_PROVIDER === 'cached' ? false : true,
      clientIp,
    });

    // Refresh affected views
    try {
      revalidatePath('/');
      revalidatePath('/alerts');
      revalidatePath(`/alerts/${result.alert.id}`);
      if (parseResult.data.machine_id) {
        revalidatePath(`/machines/${parseResult.data.machine_id}`);
      }
    } catch (e) {
      console.warn('revalidatePath warning in observations route:', e);
    }

    return NextResponse.json({
      success: true,
      observation: result.observation,
      alert: result.alert,
      message: `Observation logged. AI triage: ${formatFailureMode(result.alert.failure_mode)} · Urgency ${result.alert.urgency}`,
    });
  } catch (err: any) {
    console.error('Error submitting observation:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
