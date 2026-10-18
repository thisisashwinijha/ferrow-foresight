import { redirect } from 'next/navigation';
import { ControlRoomView } from '@/components/ControlRoomView';

export const dynamic = 'force-dynamic';

export default async function ControlRoomPage({
  searchParams,
}: {
  searchParams?: Promise<{ plant?: string; line?: string }> | { plant?: string; line?: string };
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  if (resolvedParams?.plant === 'all') {
    redirect('/network');
  }

  return <ControlRoomView />;
}
