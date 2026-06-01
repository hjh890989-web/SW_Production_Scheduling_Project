import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { SEED_USERS, assertSeedPolicy } from './seed-data';
import { seedItems } from './seed-items';
import { seedEquipment } from './seed-equipment';
import { seedOperationParams } from './seed-operation-params';

/**
 * 초기 사용자 시드 (T1.7). `npx prisma db seed`로 실행.
 * 멱등성: username 기준 upsert (AC T1.7-2). 개발 환경 한정.
 */
async function main(): Promise<void> {
  // 정책 위반 시 즉시 중단 (AC T1.7-F1)
  assertSeedPolicy();

  const prisma = new PrismaClient();
  try {
    for (const u of SEED_USERS) {
      const passwordHash = await hashPassword(u.password);
      await prisma.user.upsert({
        where: { username: u.username },
        update: { name: u.name, role: u.role, email: u.email },
        create: {
          username: u.username,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
          passwordChangedAt: new Date(),
        },
      });
      console.log(`  ✓ ${u.username} (${u.role})`);
    }
    console.log(`✅ 시드 완료: ${SEED_USERS.length} 사용자`);

    const itemCount = await seedItems(prisma);
    console.log(`✅ 시드 완료: ${itemCount} 품번 (실리콘)`);

    const equipmentCount = await seedEquipment(prisma);
    console.log(`✅ 시드 완료: ${equipmentCount} 장비`);

    const paramCount = await seedOperationParams(prisma);
    console.log(`✅ 시드 완료: ${paramCount} 운영 파라미터`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ 시드 실패:', err);
  process.exit(1);
});
