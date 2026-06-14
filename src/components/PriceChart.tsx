import type { HistoryPoint } from "../types";

export function PriceChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return <div className="chart-empty">该时间范围暂无成交价格</div>;

  const width = 800;
  const height = 260;
  const padding = 18;
  const values = points.map((point) => Number(point.p));
  const min = Math.max(0, Math.min(...values) - 0.03);
  const max = Math.min(1, Math.max(...values) + 0.03);
  const range = Math.max(0.05, max - min);
  const line = points
    .map((point, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((Number(point.p) - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${line} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  return (
    <div className="price-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="价格走势图">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#61e5a6" stopOpacity=".25" />
            <stop offset="100%" stopColor="#61e5a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartFill)" />
        <path d={line} fill="none" stroke="#61e5a6" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-range"><span>{Math.round(max * 100)}%</span><span>{Math.round(min * 100)}%</span></div>
    </div>
  );
}
