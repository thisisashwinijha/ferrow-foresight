export type UserRole =
  | 'Head of Plant Operations'
  | 'Plant Head'
  | 'Maintenance Planner'
  | 'Technician'
  | 'Production Manager'
  | 'Stores In-charge'
  | 'Training Coordinator';

export const ROLES: UserRole[] = [
  'Head of Plant Operations',
  'Plant Head',
  'Maintenance Planner',
  'Technician',
  'Production Manager',
  'Stores In-charge',
  'Training Coordinator',
];

export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  'Head of Plant Operations': '/network',
  'Plant Head': '/my-tasks',
  'Maintenance Planner': '/my-tasks',
  'Technician': '/my-tasks',
  'Production Manager': '/my-tasks',
  'Stores In-charge': '/my-tasks',
  'Training Coordinator': '/my-tasks',
};

export interface RoleNavConfig {
  role: UserRole;
  primaryPages: Array<{ name: string; href: string }>;
}

export const ROLE_NAV_CONFIG: Record<UserRole, string[]> = {
  'Technician': ['/my-tasks', '/capture', '/work-orders'],
  'Maintenance Planner': ['/my-tasks', '/alerts', '/planning', '/work-orders'],
  'Plant Head': ['/my-tasks', '/control-room', '/alerts', '/kpis'],
  'Production Manager': ['/my-tasks', '/production'],
  'Stores In-charge': ['/my-tasks', '/spares'],
  'Training Coordinator': ['/my-tasks', '/people'],
  'Head of Plant Operations': ['/network', '/kpis'],
};

export function getRoleLandingUrl(role: UserRole, plantId?: string, lineId?: string): string {
  const landing = ROLE_LANDING_PAGES[role] || '/my-tasks';
  const params = new URLSearchParams();
  if (plantId && plantId !== 'all') params.set('plant', plantId);
  if (lineId && lineId !== 'all') params.set('line', lineId);
  const q = params.toString();
  return q ? `${landing}?${q}` : landing;
}
