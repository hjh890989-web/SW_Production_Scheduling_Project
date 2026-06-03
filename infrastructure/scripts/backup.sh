#!/usr/bin/env bash
# T11.8 일일 백업 — DB(pg_dump) + 객체(MinIO) → 사내 NAS, 1년 보존, 성공/실패 알림.
# cron 예: 0 2 * * *  evs  /opt/evs/infrastructure/scripts/backup.sh >> /var/log/evs-backup.log 2>&1
set -euo pipefail

TS="$(date +%F_%H%M)"
NAS="${NAS_DIR:-/mnt/nas/evs-backup}"
SLACK="${SLACK_WEBHOOK:-}"
PGUSER="${PGUSER:-evs}"
PGDB="${PGDB:-evs}"
PGHOST="${PGHOST:-localhost}"
RETAIN_DAYS="${RETAIN_DAYS:-365}"

notify() { [ -n "$SLACK" ] && curl -s -X POST "$SLACK" -H 'Content-Type: application/json' -d "{\"text\":\"$1\"}" >/dev/null || true; }

mkdir -p "$NAS"
trap 'notify "⚠️ EVS 백업 실패 ($TS) — 로그 확인 필요"' ERR

# 1) DB 덤프(커스텀 포맷)
pg_dump -Fc -h "$PGHOST" -U "$PGUSER" "$PGDB" > "$NAS/db-$TS.dump"

# 2) MinIO 객체 미러(첨부/PDF). mc alias(minio) 사전 설정 필요.
if command -v mc >/dev/null 2>&1; then
  mc mirror --overwrite minio/evs "$NAS/minio-latest"
fi

# 3) 1년 경과 백업 정리
find "$NAS" -name 'db-*.dump' -mtime +"$RETAIN_DAYS" -delete

notify "✅ EVS 백업 완료 ($TS) → $NAS"
echo "backup ok: $TS"
