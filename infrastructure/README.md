# EVS 인프라 산출물 (infrastructure/)

사내 서버 출시에 필요한 **실제 적용 가능한 구성 파일**. 절차·검증 기준은 [docs/operations.md](../docs/operations.md), Phase 2는 [docs/operations-phase2.md](../docs/operations-phase2.md) 참조.

> 인프라 정의 — 5종 코드 게이트 대상 아님(런타임 검증은 사내 서버에서).

## 구성

| 경로 | 용도 | task |
|---|---|---|
| `docker-compose.prod.yml` | 운영 스택(app·postgres·minio·nginx·prometheus·loki·promtail·grafana) | T11.7 |
| `nginx/nginx.conf` | TLS 종단·IP 화이트리스트·app 프록시 | T11.7 |
| `nginx/ssl/` | 사내 CA 인증서(gitignore — 서버에 직접 배치) | T11.7 |
| `prometheus/` `loki/` `promtail/` | 관측(기존, Sprint 4 T4.5) | T4.5 |
| `grafana/dashboards/ksf.json` | KSF 6지표 비즈니스 대시보드 | T11.6 |
| `grafana/dashboards/{app,db,http,system}.json` | 시스템 대시보드(기존) | T4.5 |
| `k6/scenario.js` | 부하 테스트(8 p95 임계치) | T11.2 |
| `lighthouse/lighthouserc.js` | Lighthouse CI 설정(Perf≥90/A11y≥95) | T11.4 |
| `scripts/backup.sh` `restore.sh` | 일일 백업·복구(RTO≤4h) | T11.8 |
| `sql/archive-auditlog.sql` | AuditLog 5년 아카이빙 | T11.8 |
| `sentry/*.example` | Sentry 설정 템플릿(@sentry/nextjs 별도 PR) | T11.5 |
| `../.env.prod.example` | 운영 환경변수 템플릿 | T11.7 |

## 적용 순서(요약)

```bash
cp .env.prod.example .env.prod          # 값 채우기
mkdir -p infrastructure/nginx/ssl        # 사내 CA evs.crt/evs.key 배치
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.prod up -d
# 마이그레이션/시드: docker compose exec app npx prisma migrate deploy
```

## 신규 의존성 필요(적용 단계 별도 PR)

- `@sentry/nextjs` (T11.5) · `@lhci/cli` (T11.4) · k6 바이너리(T11.2) · OWASP ZAP(T11.3)
- CI 자동화(`npm audit`·Lighthouse·k6)를 GitHub Actions로 넣으려면 `.github/workflows` 추가 필요.
