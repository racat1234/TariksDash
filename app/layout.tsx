import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://codex-home-tarik.tarik-1.chatgpt.site'),
  title: 'Tarik’s Daily Dashboard',
  description: 'A calm personal home base for ideas, priorities, and work with Codex.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Tarik’s Dashboard' },
  openGraph: {
    title: 'Tarik’s Daily Dashboard',
    description: 'A calmer place to think, plan, and make.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarik’s Daily Dashboard',
    description: 'A calmer place to think, plan, and make.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#090d20' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
