# EVS Phase 2 인프라 런북 (Sprint 12 외부 서비스)

> Sprint 12의 외부 실서비스 task를 **사내 인프라에서 적용하기 위한 절차서**다. 코드 저장소 자동화 루프에서는 실행 불가(별도 언어 런타임·LLM 서버·디렉터리 서비스 필요)하므로 이연(런북화)한다.
> 코드 측 추상화(`ISolverEngine`·`ILlmProvider`·자재 확대·PWA)는 본 스프린트에서 구현·머지 완료. 아래는 그 추상화 뒤에 붙일 실 서비스 구성이다.
> 적용 환경: Ubuntu 22.04 사내 서버, 사내망 전용. 외부 LLM SaaS는 금지(D8) — LLM은 사내 Ollama만 허용.

---

## 0. 적용 체크리스트

- [ ] T12.1 Python FastAPI + OR-Tools 솔버 마이크로서비스(12.1.1/1.2/1.4)
- [ ] T12.2 OR-Tools 성형·압출 모델 + pytest(12.2.1~2.5)
- [ ] T12.3 솔버 부하·정확도 검증(12.3.3/3.4)
- [ ] T12.4 AD/LDAP SSO(12.4.1~4.4)
- [ ] T12.7 Ollama 배포 + 자연어 변동 입력(12.7.1/7.3/7.4)

> ⚠️ 신규 npm/pip 의존성·`.github/workflows`·docker-compose 변경은 적용 단계에서 별도 PR로 추가(루프 범위 밖).

---

## 1. T12.1 / T12.2 OR-Tools 솔버 마이크로서비스

코드 측 연동점: `lib/scheduler/solver-client.ts`(`ISolverEngine`, env `SOLVER_URL`, timeout 30s, zod 응답 스키마). 아래 서비스를 띄우고 실 HTTP 어댑터를 추가하면 Mock을 대체한다.

### 1.1 FastAPI 스켈레톤 (solver/app.py)

```python
from fastapi import FastAPI
from pydantic import BaseModel
from ortools.sat.python import cp_model

app = FastAPI()

class SolverInput(BaseModel):
    weekStart: str
    demands: list[dict]  # {itemId, quantity, dueDate}

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/schedule/molding')
def schedule_molding(inp: SolverInput):
    model = cp_model.CpModel()
    # ... 변수·제약(슬롯 위치 O/X, D-2 납기, 가류기 용량) ...
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 25  # 30s 클라이언트 timeout 내
    # status = solver.Solve(model)
    return {'engine': 'solver', 'assignments': [], 'objective': 0, 'warnings': []}
```

### 1.2 인증·헬스 (12.1.2)

- `/health` 200 확인 후에만 클라이언트가 솔버 사용(아니면 룰 fallback).
- API key 헤더(`x-solver-key`) 또는 사내망 IP 화이트리스트.

### 1.3 docker-compose 솔버 (12.1.4)

```yaml
solver:
  build: ./solver           # python:3.12-slim + pip install ortools fastapi uvicorn
  restart: unless-stopped
  environment: { SOLVER_KEY_FILE: /run/secrets/solver_key }
  # app 서비스에 SOLVER_URL=http://solver:8000 주입
```

### 1.4 OR-Tools 모델 + pytest (12.2.x)

- 성형(12.2.1): 슬롯 위치 X 배치 0건·납품 D-2 완료를 제약으로(룰 스케줄러와 동일 불변식).
- 압출(12.2.2): E그룹·헤드핀 묶음으로 다이/노즐 변경 최소화를 목적함수로.
- pytest(12.2.3): 정상·infeasible·timeout 시나리오.
- 룰 대비 비교(12.2.4): 동일 입력에 솔버 vs 룰 목적값·위반수 비교표.

---

## 2. T12.3 솔버 부하·정확도 검증

- 부하(12.3.3): k6로 `/schedule/molding` p95 ≤ 30s, 동시 5요청 오류율 <0.5%.
- 정확도(12.3.4): 과거 확정 스케줄 N주를 입력해 솔버 결과의 납기 위반·변경 횟수가 룰 대비 개선되는지 회귀 검증. 토글(T12.3.1, 구현 완료)로 현장 A/B.

---

## 3. T12.4 AD/LDAP SSO

코드 측: 현재 Auth.js Credentials(자체 사용자 테이블). 아래로 점진 이행.

- 12.4.1 AD 검토: 사내 AD 도메인·OU·그룹↔6 Role 매핑 표 확정.
- 12.4.2 LDAP provider: Auth.js에 LDAP provider 추가(`ldapjs`), 사내 LDAPS(636) 바인드.
- 12.4.3 로컬→SSO 마이그레이션: username 키 매칭, 비밀번호는 AD 위임(자체 해시 폐기), 잠금정책도 AD로.
- 12.4.4 SSO 통합 테스트: 로그인·그룹 변경 시 Role 반영·로그아웃·세션 무효화.

```
사용자 → LDAPS 바인드(사내 AD) → 그룹 조회 → Role 매핑 → JWT 세션
```

---

## 4. T12.7 Ollama LLM (사내 self-hosted)

코드 측 연동점: `lib/llm/factory.ts`(`ILlmProvider`, env `OLLAMA_URL`). 외부 LLM SaaS 금지(D8) — 사내 Ollama만.

### 4.1 Ollama 배포 (12.7.1)

```yaml
ollama:
  image: ollama/ollama
  restart: unless-stopped
  volumes: ["ollama:/root/.ollama"]
  # GPU 없으면 작은 모델(예: qwen2.5:3b-instruct) — ≤30초 응답 목표
```

```bash
docker exec -it ollama ollama pull qwen2.5:3b-instruct
# app에 OLLAMA_URL=http://ollama:11434 주입 → OllamaProvider 구현으로 Mock 대체
```

### 4.2 자연어 변동 입력 (12.7.3)

- 입력: "25490-03HA0 100개 6월 5일로 당겨줘" → 구조화 JSON(품번·수량·납기) 파싱.
- `ILlmProvider.complete`로 추출 → 기존 변동 입력(W-3) 폼에 프리필 → 사용자 확인 후 적용(자동 확정 금지).
- 모든 호출은 사내 Ollama 경유, 프롬프트·응답 audit.

### 4.3 비용·정확도 검증 (12.7.4)

- 정확도: 라벨링된 변동 문장 세트로 추출 정확도 측정(품번·수량·날짜 필드별).
- 비용: 사내 GPU/CPU 토큰 처리율·지연(p95 ≤ 30s) 측정. 외부 과금 없음(self-hosted).

---

## 5. 환경변수 (Phase 2 추가)

| 변수 | 용도 | task |
|---|---|---|
| `SOLVER_URL` | OR-Tools 솔버 엔드포인트 | T12.1.3(연동점 구현됨) |
| `OLLAMA_URL` | 사내 Ollama 엔드포인트 | T12.7.2(연동점 구현됨) |
| `LDAP_URL` / `LDAP_BIND_DN` | 사내 AD/LDAP | T12.4 |

---

## 6. 회고 메모 (Sprint 12)

- 코드 가능분(자재 확대 12.6, PWA 12.5, 솔버/LLM 어댑터·토글)은 자동 루프로 구현·머지, 5종 게이트 통과.
- 외부 실서비스(Python 솔버·Ollama·AD/LDAP)는 본 런북으로 이연 — 인프라 준비 후 위 절차로 실 어댑터를 추상화 뒤에 연결.
- 추상화(`ISolverEngine`·`ILlmProvider`)가 이미 머지돼 있어, 실 서비스 도입 시 Mock만 교체하면 됨(앱 코드 변경 최소).
