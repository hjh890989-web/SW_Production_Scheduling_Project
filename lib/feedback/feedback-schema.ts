import { z } from 'zod';

/** 베타 사용성 피드백 검증 (T5.12). 만족도 1~5, 의견 5자+. */
export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, { message: '1~5점' }).max(5, { message: '1~5점' }),
  scenario: z.string().trim().min(1, { message: '시나리오를 선택하세요.' }),
  comment: z.string().trim().min(5, { message: '의견을 5자 이상 입력하세요.' }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const BETA_SCENARIOS = ['자동 스케줄 생성', '드래그 재배분(J-MR-2)', '룰 위반 경고', '전반 사용성'] as const;
