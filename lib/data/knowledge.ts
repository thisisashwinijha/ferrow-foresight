import { getSeedData } from './db';
import { KnowledgeLibrary } from '../types';

export function getKnowledgeLibrary(machineType?: string): KnowledgeLibrary[] {
  const data = getSeedData();
  const kl: KnowledgeLibrary[] = data.knowledge_library || [];
  if (machineType) {
    return kl.filter((k) => k.machine_type === machineType);
  }
  return kl;
}
