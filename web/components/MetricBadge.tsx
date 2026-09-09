import { getSeverityColor } from '../lib/translations';

interface MetricBadgeProps {
  label: string;
  value: string | number;
  severity: 'good' | 'medium' | 'high';
}

export default function MetricBadge({ label, value, severity }: MetricBadgeProps) {
  const colorClass = getSeverityColor(severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'good');
  
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClass} flex items-center gap-2`}>
      <span>{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
