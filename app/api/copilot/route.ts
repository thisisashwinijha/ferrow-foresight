import { NextRequest, NextResponse } from 'next/server';
import { copilotService, CopilotContext } from '@/lib/copilotService';
import { getClientIpFromHeaders } from '@/lib/agents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const clientIp = getClientIpFromHeaders(request.headers);
    const copilotContext: CopilotContext = {
      page: context?.page || '/',
      plant_id: context?.plant_id || 'P-07',
      machine_id: context?.machine_id,
      alert_id: context?.alert_id,
      work_order_id: context?.work_order_id,
      user_role: context?.user_role,
      clientIp,
    };

    const response = await copilotService(question, copilotContext);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error processing copilot query' },
      { status: 500 }
    );
  }
}
