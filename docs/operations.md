# EVS 운영 매뉴얼 / 인프라 런북 (Sprint 11)

> 본 문서는 Sprint 11의 인프라·운영 task(T11.2·T11.4·T11.5·T11.6·T11.7·T11.8)를 **사내 서버에서 실행하기 위한 절차서**다.
> 코드 저장소 자동화 루프 환경에서는 실행 불가하므로(신규 의존성·CI·물리 인프라 필요), 여기에 구체 명령·설정·임계치로 **이연(런북화)**한다.
> 적용 주체: 인프라 담당. 적용 환경: Ubuntu 22.04 사내 단일 서버(8c·32GB·SSD 500GB), 사내망 전용(외부 IP 노출 X).

---

## 0. 적용 체크리스트 (요약)

- [ ] T11.7 사내 서버 배포 (`docker-compose.prod.yml` + nginx HTTPS + IP 화이트리스트)
- [ ] T11.5 Sentry self-hosted + `@sentry/nextjs` 설치 + DSN + source map
- [ ] T11.6 Grafana KSF 6지표 대시보드 + 알림 룰
- [ ] T11.2 k6 부하 테스트(8 임계치, p95 + 오류율 <0.5%)
- [ ] T11.4 Lighthouse CI(Perf ≥90, A11y ≥95 / W-1·W-4·W-5)
- [ ] T11.3 보충: `npm audit`, OWASP ZAP 월1회, Dependabot/Renovate
- [ ] T11.8 일일 백업(DB→NAS, 1년 보존) + 복구 시뮬(RTO ≤4h) + AuditLog 5년 아카이빙

> ⚠️ 신규 npm 의존성(`@sentry/nextjs`, `@lhci/cli`)·`.github/workflows` 변경은 **이 적용 단계에서** 별도 브랜치로 추가한다(자동화 루프 범위 밖).

---

## 1. T11.7 사내 서버 배포

### 1.1 docker-compose.prod.yml (구성 예시)

```yaml
services:
  app:
    image: evs-app:latest            # Dockerfile standalone 빌드 산출물
    restart: unless-stopped
    env_file: .env.prod
    depends_on: [postgres, minio]
  postgres:
    image: postgres:16
    restart: unless-stopped
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: evs
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_pw
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    restart: unless-stopped
    volumes: ["minio:/data"]
  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports: ["443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro    # 사내 CA 발급 인증서
    depends_on: [app]
  loki: { image: grafana/loki, restart: unless-stopped }
  prometheus: { image: prom/prometheus, restart: unless-stopped }
  grafana: { image: grafana/grafana, restart: unless-stopped }
volumes: { pgdata: {}, minio: {} }
```

### 1.2 nginx 리버스 프록시 + HTTPS + IP 화이트리스트

```nginx
server {
  listen 443 ssl;
  server_name evs.songwoo.local;
  ssl_certificate     /etc/nginx/certs/evs.crt;   # 사내 CA
  ssl_certificate_key /etc/nginx/certs/evs.key;

  allow 10.0.0.0/8;     # 사내 대역만
  deny  all;

  location / {
    proxy_pass http://app:3000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # AuditLog IP
    proxy_set_header Host $host;
  }
}
```

### 1.3 검증 (AC T11.7-1 / F1)

- [ ] 사용자 20명 동시 접속 — HTTPS 정상(사내 CA 신뢰 배포 확인)
- [ ] `docker compose restart app` 후 자동 복구(`restart: unless-stopped`)
- [ ] 시스템 다운 시 백업 모드: 엑셀 export(T8.1)로 수기 운용 가능 확인

---

## 2. T11.5 Sentry self-hosted (D8 — 외부 SaaS 금지)

```bash
git clone https://github.com/getsentry/self-hosted sentry-self-hosted
cd sentry-self-hosted && ./install.sh         # 사내망 docker registry 미러 필요
docker compose up -d
```

앱 연동(적용 단계에서 추가):

```bash
npm i @sentry/nextjs          # ⚠️ 신규 의존성 — 루프 범위 밖, 적용 시 별도 PR
npx @sentry/wizard@latest -i nextjs
```

- `.env.prod`: `SENTRY_DSN=http://<self-hosted>/...`, `SENTRY_AUTH_TOKEN=...`
- Source map: 빌드 후 `sentry-cli sourcemaps upload` (릴리스 태그 = git sha)
- Slack 알림: Sentry Alerts → 사내 Slack 웹훅
- **검증(AC T11.5-1)**: 인위적 `throw new Error('sentry-test')` → Sentry 대시보드 표시 + Slack 수신

---

## 3. T11.6 Grafana KSF 6지표 대시보드 (§5.5.3)

데이터소스: PostgreSQL(`KsfDailySnapshot`) + Prometheus(시스템 메트릭, T4.5 기반).

| 패널 | 지표 | 쿼리 소스 | 시각화 |
|---|---|---|---|
| KSF-1 | 납기 준수율 | `ksf1Punctuality` 시계열 | Time series + Stat(현재) |
| KSF-2 | 다이/노즐 변경 | 일별 집계 | Bar |
| KSF-3 | 변동 영향 시간 | 이벤트 분포 | Histogram |
| KSF-4 | 스케줄링 시간 | 자가보고 폼(`/feedback`) | Stat |
| KSF-5 | 일원화율 | `ksf5Unification` | Time series |
| KSF-6 | 채택률 | `ksf6Adoption` | Gauge |

```sql
-- KSF-1 시계열
SELECT date AS time, ksf1Punctuality AS value FROM "KsfDailySnapshot" ORDER BY date;
```

- 알림 룰(AC T11.6-2): `KSF-1 < 0.95` 지속 → 생산관리 Slack 채널
- 대시보드 JSON은 `infra/grafana/provisioning/dashboards/`에 두고 provisioning(적용 단계).

---

## 4. T11.2 k6 부하 테스트 (§5.1 NFR)

```bash
# 설치(사내 미러)
sudo apt-get install k6      # 또는 docker run grafana/k6
k6 run --vus 20 --stage 5m:20 infra/k6/scenario.js
```

`infra/k6/scenario.js` 핵심 — 8개 p95 임계치:

```js
export const options = {
  scenarios: { ramp: { executor: 'ramping-vus', stages: [{ duration: '5m', target: 20 }] } },
  thresholds: {
    'http_req_duration{name:dashboard}': ['p(95)<1500'],
    'http_req_duration{name:nav}':       ['p(95)<500'],
    'http_req_duration{name:impact}':    ['p(95)<5000'],
    'http_req_duration{name:schedule}':  ['p(95)<5000'],
    'http_req_duration{name:drag}':      ['p(95)<500'],
    'http_req_duration{name:upload}':    ['p(95)<30000'],
    'http_req_duration{name:audit}':     ['p(95)<500'],
    'http_req_duration{name:notify}':    ['p(95)<1000'],
    http_req_failed: ['rate<0.005'],   // 오류율 <0.5%
  },
};
```

- **통과 기준(AC T11.2-1)**: 8개 임계치 모두 통과 + 오류율 <0.5%
- CI 통합: 야간 실행 권장(워크플로 추가는 적용 단계).

---

## 5. T11.4 Lighthouse CI (§5.1 LCP·INP)

```bash
npm i -D @lhci/cli      # ⚠️ 신규 의존성 — 적용 시 별도 PR
npx lhci autorun
```

`lighthouserc.js`:

```js
module.exports = {
  ci: {
    collect: { url: ['http://localhost:3000/', 'http://localhost:3000/molding', 'http://localhost:3000/extrusion'] },
    assert: { assertions: {
      'categories:performance': ['error', { minScore: 0.9 }],
      'categories:accessibility': ['error', { minScore: 0.95 }],
    } },
  },
};
```

- 핵심 페이지 W-1(대시보드)·W-4(/molding)·W-5(/extrusion), 임계치 미만 시 PR 차단(적용 단계 CI).

---

## 6. T11.3 보충 — 보안 스캔(코드 CSP는 본 스프린트 적용 완료)

- 의존성: `npm audit --audit-level=high` → high·critical 0건(AC T11.3-1). 적용 단계 CI에 추가.
- OWASP ZAP: 월 1회 자동 스캔(baseline). 사내 네트워크 한정.
- Dependabot 또는 Renovate: 의존성 자동 PR(신규 취약점 1주 내 패치, AC T11.3-F1).
- CSP/보안 헤더는 코드로 적용 완료 → `lib/security/headers.js`, `next.config.js`.

---

## 7. T11.8 백업 · 복구 · 아카이빙 (§5.2 RPO·RTO)

### 7.1 일일 백업 (호스트 cron)

```bash
# /etc/cron.d/evs-backup — 매일 02:00
0 2 * * * evs /opt/evs/scripts/backup.sh >> /var/log/evs-backup.log 2>&1
```

`scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%F)
NAS=/mnt/nas/evs-backup
pg_dump -Fc -h localhost -U evs evs > "$NAS/db-$TS.dump"   # DB
mc mirror --overwrite minio/evs "$NAS/minio-$TS"          # 첨부/PDF
find "$NAS" -name 'db-*.dump' -mtime +365 -delete         # 1년 보존
curl -s -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"EVS 백업 완료 $TS\"}" \
  || curl -s -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"⚠️ EVS 백업 실패 $TS\"}"  # AC T11.8-F1
```

- **AC T11.8-1**: 자정 cron → NAS dump 적재 + 성공/실패 알림.

### 7.2 복구 시뮬 (AC T11.8-2, RTO ≤4h)

```bash
createdb evs_restore
pg_restore -h localhost -U evs -d evs_restore "$NAS/db-<어제>.dump"
# 앱 DATABASE_URL을 evs_restore로 임시 전환 → 핵심 화면 동작 확인 → 측정 ≤4h
```

### 7.3 AuditLog 5년 아카이빙 (AC PM-3-F2)

```sql
-- 매월 1일: 5년 경과 AuditLog를 아카이브 파티션/테이블로 이관 후 원본 정리
INSERT INTO "AuditLogArchive" SELECT * FROM "AuditLog" WHERE timestamp < now() - interval '5 years';
DELETE FROM "AuditLog" WHERE timestamp < now() - interval '5 years';
```

- 보존: AuditLog 5년(법적), 일반 백업 1년. 별도 파티션/스토리지 분리 권장.

---

## 8. 환경변수 인벤토리 (.env.prod)

| 변수 | 용도 | task |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 접속 | 공통 |
| `MES_CLIENT` / `MES_API_KEY` | MES 연동(Sprint 9) | T9.x |
| `ERP_CLIENT` / `ERP_API_KEY` | ERP 연동(Sprint 10) | T10.x |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | 오류 추적 | T11.5 |
| `SLACK_WEBHOOK` | 알림(백업·KSF·Sentry) | T11.5/6/8 |

---

## 9. 회고 메모 (Sprint 11)

- 코드 검증 가능분(T11.1 E2E·T11.3 CSP)은 자동 루프로 완료, 5종 게이트 통과.
- 인프라 task는 본 런북으로 이연 — 사내 서버 준비 후 위 절차로 적용·검증.
- 적용 시 신규 의존성(`@sentry/nextjs`, `@lhci/cli`)·CI 워크플로는 별도 PR로 추가(루프 제약과 분리).
