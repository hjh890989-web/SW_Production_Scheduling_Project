# Sprint 4 (T4.1~T4.6) 자동화 루프 의사결정 로그

`/goal` Sprint 4 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델) / **MINOR**(네이밍·디렉터리·UI 디테일·로그 포맷).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 2
MINOR: 1

---

## CORE 결정

### CORE-1 — 알림은 Sprint 3 Notification 모델 재사용(title/link는 payload)
- **결정**: T4.3 `notify({targetUserId,type,title,message,link})`는 신규 모델 없이 Sprint 3 `Notification`을 재사용한다. 명세의 `title`/`link`는 `payload` Json에 저장(스키마 변경 없음). 미확인 카운트는 `read=false && cancelled=false` 기준.
- **근거**: 모델 중복 방지·스키마 안정. 외부 채널(이메일·메신저)은 P1이므로 미구현, 재시도 로직(`retryWithBackoff`)만 제공(AC T4.3-F1).

### CORE-2 — KsfDailySnapshot 모델 + node-cron, 산출 가능한 KSF만 적재
- **결정**: `KsfDailySnapshot`(date PK, ksf1/ksf5/ksf6 Float?) 추가. 매일 23:55 node-cron(`registerKsfCron`). 현재는 KSF-5(일원화율)만 산출, KSF-1(납기율)·KSF-6(채택률)은 ProductionResult/수동보정 데이터(Sprint 5/6) 이후 채움(현재 null).
- **근거**: 선행 데이터 부재. cron은 import 시 자동 실행 안 함(빌드/테스트 안전), 서버 기동 시 명시 등록 + ADMIN 수동 트리거(triggerKsfSnapshot) 제공. DB 실패 시 retryWithBackoff 3회(AC T4.4-F1).

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍 컨벤션 (Sprint 4)
- 알림 엔진 `lib/notification.ts`(순수)·`lib/notification-actions.ts`(서버액션), KPI cron `lib/cron/`, 메트릭 `app/api/metrics/`, 대시보드 위젯 `components/dashboard/`, 관측 인프라 `docker-compose.yml`·`infrastructure/{grafana,prometheus,loki}/`.

---
