import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ plant?: string; line?: string }> | { plant?: string; line?: string };
}) {
  noStore();
  const resolvedParams = searchParams ? await searchParams : {};
  if (resolvedParams?.plant === 'all') {
    redirect('/network');
  }

  const plantId = resolvedParams?.plant || 'P-07';
  const lineId = resolvedParams?.line;

  const params = new URLSearchParams();
  if (plantId) params.set('plant', plantId);
  if (lineId && lineId !== 'all') params.set('line', lineId);
  const q = params.toString() ? `?${params.toString()}` : '';

  redirect(`/my-tasks${q}`);
}
