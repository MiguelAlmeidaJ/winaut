import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'WinAut',
  description: 'Painel administrativo do WinAut',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
