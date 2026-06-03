// T11.2 k6 부하 시나리오 — 사용자 20명, 5분 ramp-up, 8개 p95 임계치 (PRD §5.1 NFR).
// 실행: BASE_URL=https://evs.songwoo.local k6 run infrastructure/k6/scenario.js
// 주의: 인프라 산출물 — 5종 코드 게이트 대상 아님(k6 런타임 전용).
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    ramp: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '5m', target: 20 }] },
  },
  thresholds: {
    'http_req_duration{name:dashboard}': ['p(95)<1500'], // 대시보드 ≤1500ms
    'http_req_duration{name:nav}': ['p(95)<500'], // 페이지 전환 ≤500ms
    'http_req_duration{name:impact}': ['p(95)<5000'], // 변동 시뮬 ≤5000ms
    'http_req_duration{name:schedule}': ['p(95)<5000'], // 자동 스케줄 ≤5000ms
    'http_req_duration{name:drag}': ['p(95)<500'], // 슬롯 드래그 ≤500ms
    'http_req_duration{name:upload}': ['p(95)<30000'], // 엑셀 업로드 ≤30s
    'http_req_duration{name:audit}': ['p(95)<500'], // Audit ≤500ms
    'http_req_duration{name:notify}': ['p(95)<1000'], // 알림 ≤1s
    http_req_failed: ['rate<0.005'], // 오류율 <0.5%
  },
};

// 사전: 테스트 계정 쿠키. Auth.js Credentials 로그인 흐름은 환경에 맞게 조정.
export function setup() {
  const res = http.post(`${BASE}/api/auth/callback/credentials`, {
    username: __ENV.K6_USER || 'kimms',
    password: __ENV.K6_PASS || 'Test1234!',
  });
  return { cookies: res.cookies };
}

export default function (data) {
  const params = { cookies: data.cookies };

  group('dashboard', () => {
    http.get(`${BASE}/`, { ...params, tags: { name: 'dashboard' } });
  });
  group('nav', () => {
    http.get(`${BASE}/orders/audit`, { ...params, tags: { name: 'nav' } });
  });
  group('audit', () => {
    http.get(`${BASE}/orders/audit?page=1`, { ...params, tags: { name: 'audit' } });
  });
  group('molding', () => {
    http.get(`${BASE}/molding`, { ...params, tags: { name: 'schedule' } });
  });
  group('impact', () => {
    http.get(`${BASE}/orders/change`, { ...params, tags: { name: 'impact' } });
  });

  check(http.get(`${BASE}/api/health`, { tags: { name: 'notify' } }), { 'health 200': (r) => r.status === 200 });
  sleep(1);
}
