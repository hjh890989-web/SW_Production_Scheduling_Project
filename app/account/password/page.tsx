import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isPasswordChangeDue, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/password-policy';
import { ChangePasswordForm } from './change-password-form';

export const metadata: Metadata = { title: '비밀번호 변경 · EVS' };
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/account/password');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordChangedAt: true },
  });
  const due = isPasswordChangeDue(user?.passwordChangedAt ?? null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">비밀번호 변경</h1>
        <p className="mt-1 text-base text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
      </div>

      {due && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800" role="status">
          비밀번호를 변경한 지 90일이 지났습니다. 보안을 위해 변경을 권장합니다.
        </p>
      )}

      <ChangePasswordForm />
    </main>
  );
}
