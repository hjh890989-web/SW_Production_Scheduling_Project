import { describe, it, expect } from 'vitest';
import { isVeteranFont, isTouchTarget, VETERAN, MIN_FONT_PX, MIN_TOUCH_PX } from './veteran';

describe('veteran-friendly 기준 (T5.10)', () => {
  it('폰트 ≥ 16px 판정', () => {
    expect(isVeteranFont(16)).toBe(true);
    expect(isVeteranFont(14)).toBe(false);
    expect(MIN_FONT_PX).toBe(16);
  });

  it('터치 타깃 ≥ 44px 판정', () => {
    expect(isTouchTarget(44)).toBe(true);
    expect(isTouchTarget(40)).toBe(false);
    expect(MIN_TOUCH_PX).toBe(44);
  });

  it('토큰: 본문 text-base, 터치 min-h-11', () => {
    expect(VETERAN.bodyText).toContain('text-base');
    expect(VETERAN.touchTarget).toContain('min-h-11');
  });
});
