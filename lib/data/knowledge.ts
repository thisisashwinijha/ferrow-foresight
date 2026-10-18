import { getSeedData, queryWithFallback } from './db';
import { KnowledgeLibrary } from '../types';

export function getKnowledgeLibrarySync(machineType?: string): KnowledgeLibrary[] {
  const data = getSeedData();
  const kl: KnowledgeLibrary[] = data.knowledge_library || [];
  if (machineType) {
    return kl.filter((k) => k.machine_type.toLowerCase() === machineType.toLowerCase());
  }
  return kl;
}

export async function getKnowledgeLibrary(
  plantId?: string,
  lineId?: string,
  machineType?: string
): Promise<KnowledgeLibrary[]> {
  return queryWithFallback<KnowledgeLibrary[]>(
    async (client) => {
      let query = client.from('knowledge_library').select('*');
      if (machineType) {
        query = query.ilike('machine_type', machineType);
      }
      const { data, error } = await query;
      return { data: data as KnowledgeLibrary[], error };
    },
    () => getKnowledgeLibrarySync(machineType),
    'getKnowledgeLibrary'
  );
}
