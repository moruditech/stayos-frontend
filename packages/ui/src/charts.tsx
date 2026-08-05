import React from 'react';

// Minimal, dependency-free SVG charts. Every value rendered by these comes
// from whatever the caller passes in — they do not interpolate, smooth, or
// invent points, so a caller with 3 real data points gets a chart with 3
// real points rather than a misleadingly smooth curve.

export interface AreaChartPoint {
  label: string;
  value: number;
}

export function AreaLineChart({
  data,
  height = 200,
  formatValue,
}: {
  data: AreaChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
}): React.ReactElement {
  const width = 600;
  const padding = 28;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + (1 - (d.value - min) / range) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1]?.x.toFixed(1) ?? 0},${(height - padding).toFixed(1)} L${points[0]?.x.toFixed(1) ?? 0},${(height - padding).toFixed(1)} Z`;

  if (data.length === 0) {
    return <div data-empty-state><div data-empty-state-title>No data yet</div></div>;
  }

  return (
    <div data-chart-container>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-primary)" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {data.map((d, i) => (
          // Skip labels in the middle on dense series so they don't collide
          <span key={i} style={{ fontSize: 11, color: 'var(--color-text-muted)', visibility: data.length > 10 && i % Math.ceil(data.length / 8) !== 0 ? 'hidden' : 'visible' }}>
            {d.label}
          </span>
        ))}
      </div>
      {formatValue ? (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Range: {formatValue(min)} – {formatValue(max)}
        </div>
      ) : null}
    </div>
  );
}

export interface BarChartItem {
  label: string;
  value: number;
  tone?: string;
}

export function HorizontalBarChart({
  data,
  formatValue,
}: {
  data: BarChartItem[];
  formatValue?: (v: number) => string;
}): React.ReactElement {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <div data-empty-state><div data-empty-state-title>No data yet</div></div>;
  }
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} data-dist-row>
          <div data-dist-row-top>
            <span data-dist-label>{d.label}</span>
            <span data-dist-value>{formatValue ? formatValue(d.value) : d.value}</span>
          </div>
          <div data-dist-track>
            <div data-dist-fill style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}): React.ReactElement {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 60;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 150, height: 150, flex: 'none' }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          <g transform="translate(75,75) rotate(-90)">
            <circle r={radius} fill="none" stroke="var(--color-bg-sunk)" strokeWidth={stroke} />
            {data.map((slice, i) => {
              const fraction = slice.value / total;
              const dash = fraction * circumference;
              const gap = circumference - dash;
              const el = (
                <circle
                  key={i}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offsetAcc}
                  strokeLinecap="butt"
                />
              );
              offsetAcc += dash;
              return el;
            })}
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div data-donut-center>
            <span data-donut-center-value>{centerValue}</span>
            <span data-donut-center-label>{centerLabel}</span>
          </div>
        </div>
      </div>
      <div data-chart-legend style={{ marginTop: 0, flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} data-chart-legend-item>
            <span data-chart-legend-dot style={{ background: d.color }} />
            {d.label}
            <span data-chart-legend-value>
              {d.value} ({total ? Math.round((d.value / total) * 1000) / 10 : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
