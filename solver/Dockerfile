# EVS 성형·압출 솔버 (OR-Tools CP-SAT, T12.1). 사내망 전용 — 외부 호출 없음(D8).
FROM python:3.12-slim

WORKDIR /app

# 의존성 먼저 설치(레이어 캐시 — 소스 변경 시 재설치 회피)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 솔버 소스(*.py만 — __pycache__·.pytest_cache는 자동 제외)
COPY *.py .

EXPOSE 8000

# /health 200 확인 — app·compose가 healthcheck로 공용
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
