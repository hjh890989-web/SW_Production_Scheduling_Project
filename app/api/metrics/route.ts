import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { renderPrometheus, type MetricSample } from '@/lib/metrics';

// Prometheus 스크레이프 엔드포인트 (T4.5). middleware matcher에서 api 제외(공개).
export const dynamic = 'force-dynamic';

export async function GET() {
  let orders = 0;
  let users = 0;
  let unread = 0;
  try {
    [orders, users, unread] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.notification.count({ where: { read: false, cancelled: false } }),
    ]);
  } catch {
    // DB 일시 장애 시에도 프로세스 메트릭은 노출
  }

  const mem = process.memoryUsage();
  const samples: MetricSample[] = [
    { name: 'evs_build_info', help: 'EVS build info', type: 'gauge', value: 1, labels: { version: '0.1.0' } },
    { name: 'process_uptime_seconds', help: 'Process uptime in seconds', type: 'gauge', value: process.uptime() },
    { name: 'process_resident_memory_bytes', help: 'Resident memory size in bytes', type: 'gauge', value: mem.rss },
    { name: 'nodejs_heap_used_bytes', help: 'Node.js heap used in bytes', type: 'gauge', value: mem.heapUsed },
    { name: 'evs_orders_total', help: 'Total orders in DB', type: 'gauge', value: orders },
    { name: 'evs_users_total', help: 'Total users in DB', type: 'gauge', value: users },
    { name: 'evs_unread_notifications', help: 'Unread, non-cancelled notifications', type: 'gauge', value: unread },
  ];

  return new NextResponse(renderPrometheus(samples), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
  });
}
