import { cn } from '@/lib/utils';

interface RiskZone {
  status: 'OK' | 'AMARELO' | 'VERMELHO';
  label: string;
}

interface RiskGaugeProps {
  value: number;
  maxValue?: number;
  zone: RiskZone;
  label: string;
  suffix?: string;
  showThresholds?: boolean;
}

const ZONE_COLORS = {
  OK: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    bgLight: 'bg-emerald-50',
  },
  AMARELO: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-200',
    bgLight: 'bg-amber-50',
  },
  VERMELHO: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-200',
    bgLight: 'bg-red-50',
  },
};

export const RiskGauge = ({ 
  value, 
  maxValue = 100, 
  zone, 
  label, 
  suffix = '%',
  showThresholds = true 
}: RiskGaugeProps) => {
  const colors = ZONE_COLORS[zone.status];
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className={cn('rounded-lg border p-4', colors.border, colors.bgLight)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', colors.bg, 'text-white')}>
          {zone.label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-3">
        <span className={cn('text-3xl font-bold', colors.text)}>
          {value.toFixed(1)}
        </span>
        <span className="text-muted-foreground">{suffix}</span>
      </div>

      {/* Progress bar with zones */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {showThresholds && (
          <>
            {/* Zone markers */}
            <div className="absolute inset-0 flex">
              <div className="w-[30%] bg-emerald-200" />
              <div className="w-[10%] bg-amber-200" />
              <div className="flex-1 bg-red-200" />
            </div>
          </>
        )}
        {/* Current value indicator */}
        <div 
          className={cn('absolute h-full transition-all duration-500', colors.bg)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showThresholds && (
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>30%</span>
          <span>40%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};
