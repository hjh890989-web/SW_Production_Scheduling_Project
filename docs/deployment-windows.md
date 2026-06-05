# EVS 배포 절차 — Windows 운영급 (Docker Desktop)

> 대상: 사내 단일 Windows PC를 운영 서버로 사용. Docker Desktop으로 전체 스택(app·DB·MinIO·nginx·관측·솔버)을 상시 기동.
> 사내망 전용(외부 IP 노출 금지, D8). 실데이터는 사내 PC에서만 시드.

---

## 0. ⚠️ 먼저 결정 — 운영 DB

현재 `prisma/schema.prisma`는 `provider = "sqlite"`로 고정돼 있고, prod compose는 PostgreSQL을 가정한다. **둘 중 하나를 골라야** 하며, 그에 따라 1줄~소폭 보강이 필요하다:

| 안 | 적합 | 필요 작업 |
|---|---|---|
| **A. SQLite (권장 — 20명 단일 PC)** | 즉시 배포, 운영 단순 | compose에서 postgres 제거 + app을 SQLite 볼륨으로(별도 override 제공 예정). 코드 변경 0 |
| **B. PostgreSQL (정석/확장 대비)** | 동시성·대용량 | `schema.prisma` provider를 `postgresql`로 변경 + `prisma db push`(별도 PR). dev(SQLite)와 분리 |

> 👉 이 문서는 공통 절차다. **A/B 결정 후** compose/schema 보강분을 반영한다(아래 5·6단계 분기).

---

## 1. 사전 요건 (서버 PC)
- **Docker Desktop** (WSL2 백엔드) — Settings → General → *Start Docker Desktop when you log in* 체크(재부팅 자동 기동)
- **Git for Windows**
- **Node 20** — DB 초기화·시드(`prisma db push`, seed)용. 앱 자체는 컨테이너로 돌지만 DB 준비는 호스트에서 하는 게 확실
- **사내 CA 인증서** `evs.crt` / `evs.key`

## 2. 코드 가져오기 (PowerShell)
```powershell
git clone <사내 git repo> evs
cd evs
```
> USB로 옮긴다면 `node_modules` · `.next` · `dev.db` · `_local` 은 빼고 복사(아래에서 재생성).

## 3. `.env.prod` 작성 (프로젝트 루트)
```ini
AUTH_SECRET=<openssl rand -base64 32 결과>
# A안(SQLite):
DATABASE_URL=file:/data/prod.db
# B안(Postgres):
# DATABASE_URL=postgresql://evs:<PW>@postgres:5432/evs?schema=public
POSTGRES_PASSWORD=<강력한 PW>
MINIO_ROOT_USER=evsadmin
MINIO_ROOT_PASSWORD=<강력한 PW>
GRAFANA_PASSWORD=<강력한 PW>
```
변수 인벤토리 전체: [operations.md §8](operations.md).

## 4. 인증서 배치
```
infrastructure\nginx\ssl\evs.crt
infrastructure\nginx\ssl\evs.key
```
(이 폴더는 gitignore됨 — 절대 커밋 금지)

## 5. DB 초기화·시드 (호스트 Node, 1회)
```powershell
npm install
$env:DATABASE_URL = "file:./prisma/prod.db"   # A안. B안은 Postgres URL (compose의 postgres 먼저 기동)
npx prisma db push                              # 스키마 → DB
npx prisma db seed                              # 마스터(품번·장비·캘린더)
npx tsx prisma/seed-employees.ts                # 실사원(결재선 엑셀, _local 필요)
```
> B안은 `docker compose ... up -d postgres` 로 postgres만 먼저 띄운 뒤 `prisma db push`.

## 6. 스택 기동
```powershell
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.prod up -d --build
```
- app·**solver**·nginx·(postgres·minio·prometheus·loki·promtail·grafana)가 함께 기동
- `--build`로 app·solver 이미지 최초 빌드(솔버는 ortools 설치로 수 분)
- A안이면 app 볼륨에 `prod.db` 마운트(override) — 결정 후 제공

## 7. 검증 (AC T11.7-1)
```powershell
docker compose -f infrastructure/docker-compose.prod.yml ps   # 전 서비스 healthy
```
- 브라우저 `https://evs.<사내도메인>` — 사내 CA 신뢰 후 로그인
- **솔버 연결**: `/molding`에서 알고리즘 토글 → "솔버" → 자동 생성 → "솔버 자동 생성 완료" 토스트(미연결 시 "룰")
- **관측**: `https://evs.<사내도메인>/grafana` → KSF 대시보드
- `docker compose restart app` 후 자동 복구 확인

## 8. 상시 운영
- **재부팅 자동**: Docker Desktop 자동 기동 + 컨테이너 `restart: unless-stopped`
- **백업**(Windows 작업 스케줄러, 매일):
  - A(SQLite): `prod.db` 볼륨 파일을 NAS로 복사
  - B(Postgres): `docker compose exec postgres pg_dump -U evs evs > NAS\db-%date%.dump`
- **AuditLog 5년 아카이빙**: [operations.md §7.3](operations.md)

## 9. Windows 특화 주의
- **줄바꿈**: `infrastructure/scripts/*.sh`(backup 등)는 LF여야 컨테이너에서 실행됨. Windows에서 백업은 위처럼 작업 스케줄러+PowerShell로 대체 권장
- **방화벽**: 443 인바운드 허용하되 **사내 대역(예: 10.0.0.0/8)만** — nginx의 `allow/deny`와 이중
- **경로**: 프로젝트 경로에 한글·공백 회피
- **Sentry·k6·Lighthouse**: 신규 의존성이라 별도 PR + 적용([operations.md §2·4·5](operations.md))

---

## 다음 보강 (A/B 결정 후 코드 반영)
- A안: `docker-compose.prod.sqlite.yml`(postgres 제거 + app SQLite 볼륨) 추가
- B안: `schema.prisma` provider `postgresql` 전환 PR(dev/prod 분리 전략 포함)
