import { getTechnicians, getCertifications, getTechnicianSkills } from '@/lib/data/technicians';
import { getKnowledgeLibrary } from '@/lib/data/knowledge';
import { getLearningCards, getSuggestedPairings } from '@/lib/knowledgeService';
import { getPlantById } from '@/lib/data/plants';
import { PeopleDevelopmentView } from '@/components/PeopleDevelopmentView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: { plant?: string };
}) {
  noStore();
  const activePlantId = searchParams?.plant || 'P-07';

  const [technicians, certifications, technicianSkills, knowledgeEntries, learningCards, suggestedPairings, plant] =
    await Promise.all([
      getTechnicians(activePlantId),
      getCertifications(),
      getTechnicianSkills(),
      getKnowledgeLibrary(),
      getLearningCards(),
      getSuggestedPairings(activePlantId),
      getPlantById(activePlantId),
    ]);

  return (
    <PeopleDevelopmentView
      technicians={technicians}
      certifications={certifications}
      technicianSkills={technicianSkills}
      initialKnowledgeEntries={knowledgeEntries}
      learningCards={learningCards}
      suggestedPairings={suggestedPairings}
      plant={plant}
    />
  );
}
