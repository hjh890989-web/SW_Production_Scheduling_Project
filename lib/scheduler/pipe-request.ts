/**
 * 관체 요청서 생성 (T5.3 — F-4.5). 순수 함수.
 * 관체수량 = 회전수 × 앵글당금형수 × 합금형. 압출 deadline = 성형투입일 - 1일.
 * 합금형 정보 없으면 기본값 1 + 경고(AC T5.3-F1, Sprint 2 미저장분 보완 전제).
 */
export interface PipeRequestItem {
  moldsPerAngle: number;
  alloyMold: number | null; // 합금형
}

export interface ScheduleForPipe {
  itemId: string;
  productCode: string;
  date: string; // YYYY-MM-DD 성형 투입일
  rotations: number;
}

export interface PipeRequest {
  itemId: string;
  productCode: string;
  moldingDate: string;
  extrusionDeadline: string; // 성형투입 - 1
  pipeQuantity: number;
}

export interface PipeResult {
  requests: PipeRequest[];
  warnings: { itemId: string; reason: string }[];
}

/** YYYY-MM-DD에서 하루 전(UTC). */
export function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function generatePipeRequests(
  schedules: ScheduleForPipe[],
  items: Record<string, PipeRequestItem>,
): PipeResult {
  const requests: PipeRequest[] = [];
  const warnings: { itemId: string; reason: string }[] = [];
  const warnedAlloy = new Set<string>();

  for (const s of schedules) {
    const item = items[s.itemId];
    if (!item) {
      warnings.push({ itemId: s.itemId, reason: '품번 마스터 없음 — 관체 요청 생략' });
      continue;
    }
    let alloy = item.alloyMold;
    if (alloy == null || alloy <= 0) {
      alloy = 1; // 기본값 (AC T5.3-F1)
      if (!warnedAlloy.has(s.itemId)) {
        warnings.push({ itemId: s.itemId, reason: '합금형 정보 없음 — 기본값 1 적용, 마스터 보완 필요' });
        warnedAlloy.add(s.itemId);
      }
    }
    requests.push({
      itemId: s.itemId,
      productCode: s.productCode,
      moldingDate: s.date,
      extrusionDeadline: previousDay(s.date),
      pipeQuantity: s.rotations * item.moldsPerAngle * alloy,
    });
  }

  return { requests, warnings };
}
