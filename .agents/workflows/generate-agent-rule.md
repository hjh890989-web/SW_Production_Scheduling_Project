---
name: generate-agent-rule
description: Antigravity 및 Gemini CLI 환경에서 동작하기 위한 .md 룰 파일을 생성하는 표준 가이드
---

# Agent Rule 생성 가이드

## 📋 개요
이 문서는 Antigravity 및 Gemini CLI 환경에서 동작하기 위한 `.md` 룰 파일을 생성하는 표준 가이드를 정의합니다.
모든 새로운 룰은 `.agents/rules/` 디렉토리 내에 생성되어야 하며, 다음 표준을 따라야 합니다.

---

## 🎯 룰 파일 작성 표준

### 1. 파일 명명 규칙 (File Naming)
파일 이름은 `NNN-name.md` 형식을 따릅니다. (NNN = 001–399)

| 번호 범위 | 카테고리 | 설명 |
|:---:|:---:|---|
| **001–099** | Core/Project-wide | 프로젝트 전반에 적용되는 핵심 규칙 |
| **100–199** | Workflow & Integration | 워크플로우, CI/CD, 협업 툴 연동 규칙 |
| **200–299** | Pattern & Style | 코드 패턴, 디자인 패턴, 스타일 가이드 |
| **300–399** | Technology-specific | 특정 프레임워크, 라이브러리, 언어 관련 규칙 |

### 2. 작성 원칙
- **단일 책임 원칙 (SRP)**: 각 룰은 하나의 논리적 목적만 가져야 합니다.
- **간결성**: 본문은 가능한 25줄 이내로 작성하여 핵심만 전달합니다.
- **우선순위**: YAML Frontmatter를 통해 `globs`가 일치하는 파일 편집 시 자동 반영됩니다.

### 3. 메타데이터 설정 (YAML Frontmatter)
파일 상단에 반드시 다음과 같은 YAML 블록을 설정해야 에이전트가 룰의 발동 조건을 인지합니다:
- **globs**: 룰이 적용될 파일 경로 패턴 (예: `**/*.ts`, `src/components/**/*.tsx`)
- **alwaysApply**: `true`로 설정 시 문맥과 관계없이 항상 적용됩니다.

---

## 📝 .md 파일 템플릿

새로운 룰 파일 작성 시 아래 형식을 사용하세요.

```markdown
---
description: [이 룰이 적용되는 상황에 대한 간략한 설명 - 에이전트 판단용]
globs: [적용될 파일 패턴, 예: **/*.ts]
alwaysApply: [true|false]
---
# [룰 이름]

## Context
- [어떤 상황에서 이 룰을 따라야 하는지 설명]

## Rules
- [핵심 규칙 1]
- [핵심 규칙 2]
- [핵심 규칙 3]

## Examples
<example>
[올바른 예시 코드 또는 상황 설명]
</example>

<bad-example>
[피해야 할 패턴 또는 잘못된 예시]
</bad-example>
```

---

## 🚀 생성 프로세스
1. 룰의 목적과 범주(번호 대역)를 결정합니다.
2. `.agents/rules/` 디렉토리에 `NNN-kebab-case-name.md` 파일을 생성합니다.
3. 위 템플릿(YAML Frontmatter 포함)에 맞춰 내용을 작성합니다.
4. 필요시 다른 문서에서 해당 룰을 `@NNN-kebab-case-name.md` 형태로 멘션하여 유기적으로 연결합니다.
