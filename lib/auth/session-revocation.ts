/**
 * SEC — 세션 무효화 판정(순수). 비밀번호 변경 등으로 `User.sessionVersion`이 올라가면
 * 그 이전에 발급된 JWT를 무효화한다. Node(auth.ts) jwt 콜백에서만 DB값과 비교(Edge 미들웨어는 미적용).
 */
export function isSessionRevoked(
  tokenSv: number | undefined,
  dbSv: number | null | undefined,
): boolean {
  if (dbSv === null || dbSv === undefined) return true; // 사용자 없음/조회불가 → 무효
  if (tokenSv === undefined) return false; // 기능 도입 전 발급 토큰 → 유예(점진 롤아웃)
  return tokenSv !== dbSv; // 버전 불일치 → 무효(비번 변경 후 구 토큰)
}
