/**
 * 베테랑 친화 UX 기준 (T5.10 — PRD 부록 H, J-MR-2).
 * 텍스트 ≥ 16px, 터치 타깃 ≥ 44×44px. 클래스 토큰 + 검증 헬퍼.
 */
export const MIN_FONT_PX = 16;
export const MIN_TOUCH_PX = 44;

export const VETERAN = {
  bodyText: 'text-base', // 16px
  heading: 'text-2xl font-bold',
  touchTarget: 'min-h-11 min-w-11', // 44px (Tailwind 11 = 2.75rem)
  button: 'h-11 px-6 text-base',
} as const;

export function isVeteranFont(px: number): boolean {
  return px >= MIN_FONT_PX;
}

export function isTouchTarget(px: number): boolean {
  return px >= MIN_TOUCH_PX;
}
