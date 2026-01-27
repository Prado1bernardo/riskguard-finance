import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface RiskZone {
  status: 'OK' | 'AMARELO' | 'VERMELHO';
  label: string;
}

interface RiskCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  zone?: RiskZone;
  icon?: React.ReactNode;
}

const ZONE_STYLES = {
  OK: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  },
  AMARELO: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  },
  VERMELHO: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
};

export const RiskCard = ({ title, value, subtitle, zone, icon }: RiskCardProps) => {
  const styles = zone ? ZONE_STYLES[zone.status] : null;

  return (
    <div 
      className={cn(
        'rounded-lg border p-4 transition-all',
        styles?.border ?? 'border-border',
        styles?.bg ?? 'bg-card'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {(icon || (zone && styles)) && (
          <div className="ml-2">
            {icon ?? styles?.icon}
          </div>
        )}
      </div>
      {zone && (
        <div className="mt-2 pt-2 border-t border-inherit">
          <span className="text-xs font-medium">{zone.label}</span>
        </div>
      )}
    </div>
  );
};
