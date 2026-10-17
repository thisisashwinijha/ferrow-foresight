import type { Metadata } from 'next';
import { Suspense } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PlantProvider } from '@/components/PlantContext';
import { ToastProvider } from '@/components/ToastContext';
import { AppShell } from '@/components/AppShell';
import { getPlants } from '@/lib/data/plants';
import { getAllMachines } from '@/lib/data/machines';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ferrow Foresight | Maintenance Operating System',
  description: 'Condition-based and risk-based maintenance operating system for packaging and processing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const plants = getPlants();
  const machines = getAllMachines();

  return (
    <html
      lang="en"
      data-theme="light"
      className={ibmPlexSans.variable}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink antialiased selection:bg-ink/10 selection:text-ink">
        <ThemeProvider>
          <Suspense fallback={null}>
            <PlantProvider>
              <ToastProvider>
                <AppShell plants={plants} machines={machines}>
                  {children}
                </AppShell>
              </ToastProvider>
            </PlantProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
