import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
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
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">비밀번호 변경</h1>
          <p className="mt-1 text-base text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
        </div>

        {session.user.mustChangePassword && (
          <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800" role="status">
            초기 비밀번호(0000)를 사용 중입니다. 새 4자리 PIN으로 변경해야 다른 화면을 이용할 수 있습니다.
          </p>
        )}

        {due && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800" role="status">
            비밀번호를 변경한 지 90일이 지났습니다. 보안을 위해 변경을 권장합니다.
          </p>
        )}

        <ChangePasswordForm />

        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
          className="text-center"
        >
          <button
            type="submit"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            로그아웃
          </button>
        </form>
      </main>

      <footer className="mt-auto flex flex-col items-center gap-2 border-t py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 로고(공통 Check In) */}
        <img src="/check-in-main-logo.svg" alt="Check In" className="h-10 w-auto" />
        <p className="text-sm text-muted-foreground">송우산업 사내 업무 자동화 플랫폼</p>
      </footer>
    </div>
  );
}
