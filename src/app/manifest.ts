import type { MetadataRoute } from 'next';
const icon = [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }];
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'KazaVibe', short_name: 'KazaVibe', description: 'Your People. Your Vibe. Your Community.',
    // Opens straight into the app. Signed-out people land on the login screen instead of the marketing page.
    start_url: '/home', scope: '/', display: 'standalone', display_override: ['standalone', 'minimal-ui'], orientation: 'portrait', lang: 'en', categories: ['social'],
    background_color: '#0A0D14', theme_color: '#0A0D14',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // long-press the app icon for these
    shortcuts: [
      { name: 'Messages', url: '/messages', icons: icon }, { name: 'Clips', url: '/clips', icons: icon },
      { name: 'Connect', url: '/connect', icons: icon }, { name: 'Notifications', url: '/notifications', icons: icon },
    ],
  };
}
