# EVS — Extrusion & Vulcanization Scheduling

송우산업(주) 사내 생산 스케줄링 시스템. 자세한 배경은 [CLAUDE.md](CLAUDE.md) 및 `Stage_*/` 산출물을 참고하세요.

## 개발 환경 셋업

```bash
npm install
cp .env.example .env        # DATABASE_URL, AUTH_SECRET 등 채우기
npx prisma generate
npx prisma db push          # (dev) 스키마를 SQLite에 반영
npm run dev
```

## 초기 사용자 시드 (T1.7)

개발 중 6개 Role을 테스트하려면 시드를 실행합니다. **개발 환경 한정**(운영은 별도 절차로 Admin 생성).

```bash
npx prisma db seed          # username 기준 upsert (멱등 — 여러 번 실행 가능)
```

생성되는 계정(비밀번호 정책: 8자+영문+숫자+특수):

| 아이디 | 비밀번호 | Role | 이름 |
|---|---|---|---|
| `admin` | `admin1234!` | ADMIN | 시스템관리자 |
| `kimms` | `Test1234!` | PRODUCTION_MANAGER | 김민수 |
| `parkcs` | `Test1234!` | MOLDING_LEADER | 박철수 |
| `leeyh` | `Test1234!` | EXTRUSION_LEADER | 이영호 |
| `jungsj` | `Test1234!` | SALES_PURCHASE | 정수진 |
| `exec` | `Test1234!` | EXECUTIVE | 경영진 |

## 검증

```bash
npm test            # vitest 단위 테스트
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npx prisma validate # 스키마 검증
npm run build       # 프로덕션 빌드
```
