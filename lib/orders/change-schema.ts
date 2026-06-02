import { z } from 'zod';

export const CHANGE_TYPES = ['수량', '일자', '추가', '취소'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

/** 변동 입력 폼 검증 (T3.8). 품번≥3, 변경유형 enum, 신규값·사유 필수. */
export const changeSchema = z.object({
  productCode: z.string().trim().min(3, { message: '품번은 3자 이상이어야 합니다.' }),
  changeType: z.enum(CHANGE_TYPES),
  newValue: z.string().trim().min(1, { message: '신규 값을 입력하세요.' }),
  reason: z.string().trim().min(2, { message: '사유를 입력하세요.' }),
});

export type ChangeInput = z.infer<typeof changeSchema>;
