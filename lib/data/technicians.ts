import { getSeedData, queryWithFallback } from './db';
import { Technician, Certification, TechnicianSkill } from '../types';

export function getTechniciansSync(plantId?: string, lineId?: string): Technician[] {
  const data = getSeedData();
  const techs: Technician[] = (data.technicians as unknown as Technician[]) || [];
  if (!plantId) return techs;
  return techs.filter((t) => t.plant_id === plantId);
}

export function getTechnicianByIdSync(id: string): Technician | undefined {
  const data = getSeedData();
  const techs: Technician[] = (data.technicians as unknown as Technician[]) || [];
  return techs.find((t) => t.id === id);
}

export function getCertificationsSync(technicianId?: string): Certification[] {
  const data = getSeedData();
  const certs: Certification[] = (data.certifications as unknown as Certification[]) || [];
  if (technicianId) {
    return certs.filter((c) => c.technician_id === technicianId);
  }
  return certs;
}

export function getTechnicianSkillsSync(technicianId?: string): TechnicianSkill[] {
  const data = getSeedData();
  const skills: TechnicianSkill[] = (data.technician_skills as unknown as TechnicianSkill[]) || [];
  if (technicianId) {
    return skills.filter((s) => s.technician_id === technicianId);
  }
  return skills;
}

export async function getTechnicians(plantId: string, lineId?: string): Promise<Technician[]> {
  return queryWithFallback<Technician[]>(
    async (client) => {
      let query = client.from('technicians').select('*');
      if (plantId) {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query;
      return { data: data as Technician[], error };
    },
    () => getTechniciansSync(plantId, lineId),
    'getTechnicians'
  );
}

export async function getTechnicianById(id: string, plantId?: string): Promise<Technician | undefined> {
  return queryWithFallback<Technician | undefined>(
    async (client) => {
      let query = client.from('technicians').select('*').eq('id', id);
      if (plantId) {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query.single();
      return { data: data as Technician, error };
    },
    () => getTechnicianByIdSync(id),
    'getTechnicianById'
  );
}

export async function getCertifications(plantId?: string, lineId?: string, technicianId?: string): Promise<Certification[]> {
  return queryWithFallback<Certification[]>(
    async (client) => {
      let query = client.from('certifications').select('*');
      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }
      const { data, error } = await query;
      return { data: data as Certification[], error };
    },
    () => getCertificationsSync(technicianId),
    'getCertifications'
  );
}

export async function getTechnicianSkills(plantId?: string, lineId?: string, technicianId?: string): Promise<TechnicianSkill[]> {
  return queryWithFallback<TechnicianSkill[]>(
    async (client) => {
      let query = client.from('technician_skills').select('*');
      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }
      const { data, error } = await query;
      return { data: data as TechnicianSkill[], error };
    },
    () => getTechnicianSkillsSync(technicianId),
    'getTechnicianSkills'
  );
}
