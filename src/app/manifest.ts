import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'KazaVibe', short_name: 'KazaVibe', description: 'Your People. Your Vibe. Your Community.',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait', lang: 'en', categories: ['social'],
    background_color: '#0B0B0F', theme_color: '#0B0B0F',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
