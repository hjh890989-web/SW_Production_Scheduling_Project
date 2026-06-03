# T11.5 Sentry self-hosted 적용 (D8 — 외부 SaaS 금지)

> ⚠️ `@sentry/nextjs`는 **신규 의존성**이다. 자동 루프 범위 밖이므로 적용 단계에서 별도 PR로 추가한다.
> 아래 `.ts.example`은 코드 게이트(빌드)를 깨지 않도록 확장자를 `.example`로 둔 템플릿이다 — 적용 시 `.ts`로 복사한다.

## 절차

1. 사내 Sentry self-hosted 기동
   ```bash
   git clone https://github.com/getsentry/self-hosted sentry-self-hosted
   cd sentry-self-hosted && ./install.sh   # 사내 registry 미러 필요
   docker compose up -d
   ```
2. 앱에 SDK 추가(별도 PR)
   ```bash
   npm i @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
3. 본 디렉터리의 `sentry.client.config.ts.example` / `sentry.server.config.ts.example` 를
   프로젝트 루트에 `sentry.client.config.ts` / `sentry.server.config.ts` 로 복사.
4. `.env.prod`: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` 설정. Source map 업로드는 빌드 후
   `sentry-cli sourcemaps upload`(릴리스 태그 = git sha).
5. 검증(AC T11.5-1): 인위적 `throw new Error('sentry-test')` → Sentry 대시보드 표시 + Slack 수신.
