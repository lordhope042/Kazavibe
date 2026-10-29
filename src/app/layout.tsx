import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import GlobalSpinner from '@/components/GlobalSpinner';
import PwaBoot from '@/components/PwaBoot';
import InstallPrompt from '@/components/InstallPrompt';
import { LangProvider } from '@/components/LangProvider';
import { getLang } from '@/lib/lang';

const inter = Inter({ subsets: ['latin'] });
export const metadata: Metadata = { title: 'KazaVibe', description: 'Your People. Your Vibe. Your Community.' };
export const viewport: Viewport = { themeColor: '#0B0B0F' };
export default function Root({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" /></head>
      <body className={`${inter.className} min-h-screen bg-bg text-fg antialiased`}>
        <LangProvider lang={lang}>{children}</LangProvider>
        <GlobalSpinner /><PwaBoot /><InstallPrompt />
      </body>
    </html>
  );
}
