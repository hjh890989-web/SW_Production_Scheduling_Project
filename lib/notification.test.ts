import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from './notification';

const noSleep = async () => undefined;

describe('retryWithBackoff (T4.3 — AC T4.3-F1)', () => {
  it('첫 시도 성공 → ok, attempts=1', async () => {
    const r = await retryWithBackoff(async () => 'ok', { sleep: noSleep });
    expect(r).toMatchObject({ ok: true, value: 'ok', attempts: 1 });
  });

  it('2번째 성공 → ok, attempts=2', async () => {
    let n = 0;
    const r = await retryWithBackoff(
      async () => {
        n += 1;
        if (n < 2) throw new Error('fail');
        return n;
      },
      { sleep: noSleep },
    );
    expect(r).toMatchObject({ ok: true, value: 2, attempts: 2 });
  });

  it('항상 실패 → 3회 후 ok:false', async () => {
    const fn = vi.fn(async () => {
      throw new Error('down');
    });
    const r = await retryWithBackoff(fn, { maxRetries: 3, sleep: noSleep });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
