import { describe, it, expect } from 'vitest';
import { feedbackSchema } from './feedback-schema';

describe('feedbackSchema (T5.12)', () => {
  it('정상 입력', () => {
    expect(feedbackSchema.safeParse({ rating: 4, scenario: '드래그 재배분(J-MR-2)', comment: '드래그가 직관적이다' }).success).toBe(true);
  });
  it('rating 범위 밖 거부', () => {
    expect(feedbackSchema.safeParse({ rating: 6, scenario: '전반 사용성', comment: '의견입니다' }).success).toBe(false);
    expect(feedbackSchema.safeParse({ rating: 0, scenario: '전반 사용성', comment: '의견입니다' }).success).toBe(false);
  });
  it('짧은 의견·빈 시나리오 거부', () => {
    expect(feedbackSchema.safeParse({ rating: 3, scenario: '전반 사용성', comment: '짧' }).success).toBe(false);
    expect(feedbackSchema.safeParse({ rating: 3, scenario: '', comment: '충분한 의견' }).success).toBe(false);
  });
});
