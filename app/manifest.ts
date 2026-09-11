import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tarik’s Daily Dashboard',
    short_name: 'Tarik’s Dashboard',
    description: 'Tarik’s personal daily dashboard for school, weather, sleep, tasks, and news.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d20',
    theme_color: '#090d20',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
