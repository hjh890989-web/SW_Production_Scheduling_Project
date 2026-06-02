'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitFeedback } from '@/lib/feedback/feedback-actions';

export function FeedbackForm({ scenarios }: { scenarios: string[] }) {
  const [rating, setRating] = useState('4');
  const [scenario, setScenario] = useState(scenarios[0] ?? '');
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await submitFeedback({ rating: Number(rating), scenario, comment });
      setMsg({ text: res.message, ok: res.ok });
      if (res.ok) setComment('');
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="scenario">시나리오</Label>
        <select
          id="scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-base"
        >
          {scenarios.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rating">만족도 (1~5)</Label>
        <Input id="rating" type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="comment">의견</Label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="rounded-md border border-input bg-background p-2 text-base"
          placeholder="드래그가 직관적인지, 경고가 명확한지 등"
        />
      </div>

      {msg && (
        <p className={`rounded-md p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} role="alert">
          {msg.text}
        </p>
      )}

      <Button onClick={submit} disabled={pending} className="h-11 text-base">
        {pending ? '제출 중…' : '피드백 제출'}
      </Button>
    </div>
  );
}
