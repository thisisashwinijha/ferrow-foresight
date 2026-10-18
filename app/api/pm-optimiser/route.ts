import { NextRequest, NextResponse } from 'next/server';
import { pmOptimiserService } from '@/lib/pmOptimiserService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    let plantId = 'P-07';
    try {
      const body = await request.json();
      if (body?.plantId) plantId = body.plantId;
    } catch {
      // Body optional
    }

    const result = await pmOptimiserService(plantId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to run PM Optimiser' },
      { status: 500 }
    );
  }
}
