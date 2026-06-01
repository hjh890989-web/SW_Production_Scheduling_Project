import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: '로그인 · EVS 생산 스케줄링',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl =
    typeof searchParams.callbackUrl === 'string' && searchParams.callbackUrl.startsWith('/')
      ? searchParams.callbackUrl
      : '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">EVS 생산 스케줄링</h1>
          <p className="mt-1 text-base text-muted-foreground">사내 계정으로 로그인하세요</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
