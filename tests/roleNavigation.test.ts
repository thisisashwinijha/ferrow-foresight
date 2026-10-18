import { describe, it, expect } from 'vitest';
import {
  ROLE_LANDING_PAGES,
  ROLE_NAV_CONFIG,
  UserRole,
  getRoleLandingUrl,
} from '@/lib/roles';

describe('Role-based App Configuration (Step 3)', () => {
  it('directs roles to their correct landing page', () => {
    expect(ROLE_LANDING_PAGES['Technician']).toBe('/my-tasks');
    expect(ROLE_LANDING_PAGES['Maintenance Planner']).toBe('/my-tasks');
    expect(ROLE_LANDING_PAGES['Plant Head']).toBe('/my-tasks');
    expect(ROLE_LANDING_PAGES['Production Manager']).toBe('/my-tasks');
    expect(ROLE_LANDING_PAGES['Stores In-charge']).toBe('/my-tasks');
    expect(ROLE_LANDING_PAGES['Training Coordinator']).toBe('/my-tasks');
    expect(ROLE_LANDING_PAGES['Head of Plant Operations']).toBe('/network');
  });

  it('specifies the 3 to 5 relevant primary pages per role', () => {
    // Technician: My tasks, Capture, Work orders
    expect(ROLE_NAV_CONFIG['Technician']).toEqual(['/my-tasks', '/capture', '/work-orders']);

    // Maintenance Planner: My tasks, Alerts, Planning, Work orders
    expect(ROLE_NAV_CONFIG['Maintenance Planner']).toEqual([
      '/my-tasks',
      '/alerts',
      '/planning',
      '/work-orders',
    ]);

    // Plant Head: My tasks, Control Room, Alerts, KPIs
    expect(ROLE_NAV_CONFIG['Plant Head']).toEqual([
      '/my-tasks',
      '/control-room',
      '/alerts',
      '/kpis',
    ]);

    // Production Manager: My tasks, Production
    expect(ROLE_NAV_CONFIG['Production Manager']).toEqual(['/my-tasks', '/production']);

    // Stores In-charge: My tasks, Spares
    expect(ROLE_NAV_CONFIG['Stores In-charge']).toEqual(['/my-tasks', '/spares']);

    // Training Coordinator: My tasks, People
    expect(ROLE_NAV_CONFIG['Training Coordinator']).toEqual(['/my-tasks', '/people']);

    // Head of Plant Operations: Network, KPIs
    expect(ROLE_NAV_CONFIG['Head of Plant Operations']).toEqual(['/network', '/kpis']);
  });

  it('preserves plant parameter when switching roles', () => {
    const currentPlant = 'P-07';
    const roles: UserRole[] = [
      'Technician',
      'Maintenance Planner',
      'Plant Head',
      'Production Manager',
      'Stores In-charge',
      'Training Coordinator',
      'Head of Plant Operations',
    ];

    roles.forEach((r) => {
      const targetUrl = getRoleLandingUrl(r, currentPlant);
      expect(targetUrl).toContain(`plant=${currentPlant}`);
    });
  });
});
