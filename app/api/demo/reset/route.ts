import { NextResponse } from 'next/server';
import { resetLocalStoreData } from '@/lib/data/localStore';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    resetLocalStoreData();
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
