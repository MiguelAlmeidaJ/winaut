import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';

import { AppShell } from '@/components/layout/app-shell';

import './globals.css';
import { Providers } from './providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Orquestra',
  description: 'Seus sistemas trabalhando juntos.',
  icons: {
    icon: '/brand/orquestra-icon.png',
    shortcut: '/brand/orquestra-icon.png',
    apple: '/brand/orquestra-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={poppins.variable} suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
