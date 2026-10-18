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
  manifest: '/manifest.json',
  themeColor: '#1E252B',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
