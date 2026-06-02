/**
 * 알림 공통 로직 (T4.3). 순수 함수만 — 서버 액션은 lib/notification-actions.ts.
 */

export type RetryResult<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; attempts: number; error: unknown };

/**
 * 지수 backoff 재시도 (AC T4.3-F1: 외부 채널 발송 실패 시 최대 3회).
 * sleep을 주입 가능하게 해 테스트에서 지연 없이 검증한다.
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { maxRetries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<RetryResult<T>> {
  const { maxRetries = 3, baseMs = 100, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const value = await fn(attempt);
      return { ok: true, value, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) await sleep(baseMs * 2 ** attempt);
    }
  }
  return { ok: false, attempts: maxRetries, error: lastError };
}
