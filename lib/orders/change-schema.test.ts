import { describe, it, expect } from 'vitest';
import { changeSchema } from './change-schema';

describe('changeSchema (T3.8)', () => {
  it('정상 입력 통과', () => {
    const r = changeSchema.safeParse({ productCode: '25490-03HA0', changeType: '수량', newValue: '500', reason: '고객 요청' });
    expect(r.success).toBe(true);
  });

  it('짧은 품번 거부', () => {
    expect(changeSchema.safeParse({ productCode: 'ab', changeType: '수량', newValue: '5', reason: '사유' }).success).toBe(false);
  });

  it('미정의 변경유형 거부', () => {
    expect(changeSchema.safeParse({ productCode: 'P1', changeType: '기타', newValue: '5', reason: '사유' }).success).toBe(false);
  });

  it('빈 신규값·사유 거부', () => {
    expect(changeSchema.safeParse({ productCode: 'P1234', changeType: '취소', newValue: '', reason: '사유' }).success).toBe(false);
    expect(changeSchema.safeParse({ productCode: 'P1234', changeType: '수량', newValue: '5', reason: '' }).success).toBe(false);
  });
});
