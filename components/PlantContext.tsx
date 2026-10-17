'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type UserRole =
  | 'Head of Plant Operations'
  | 'Plant Head'
  | 'Maintenance Planner'
  | 'Technician'
  | 'Production Manager'
  | 'Stores In-charge'
  | 'Training Coordinator';

export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  'Head of Plant Operations': '/network',
  'Plant Head': '/',
  'Maintenance Planner': '/planning',
  'Technician': '/capture',
  'Production Manager': '/production',
  'Stores In-charge': '/spares',
  'Training Coordinator': '/people',
};

interface PlantContextType {
  plantId: string;
  lineId: string;
  role: UserRole;
  setPlantId: (plantId: string) => void;
  setLineId: (lineId: string) => void;
  setRole: (role: UserRole) => void;
}

const PlantContext = createContext<PlantContextType>({
  plantId: 'P-07',
  lineId: 'all',
  role: 'Plant Head',
  setPlantId: () => {},
  setLineId: () => {},
  setRole: () => {},
});

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const plantParam = searchParams.get('plant') || 'P-07';
  const lineParam = searchParams.get('line') || 'all';

  const [plantId, setLocalPlantId] = useState<string>(plantParam);
  const [lineId, setLocalLineId] = useState<string>(lineParam);
  const [role, setLocalRole] = useState<UserRole>('Plant Head');

  useEffect(() => {
    if (plantParam && plantParam !== plantId) {
      setLocalPlantId(plantParam);
    }
    if (lineParam && lineParam !== lineId) {
      setLocalLineId(lineParam);
    }
  }, [plantParam, lineParam]);

  const updateUrl = (newPlant: string, newLine: string, targetPath = pathname) => {
    const params = new URLSearchParams();
    if (newPlant && newPlant !== 'all') {
      params.set('plant', newPlant);
    }
    if (newLine && newLine !== 'all') {
      params.set('line', newLine);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    startTransition(() => {
      router.push(`${targetPath}${query}`);
    });
  };

  const setPlantId = (newPlantId: string) => {
    setLocalPlantId(newPlantId);
    setLocalLineId('all'); // Reset line when plant changes
    updateUrl(newPlantId, 'all');
  };

  const setLineId = (newLineId: string) => {
    setLocalLineId(newLineId);
    updateUrl(plantId, newLineId);
  };

  const setRole = (newRole: UserRole) => {
    setLocalRole(newRole);
    const target = ROLE_LANDING_PAGES[newRole] || '/';
    updateUrl(plantId, lineId, target);
  };

  return (
    <PlantContext.Provider
      value={{
        plantId,
        lineId,
        role,
        setPlantId,
        setLineId,
        setRole,
      }}
    >
      {children}
    </PlantContext.Provider>
  );
}

export function usePlantContext() {
  return useContext(PlantContext);
}
