# Sprint 12 (Phase 2 — 코드 가능분 + 어댑터) 의사결정 로그

범위(사용자 승인 "코드 가능 전부 + 어댑터"): 12.6 자재확대 + 12.5 PWA + 솔버/LLM 어댑터·토글.
외부 실서비스(Python OR-Tools 솔버 12.1.1/2/4·12.2.x, Ollama 12.7.1/3/4, AD/LDAP 12.4.x, 솔버 부하·정확도 12.3.3/4)는 미가동 → `docs/operations-phase2.md` 런북 **이연**.

CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (T12.6.1) 자재는 String 유지 + 앱 레벨 정규화(마이그레이션 0)
- SQLite enum 미지원·기존 silicone 무결성 위해 `material`은 String 유지, `lib/material/`에서 union(silicone/EPDM/NBR)·정규화·검증.
- 미상/빈값은 기본 silicone → 기존 데이터 영향 없음(AC T12.6.1-1). 스키마 변경 없어 db push 불필요.

---

## MINOR

(없음)

---

CORE: 1
MINOR: 0
