---
name: 101-build-and-env-setup
description: FactoryAI 로컬 dev 환경 셋업·빌드 점검. Node, .env, Prisma migration, Mock ERP 시드, Vercel 환경변수까지 단계별 체크리스트.
---

# 101 — Build & Env Setup

> Claude/Cursor/Antigravity/Gemini 모든 도구에서 동일 내용. Claude Code는 `.claude/skills/` Junction을 통해 `/101-build-and-env-setup` 슬래시 커맨드로 호출.

본 스킬은 새로운 머신 또는 신규 기여자가 FactoryAI를 처음 셋업할 때, 또는 환경 문제가 의심될 때 점검 절차로 사용합니다.

---

## 0. 빠른 체크 (이미 셋업된 경우)

```bash
node --version          # ≥ 20 LTS
npm run dev             # 부팅 OK?
npx prisma studio       # DB 연결 OK?
```

위 3가지가 정상이면 셋업 완료. 문제가 있으면 아래 전체 절차.

---

## 1. 사전 요건

| 도구 | 버전 | 확인 |
|:---|:---|:---|
| Node.js | ≥ 20 LTS | `node --version` |
| npm | ≥ 10 | `npm --version` |
| Git | ≥ 2.40 | `git --version` |
| (선택) Vercel CLI | 최신 | `vercel --version` |

## 2. 의존성

```bash
npm install
npx prisma generate
```

## 3. 환경 변수 (`.env.local`)

루트에 `.env.local`이 없으면 생성:

```bash
# === Database ===
DATABASE_URL="postgresql://postgres:[PW]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PW]@db.[PROJECT].supabase.co:5432/postgres"

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."    # 🔒 서버 전용

# === Gemini ===
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# === Auth ===
NEXTAUTH_SECRET=""                     # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# === ERP Read-Only (CON-02) ===
ERP_READONLY_URL="postgresql://erp_reader:[PW]@..."
```

확인:
- `.gitignore`에 `.env*.local` 포함 여부
- 비밀키 git history에 흔적 없는지 (`git log -S 'AIza'`)

## 4. DB 초기화

```bash
# dev (SQLite)
npx prisma migrate dev --name init
npx prisma db seed

# MVP (Supabase)
npx prisma migrate deploy
npx prisma db seed
```

## 5. Mock ERP 시드

```bash
npm run db:seed-erp     # prisma/seed-erp.ts 실행
```

> 가짜 데이터만. 실 고객사 데이터 사용 금지.

## 6. 개발 서버

```bash
npm run dev             # http://localhost:3000
```

## 7. 빌드 검증

```bash
npm run build
npm run lint
tsc --noEmit
```

## 8. (선택) Vercel 배포

```bash
vercel login
vercel link
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
# ... 모든 키 반복
vercel --prod
```

## 9. 점검 산출물

- [ ] `.env.local` 모든 키 채워짐
- [ ] `.gitignore` 비밀 파일 포함
- [ ] `npx prisma migrate` 성공
- [ ] `npm run dev` 정상 부팅
- [ ] `npm run build` 통과
- [ ] (선택) Vercel 환경변수 등록
- [ ] 무료 티어 한도(CON-12) 모니터링 셋업

## 10. 무료 티어 알람 (CON-12)

| 자원 | 한도 | 알람 임계치 |
|:---|:---|:---|
| Supabase DB | 500 MB | 400 MB (80%) |
| Supabase Storage | 1 GB | 800 MB |
| Vercel Functions | 100,000 호출/월 | 80,000 |
| Gemini Free | 15 RPM | 12 RPM (이미 안전마진) |

Phase 2에 Sentry 또는 자체 dashboard로 모니터링.

---

## See also

- [.agents/rules/002-tech-stack.md](../../rules/002-tech-stack.md) — 스택 상세
