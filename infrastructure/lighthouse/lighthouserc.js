// T11.4 Lighthouse CI 설정 — 핵심 페이지 Performance ≥90 / Accessibility ≥95 (PRD §5.1 LCP·INP).
// 실행: npx @lhci/cli autorun --config=infrastructure/lighthouse/lighthouserc.js
// 주의: @lhci/cli 는 신규 의존성 — 적용 단계에서 `npm i -D @lhci/cli` 추가(루프 범위 밖).
module.exports = {
  ci: {
    collect: {
      // app이 기동된 상태에서 핵심 화면 수집: W-1(대시보드)·W-4(성형)·W-5(압출)
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/molding',
        'http://localhost:3000/extrusion',
      ],
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
