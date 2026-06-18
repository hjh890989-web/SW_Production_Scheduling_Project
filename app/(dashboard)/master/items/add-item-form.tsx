'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createItem } from '@/lib/master/item-actions';
import { MATERIALS, MATERIAL_LABEL } from '@/lib/material/material';

export function AddItemForm() {
  const [open, setOpen] = useState(false);
  const [productCode, setProductCode] = useState('');
  const [material, setMaterial] = useState<string>('silicone');
  const [customerCode, setCustomerCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMsg(null);
    if (productCode.trim().length < 3) {
      setMsg({ ok: false, text: '품번을 3자 이상 입력하세요.' });
      return;
    }
    startTransition(async () => {
      const res = await createItem({ productCode, material, customerCode });
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) {
        setProductCode('');
        setCustomerCode('');
      }
    });
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3 text-left text-sm font-medium"
      >
        {open ? '− 신규 품번 추가 닫기' : '+ 신규 품번 추가'}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm">
              품번 *
              <Input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                placeholder="예: 25474-2S010"
                className="w-52"
              />
            </label>
            <label className="flex flex-col text-sm">
              자재
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-base"
              >
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>
                    {MATERIAL_LABEL[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              고객사 품번
              <Input
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="(선택)"
                className="w-52"
              />
            </label>
            <Button onClick={submit} disabled={pending} className="h-10">
              {pending ? '등록 중…' : '등록'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            압출/성형 제약(E그룹·헤드핀·재단길이 등)은 등록 후 아래 표에서 인라인 편집하세요. 등록만으로
            기존 수주가 채워지진 않으며, 미매칭이던 수주를 반영하려면 해당 엑셀을 다시 업로드해야 합니다.
          </p>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`} role="alert">
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
