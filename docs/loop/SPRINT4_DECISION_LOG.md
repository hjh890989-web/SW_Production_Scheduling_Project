# Sprint 4 (T4.1~T4.6) 자동화 루프 의사결정 로그

`/goal` Sprint 4 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델) / **MINOR**(네이밍·디렉터리·UI 디테일·로그 포맷).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 1
MINOR: 1

---

## CORE 결정

### CORE-1 — 알림은 Sprint 3 Notification 모델 재사용(title/link는 payload)
- **결정**: T4.3 `notify({targetUserId,type,title,message,link})`는 신규 모델 없이 Sprint 3 `Notification`을 재사용한다. 명세의 `title`/`link`는 `payload` Json에 저장(스키마 변경 없음). 미확인 카운트는 `read=false && cancelled=false` 기준.
- **근거**: 모델 중복 방지·스키마 안정. 외부 채널(이메일·메신저)은 P1이므로 미구현, 재시도 로직(`retryWithBackoff`)만 제공(AC T4.3-F1).

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍 컨벤션 (Sprint 4)
- 알림 엔진 `lib/notification.ts`(순수)·`lib/notification-actions.ts`(서버액션), KPI cron `lib/cron/`, 메트릭 `app/api/metrics/`, 대시보드 위젯 `components/dashboard/`, 관측 인프라 `docker-compose.yml`·`infrastructure/{grafana,prometheus,loki}/`.

---
