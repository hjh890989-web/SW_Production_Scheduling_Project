import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: '로그인 · EVS 생산 스케줄링',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams; // Next 16: searchParams는 async
  const callbackUrl =
    typeof sp.callbackUrl === 'string' && sp.callbackUrl.startsWith('/')
      ? sp.callbackUrl
      : '/';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-muted/30 p-4">
      {/* 로그인 카드 */}
      <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-sm">
        {/* 서브 로고(EVS) + 서비스명 */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 로고 (서브 로고는 더 크게) */}
          <img src="/check-in-evs-logo.svg" alt="Check In · EVS" className="h-24 w-auto" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">생산 스케줄링</h1>
        </div>

        <hr className="my-5 border-t" />

        <p className="mb-6 text-center text-sm text-muted-foreground">
          사번과 비밀번호(PIN)로 로그인하세요
        </p>

        <LoginForm callbackUrl={callbackUrl} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          초기 비밀번호: <span className="font-semibold text-foreground">0000</span> · 첫 로그인 시 변경됩니다
        </p>
      </div>

      {/* 카드 밖 푸터: 메인 로고(Check In) + 플랫폼명 */}
      <footer className="flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 로고 (서브 로고와 동일 높이 h-16) */}
        <img src="/check-in-main-logo.svg" alt="Check In" className="h-16 w-auto" />
        <p className="text-sm text-muted-foreground">송우산업 사내 업무 자동화 플랫폼</p>
      </footer>
    </main>
  );
}
