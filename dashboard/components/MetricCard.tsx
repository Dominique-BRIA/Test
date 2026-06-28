interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: number;
  unit?: string;
}

export default function MetricCard({ title, value, delta, unit }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-white border border-muted p-5 flex flex-col gap-1.5">
      <span className="text-xs font-medium text-primary/40 tracking-wide uppercase">
        {title}
      </span>
      <div className="flex items-end gap-2">
        <span className="font-display font-bold text-3xl text-primary leading-tight tabular-nums">
          {value}
          {unit && <span className="text-sm font-normal text-primary/40 ml-1">{unit}</span>}
        </span>
        {delta !== undefined && (
          <span className={`text-xs font-medium mb-1 ${delta >= 0 ? 'text-primary/50' : 'text-primary/30'}`}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
    </div>
  );
}
