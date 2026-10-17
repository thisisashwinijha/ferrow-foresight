import { getSeedData } from './db';
import { Technician, Certification, TechnicianSkill } from '../types';

export function getTechnicians(plantId: string): Technician[] {
  const data = getSeedData();
  const techs: Technician[] = (data.technicians as unknown as Technician[]) || [];
  return techs.filter((t) => t.plant_id === plantId);
}

export function getTechnicianById(id: string): Technician | undefined {
  const data = getSeedData();
  const techs: Technician[] = (data.technicians as unknown as Technician[]) || [];
  return techs.find((t) => t.id === id);
}

export function getCertifications(technicianId?: string): Certification[] {
  const data = getSeedData();
  const certs: Certification[] = (data.certifications as unknown as Certification[]) || [];
  if (technicianId) {
    return certs.filter((c) => c.technician_id === technicianId);
  }
  return certs;
}

export function getTechnicianSkills(technicianId?: string): TechnicianSkill[] {
  const data = getSeedData();
  const skills: TechnicianSkill[] = (data.technician_skills as unknown as TechnicianSkill[]) || [];
  if (technicianId) {
    return skills.filter((s) => s.technician_id === technicianId);
  }
  return skills;
}
