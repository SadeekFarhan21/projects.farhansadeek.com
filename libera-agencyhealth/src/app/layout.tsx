import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { ModeProvider } from '@/context/mode-provider';
import { SessionStoreProvider } from '@/lib/session-store';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Libera',
  description: 'The space between stimulus and response.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} dark h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-surface text-on-surface font-body selection:bg-secondary/20 selection:text-secondary" suppressHydrationWarning>
        <SessionStoreProvider>
          <ModeProvider>
            {children}
          </ModeProvider>
        </SessionStoreProvider>
      </body>
    </html>
  );
}
