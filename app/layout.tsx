import type { Metadata } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PlantProvider } from '@/components/PlantContext';
import { ToastProvider } from '@/components/ToastContext';
import { AppShell } from '@/components/AppShell';
import { getPlants } from '@/lib/data/plants';
import { getAllMachines } from '@/lib/data/machines';
import { getDatabaseState } from '@/lib/data/dbState';
import { hasSupabaseKeys } from '@/lib/supabase';
import { hasSupabaseAdminKeys } from '@/lib/supabaseAdmin';

export const metadata: Metadata = {
  title: 'Ferrow Foresight | Maintenance Operating System',
  description: 'Condition-based and risk-based maintenance operating system for packaging and processing',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const plants = await getPlants();
  const machines = await getAllMachines();

  const hasKeys = hasSupabaseKeys() || hasSupabaseAdminKeys();
  const dbState = getDatabaseState();
  const isLive = hasKeys && !dbState.isUnavailable;

  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink antialiased selection:bg-ink/10 selection:text-ink font-sans">
        <ThemeProvider>
          <PlantProvider>
            <ToastProvider>
              <AppShell
                plants={plants}
                machines={machines}
                initialHasKeys={hasKeys}
                initialLive={isLive}
              >
                {children}
              </AppShell>
            </ToastProvider>
          </PlantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
