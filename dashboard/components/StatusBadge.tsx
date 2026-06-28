interface StatusBadgeProps {
  code: number;
}

export default function StatusBadge({ code }: StatusBadgeProps) {
  const isOk    = code < 300;
  const isWarn  = code >= 300 && code < 500;

  const dotColor = isOk ? 'bg-primary/50' : isWarn ? 'bg-primary/30' : 'bg-primary/20';
  const textColor = isOk ? 'text-primary' : 'text-primary/50';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono font-medium bg-primary/[0.05] ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      {code}
    </span>
  );
}
