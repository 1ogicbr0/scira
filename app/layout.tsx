import './globals.css';
import 'katex/dist/katex.min.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist, Open_Sans, DM_Sans } from 'next/font/google';

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';

import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://ola.ai'),
  title: {
    default: 'Ola AI',
    template: '%s | Ola AI',
    absolute: 'Ola AI',
  },
  description: 'Ola AI is a minimalistic AI-powered search engine that helps you find information on the internet.',
  openGraph: {
    url: 'https://ola.ai',
    siteName: 'Ola AI',
  },
  keywords: [
    'ola.ai',
    'ai search engine',
    'search engine',
    'ola ai',
    'Ola AI',
    'ola AI',
    'OLA.AI',
    'ola github',
    'ai search engine',
    'Ola',
    'ola',
    'ola.app',
    'ola ai',
    'ola ai app',
    'ola',
    'MiniPerplx',
    'Ola AI',
    'Perplexity alternatives',
    'Perplexity AI alternatives',
    'open source ai search engine',
    'minimalistic ai search engine',
    'minimalistic ai search alternatives',
    'ai search',
    'minimal ai search',
    'minimal ai search alternatives',
    'Ola (Formerly MiniPerplx)',
    'AI Search Engine',
    'mplx.run',
    'mplx ai',
    'zaid mukaddam',
    'ola.how',
    'search engine',
    'AI',
    'perplexity',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
  display: 'swap',
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-be-vietnam-pro',
  preload: true,
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  preload: true,
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  preload: true,
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${beVietnamPro.variable} ${openSans.variable} ${dmSans.variable} font-sans antialiased`} suppressHydrationWarning>
        <NuqsAdapter>
          <Providers>
            <Toaster position="top-center" />
            {children}
          </Providers>
        </NuqsAdapter>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
