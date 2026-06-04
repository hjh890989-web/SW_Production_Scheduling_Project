'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/auth/login-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const res = await signIn('credentials', {
      username: values.username,
      password: values.password,
      redirect: false,
    });

    if (res?.error) {
      // 잠금/실패 메시지 — 잠금 enforcement·정밀 메시지는 T1.5에서 강화
      setFormError('아이디 또는 비밀번호가 올바르지 않습니다. (5회 실패 시 5분 동안 잠깁니다)');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">사번</Label>
        <Input
          id="username"
          inputMode="numeric"
          autoComplete="username"
          autoFocus
          maxLength={8}
          placeholder="예: 20230101"
          aria-invalid={!!errors.username}
          {...register('username')}
        />
        {errors.username && (
          <p className="text-sm text-red-600" role="alert">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호 (4자리 PIN)</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={4}
            placeholder="초기값 0000"
            aria-invalid={!!errors.password}
            className="pr-16"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-sm text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            {showPassword ? '숨김' : '표시'}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {formError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        style={{ backgroundColor: '#2d6cdf' }}
        className="h-11 text-base text-white hover:opacity-90"
      >
        {isSubmitting ? '로그인 중…' : '로그인'}
      </Button>
    </form>
  );
}
