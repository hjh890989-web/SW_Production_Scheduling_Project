-- T11.8 AuditLog 5년 아카이빙 (AC PM-3-F2). 월 1회 cron(예: 0 3 1 * *)으로 psql 실행.
-- 5년 경과 AuditLog를 아카이브 테이블로 이관 후 원본 정리. PostgreSQL 운영 DB 전용.

-- 1) 아카이브 테이블(최초 1회 생성, 구조 동일)
CREATE TABLE IF NOT EXISTS "AuditLogArchive" (LIKE "AuditLog" INCLUDING ALL);

-- 2) 5년 경과분 이관(멱등: 이미 옮긴 건 ON CONFLICT 무시 — id PK 기준)
INSERT INTO "AuditLogArchive"
SELECT * FROM "AuditLog"
WHERE "timestamp" < now() - interval '5 years'
ON CONFLICT ("id") DO NOTHING;

-- 3) 원본에서 제거(아카이브 적재 후)
DELETE FROM "AuditLog"
WHERE "timestamp" < now() - interval '5 years';

-- 보존: 운영 AuditLog 5년(법적 R-13), 아카이브는 별도 스토리지/파티션 권장.
