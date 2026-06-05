// prod 배포용 Prisma schema 생성기.
// dev·테스트·CI는 SQLite(prisma/schema.prisma)를 그대로 쓰고, prod만 PostgreSQL을 쓴다.
// 모델 정의는 단일 소스(schema.prisma)에 유지하고 datasource provider만 치환해
// prisma/schema.prod.prisma 를 생성한다(생성물 — gitignore). 모델 변경 시 자동 반영.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'prisma/schema.prisma';
const OUT = 'prisma/schema.prod.prisma';

const src = readFileSync(SRC, 'utf8');
const out = src.replace('provider = "sqlite"', 'provider = "postgresql"');

if (out === src) {
  console.error(`[prisma-prod-schema] '${SRC}'에서 provider = "sqlite" 를 찾지 못했습니다 — 확인 필요.`);
  process.exit(1);
}

writeFileSync(OUT, out);
console.log(`[prisma-prod-schema] ${OUT} 생성 완료 (provider=postgresql, 모델은 schema.prisma와 동일).`);
