import type { Metadata } from 'next';

export const metadata: Metadata = { title: '오프라인 · EVS' };
// SEC: CSP nonce는 per-request 동적 렌더에만 부여됨 → 정적 프리렌더 시 스크립트가 nonce 없이 차단된다.
// 오프라인 폴백도 nonce를 받도록 동적 렌더(번들 작음, SW가 nonce-HTML/CSP 쌍을 함께 캐시).
export const dynamic = 'force-dynamic';

/**
 * SEC — 세션/사용자 데이터가 전혀 없는 정적 오프라인 폴백(SW 프리캐시 대상).
 * 인증 셸(/)을 오프라인 폴백으로 쓰면 이전 사용자 신원이 노출되므로 별도 페이지로 분리.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">오프라인</h1>
      <p className="text-base text-muted-foreground">
        네트워크에 연결되어 있지 않습니다. 연결이 복구되면 새로고침하세요.
      </p>
      <p className="text-sm text-muted-foreground">
        급할 때는 직전에 내려받은 엑셀(작업지시/스케줄)로 수기 운용이 가능합니다.
      </p>
    </main>
  );
}
