import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

// ESLint 9 flat config (eslint-config-next 16 peer: eslint>=9).
// 기존 .eslintrc.json의 extends ["next/core-web-vitals","next/typescript"]를
// config-next 16의 native flat config 진입점으로 1:1 이식(FlatCompat 불필요).
const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    // eslint-plugin-react-hooks 7(config-next 16 동반)의 React Compiler 지향 신규 규칙 정책.
    // 이 프로젝트는 React 18.3 + 컴파일러 미사용이며 RHF·TanStack(CLAUDE.md 표준 스택) 사용이
    // incompatible-library 영구 경고를 유발한다. 컴파일러 도입(Phase 2) 시 재활성·재검토.
    rules: {
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
