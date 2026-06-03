#!/usr/bin/env bash
# T11.8 복구 시뮬 — 어제 백업으로 별도 DB 복원 후 검증(RTO ≤4h, AC T11.8-2).
# 사용: ./restore.sh /mnt/nas/evs-backup/db-2026-06-03_0200.dump
set -euo pipefail

DUMP="${1:?복원할 .dump 경로를 인자로 주세요}"
PGUSER="${PGUSER:-evs}"
PGHOST="${PGHOST:-localhost}"
TARGET="${TARGET_DB:-evs_restore}"

echo "▶ 복원 대상 DB: $TARGET  (소스: $DUMP)"
dropdb   -h "$PGHOST" -U "$PGUSER" --if-exists "$TARGET"
createdb -h "$PGHOST" -U "$PGUSER" "$TARGET"
pg_restore -h "$PGHOST" -U "$PGUSER" -d "$TARGET" "$DUMP"

# 검증: 핵심 테이블 카운트
psql -h "$PGHOST" -U "$PGUSER" -d "$TARGET" -c \
  "SELECT 'Item' t, count(*) FROM \"Item\" UNION ALL SELECT 'Order', count(*) FROM \"Order\" UNION ALL SELECT 'AuditLog', count(*) FROM \"AuditLog\";"

echo "✅ 복원 완료 — 앱 DATABASE_URL을 $TARGET 로 임시 전환해 핵심 화면 동작 확인 후 측정(≤4h)."
