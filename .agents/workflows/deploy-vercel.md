---
name: deploy-vercel
description: Vercel 자동 배포 절차 — Phase 1(MVP) 환경에서 main 브랜치 push 시 자동 배포 + 검증 체크리스트
---

# Deploy to Vercel (MVP)

> **트리거**: 사용자가 "배포해" 또는 "main에 머지하고 푸시" 요청 시 수동 실행.

CON-04 — MVP는 Vercel Git Push 자동 배포. 별도 CLI 호출 없음. **본 워크플로우는 push 전 검증 + push 후 모니터링** 절차다.

## Pre-deploy 체크리스트

```bash
# 1. 빌드/타입/Lint 모두 통과 (필수)
npm run build && npm run typecheck && npm run lint
# 위 3개 중 하나라도 실패 시 배포 중단

# 2. 환경변수 점검
vercel env ls  # 모든 필요 키 존재 여부
# 필수 키: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
#         NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#         GOOGLE_GENERATIVE_AI_API_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Prisma migration 상태
npx prisma migrate status  # "Database schema is up to date" 확인
# 미적용 migration이 있으면 → main push 전에 deploy:
npx prisma migrate deploy

# 4. R1~R5 위반 셀프 검토 (security-reviewer subagent 실행)
# Cursor: > use the security-reviewer subagent
# Gemini: gemini ask --agent security-reviewer
```

## Push

```bash
# develop → main PR 머지 후
git checkout main
git pull
# Vercel 자동 빌드 트리거됨
```

## Post-deploy 검증

1. **Vercel Dashboard** 빌드 로그 확인 (https://vercel.com/dashboard)
2. Preview URL에서 핵심 플로우 5분 스모크 테스트:
   - 로그인 (NextAuth)
   - 대시보드 진입
   - 로그 1건 생성 (E1)
   - AI 추론 트리거 → PENDING 상태 확인 (R1)
   - audit_log 조회 (R4)
3. Vercel Function logs에서 에러 0건 확인:
   ```bash
   vercel logs --since 5m
   ```
4. Supabase Dashboard에서 DB 연결·쿼리 정상 확인.
5. Gemini API 사용량 (Google Cloud Console) — Free Tier 한도 여유 확인.

## 롤백

문제 발생 시:
```bash
# Vercel UI에서 이전 deployment를 "Promote to Production"
# 또는 CLI:
vercel rollback <previous-deployment-url> --yes
```

또는 Git 레벨 롤백:
```bash
git revert <bad-commit>
git push  # 새 deploy 트리거
```

## 모니터링 임계치 (CON-12 무료 티어)

| 자원 | 한도 | 알림 임계 |
|---|---|---|
| Vercel 호출 | 100k/월 | 80k |
| Supabase DB | 500MB | 400MB |
| Supabase Storage | 1GB | 800MB |
| Gemini API | 15 RPM | 12 RPM (코드 차원) |

매주 1회 위 4개 수치 점검 → 80% 도달 시 사용자에게 PoC 유료 전환 또는 데이터 정리 제안.

## Phase 2 변경
- PROD On-Premise는 Docker Compose. 본 워크플로우는 폐기 또는 별도 `deploy-onprem.md`로 분기.
