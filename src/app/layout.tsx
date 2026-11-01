import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import GlobalSpinner from '@/components/GlobalSpinner';
import PwaBoot from '@/components/PwaBoot';
import AppMode from '@/components/AppMode';
import { LangProvider } from '@/components/LangProvider';
import { getLang } from '@/lib/lang';

const inter = Inter({ subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'KazaVibe', description: 'Your People. Your Vibe. Your Community.', applicationName: 'KazaVibe',
  appleWebApp: { capable: true, title: 'KazaVibe', statusBarStyle: 'black' }, formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0A0D14' }, { media: '(prefers-color-scheme: light)', color: '#F5F5F8' }],
};
export default function Root({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" /></head>
      <body className={`${inter.className} min-h-dvh bg-bg text-fg antialiased`}>
        <LangProvider lang={lang}>{children}</LangProvider>
        <GlobalSpinner /><PwaBoot /><AppMode />
      </body>
    </html>
  );
}
