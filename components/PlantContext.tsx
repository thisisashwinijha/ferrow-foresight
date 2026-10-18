'use client';

import React, { createContext, useContext, useEffect, useState, useTransition, Suspense, useCallback } from 'react';
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

function SearchParamsSync({
  onSync,
}: {
  onSync: (plant: string, line: string) => void;
}) {
  const searchParams = useSearchParams();
  const plantParam = searchParams.get('plant') || 'P-07';
  const lineParam = searchParams.get('line') || 'all';

  useEffect(() => {
    onSync(plantParam, lineParam);
  }, [plantParam, lineParam, onSync]);

  return null;
}

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [plantId, setLocalPlantId] = useState<string>('P-07');
  const [lineId, setLocalLineId] = useState<string>('all');
  const [role, setLocalRole] = useState<UserRole>('Plant Head');

  const handleSync = useCallback((newPlant: string, newLine: string) => {
    if (newPlant) setLocalPlantId(newPlant);
    if (newLine) setLocalLineId(newLine);
  }, []);

  const updateUrl = useCallback((newPlant: string, newLine: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (newPlant) params.set('plant', newPlant);
      if (newLine && newLine !== 'all') params.set('line', newLine);
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    });
  }, [pathname, router]);

  const setPlantId = (newPlant: string) => {
    setLocalPlantId(newPlant);
    updateUrl(newPlant, lineId);
  };

  const setLineId = (newLine: string) => {
    setLocalLineId(newLine);
    updateUrl(plantId, newLine);
  };

  const setRole = (newRole: UserRole) => {
    setLocalRole(newRole);
    const landing = ROLE_LANDING_PAGES[newRole] || '/';
    const params = new URLSearchParams();
    if (plantId) params.set('plant', plantId);
    if (lineId && lineId !== 'all') params.set('line', lineId);
    const query = params.toString();
    const dest = query ? `${landing}?${query}` : landing;
    router.push(dest);
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
      <Suspense fallback={null}>
        <SearchParamsSync onSync={handleSync} />
      </Suspense>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlantContext() {
  const context = useContext(PlantContext);
  if (!context) {
    throw new Error('usePlantContext must be used within a PlantProvider');
  }
  return context;
}
