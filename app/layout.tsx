import type { Metadata } from 'next';
import { Suspense } from 'react';
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google';
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

const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-sans-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ferrow Foresight | Maintenance Operating System',
  description: 'AI-assisted condition-based and risk-based maintenance operating system',
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
      className={`${ibmPlexSans.variable} ${ibmPlexSansCondensed.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink antialiased">
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
