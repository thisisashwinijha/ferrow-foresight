import { NextRequest, NextResponse } from 'next/server';
import { mutateLocalKnowledgeEntry } from '@/lib/data/localStore';
import { getKnowledgeLibrarySync } from '@/lib/data/knowledge';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing knowledge entry ID' }, { status: 400 });
    }

    const updated = mutateLocalKnowledgeEntry(id, { verified: true });
    if (!updated) {
      // Find in sync if not in local store
      const all = getKnowledgeLibrarySync();
      const existing = all.find((k) => k.id === id);
      if (!existing) {
        return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        entry: { ...existing, verified: true },
      });
    }

    return NextResponse.json({
      success: true,
      entry: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to verify knowledge entry' },
      { status: 500 }
    );
  }
}
