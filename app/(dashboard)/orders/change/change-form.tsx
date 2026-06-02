'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changeSchema, CHANGE_TYPES, type ChangeInput } from '@/lib/orders/change-schema';
import { submitOrderChange, cancelOrderChange } from '@/lib/orders/change-actions';

export function ChangeForm({ productCodes }: { productCodes: string[] }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<{ orderId: string; notificationId: string } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean; master?: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangeInput>({ resolver: zodResolver(changeSchema), defaultValues: { changeType: '수량' } });

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function onSubmit(values: ChangeInput) {
    setMsg(null);
    startTransition(async () => {
      const res = await submitOrderChange(values);
      if (res.ok && res.orderId && res.notificationId) {
        setSaved({ orderId: res.orderId, notificationId: res.notificationId });
        setCountdown(5);
        setMsg({ text: res.message, ok: true });
        reset({ changeType: '수량' });
      } else {
        setMsg({ text: res.message, ok: false, master: res.needsMaster });
      }
    });
  }

  function cancel() {
    if (!saved) return;
    startTransition(async () => {
      const res = await cancelOrderChange(saved.notificationId, saved.orderId);
      setMsg({ text: res.message, ok: res.ok });
      setSaved(null);
      setCountdown(0);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="productCode">품번</Label>
        <Input id="productCode" list="item-codes" autoComplete="off" {...register('productCode')} />
        <datalist id="item-codes">
          {productCodes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {errors.productCode && <p className="text-sm text-red-600">{errors.productCode.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="changeType">변경 유형</Label>
        <select
          id="changeType"
          {...register('changeType')}
          className="h-11 rounded-md border border-input bg-background px-3 text-base"
        >
          {CHANGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newValue">신규 값 (수량 숫자 / 일자 YYYY-MM-DD)</Label>
        <Input id="newValue" {...register('newValue')} />
        {errors.newValue && <p className="text-sm text-red-600">{errors.newValue.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">사유</Label>
        <Input id="reason" {...register('reason')} />
        {errors.reason && <p className="text-sm text-red-600">{errors.reason.message}</p>}
      </div>

      {msg && (
        <div className={`rounded-md p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
          {msg.master && (
            <Link href="/master/items" className="ml-2 underline">
              마스터 등록 →
            </Link>
          )}
        </div>
      )}

      {saved && countdown > 0 ? (
        <Button type="button" variant="destructive" onClick={cancel} className="h-11 text-base">
          취소 ({countdown}초)
        </Button>
      ) : (
        <Button type="submit" disabled={pending} className="h-11 text-base">
          {pending ? '저장 중…' : '변동 저장'}
        </Button>
      )}
    </form>
  );
}
