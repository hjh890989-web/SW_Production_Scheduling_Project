'use client';

import { useEffect } from 'react';
import { canRegisterServiceWorker } from '@/lib/pwa/strategy';

/**
 * T12.5.1 Service Worker 등록 (클라이언트). 지원 환경에서만 /sw.js 등록.
 */
export function SwRegister() {
  useEffect(() => {
    if (!canRegisterServiceWorker(navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패는 치명적이지 않음(오프라인 기능만 미동작)
    });
  }, []);
  return null;
}
