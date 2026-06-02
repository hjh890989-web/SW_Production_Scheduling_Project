/**
 * Prometheus exposition 형식 렌더러 (T4.5). prom-client 미사용(신규 의존성 제한) — 직접 포맷.
 */
export interface MetricSample {
  name: string;
  help: string;
  type: 'gauge' | 'counter';
  value: number;
  labels?: Record<string, string>;
}

function renderLabels(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) return '';
  const inner = Object.entries(labels)
    .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
    .join(',');
  return `{${inner}}`;
}

export function renderPrometheus(samples: MetricSample[]): string {
  const lines: string[] = [];
  for (const s of samples) {
    lines.push(`# HELP ${s.name} ${s.help}`);
    lines.push(`# TYPE ${s.name} ${s.type}`);
    lines.push(`${s.name}${renderLabels(s.labels)} ${s.value}`);
  }
  return `${lines.join('\n')}\n`;
}
