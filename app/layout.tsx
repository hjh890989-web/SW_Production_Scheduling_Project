import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SwRegister } from '@/components/pwa/sw-register';

export const metadata: Metadata = {
  title: 'EVS — Extrusion & Vulcanization Scheduling',
  description: '송우산업 사내 생산 스케줄링 시스템',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'EVS', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
