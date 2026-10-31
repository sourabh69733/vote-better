import { formatShort } from "@/lib/lok-sabha";

export interface MarginDot { key: string; name: string; margin: number; href?: string }

// Every seat in a state as one dot on a line of winning margins. The highlighted seat is drawn in violet.
export default function MarginStrip({ dots, highlight, state, compact = false }: { dots: MarginDot[]; highlight?: string; state: string; compact?: boolean }) {
  if (!dots.length) return null;
  const max = Math.max(...dots.map((dot) => dot.margin), 1);
  const [x0, x1] = [10, 590];
  const x = (margin: number) => x0 + (margin / max) * (x1 - x0);
  const closest = dots.reduce((a, b) => (b.margin < a.margin ? b : a));
  const marked = dots.find((dot) => dot.key === highlight);
  const height = compact ? 34 : 70;
  const y = compact ? 17 : 38;
  const label = `${dots.length} seats in ${state} by winning margin, from ${formatShort(closest.margin)} votes in ${closest.name} to ${formatShort(max)}.${marked ? ` ${marked.name}: ${formatShort(marked.margin)}.` : ""}`;

  return (
    <svg viewBox={`0 0 600 ${height}`} className="h-auto w-full" role="img" aria-label={label}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#c9d6cb" strokeWidth={1.5} />
      {dots.filter((dot) => dot.key !== highlight).map((dot) => {
        const mark = <circle cx={x(dot.margin)} cy={y} r={compact ? 4 : 5} fill="#1e6b4d" fillOpacity={0.75}><title>{`${dot.name}: won by ${formatShort(dot.margin)} votes`}</title></circle>;
        return dot.href ? <a key={dot.key} href={dot.href}>{mark}</a> : <g key={dot.key}>{mark}</g>;
      })}
      {marked && (
        <g>
          <circle cx={x(marked.margin)} cy={y} r={compact ? 6 : 8} fill="#5b3f8f" stroke="#fff" strokeWidth={2}><title>{`${marked.name}: won by ${formatShort(marked.margin)} votes`}</title></circle>
          {!compact && <text x={Math.min(Math.max(x(marked.margin), 60), 540)} y={14} fontSize={12} fill="#5b3f8f" fontWeight={700} textAnchor="middle">{marked.name}, {formatShort(marked.margin)}</text>}
        </g>
      )}
      {!compact && (
        <g fontSize={11} fill="#66796d">
          <text x={x0} y={66}>Closer</text>
          <text x={x1} y={66} textAnchor="end">Wider win, up to {formatShort(max)} votes</text>
        </g>
      )}
    </svg>
  );
}
