import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EVS — Extrusion & Vulcanization Scheduling',
  description: '송우산업 사내 생산 스케줄링 시스템',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
