'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePassword } from '@/lib/actions/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z
  .object({
    currentPassword: z.string().min(1, { message: '현재 비밀번호를 입력하세요.' }),
    newPassword: z
      .string()
      .min(8, { message: '8자 이상이어야 합니다.' })
      .regex(/[A-Za-z]/, { message: '영문을 포함해야 합니다.' })
      .regex(/[0-9]/, { message: '숫자를 포함해야 합니다.' })
      .regex(/[^A-Za-z0-9]/, { message: '특수문자를 포함해야 합니다.' }),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: '새 비밀번호가 일치하지 않습니다.',
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const res = await changePassword(values.currentPassword, values.newPassword);
    setResult(res);
    if (res.ok) reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {(
        [
          ['currentPassword', '현재 비밀번호'],
          ['newPassword', '새 비밀번호'],
          ['confirmPassword', '새 비밀번호 확인'],
        ] as const
      ).map(([name, label]) => (
        <div key={name} className="flex flex-col gap-2">
          <Label htmlFor={name}>{label}</Label>
          <Input id={name} type="password" autoComplete="off" {...register(name)} />
          {errors[name] && (
            <p className="text-sm text-red-600" role="alert">
              {errors[name]?.message}
            </p>
          )}
        </div>
      ))}

      {result && (
        <p
          className={`rounded-md p-3 text-sm ${
            result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
          role="alert"
        >
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-11 text-base">
        {isSubmitting ? '변경 중…' : '비밀번호 변경'}
      </Button>
    </form>
  );
}
