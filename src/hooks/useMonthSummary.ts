import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RiskZone {
  status: 'OK' | 'AMARELO' | 'VERMELHO';
  label: string;
}

export interface TopFixedExpense {
  id: string;
  name: string;
  amount: number;
  cancelability_score: number | null;
}

export interface MonthSummary {
  income_floor: number;
  total_expenses: number;
  fixed_total: number;
  flexible_total: number;
  fixed_pct: number;
  rigidity_index: number;
  dscr: number | null;
  dscr_status: string;
  runway_months: number | null;
  adaptive_limit_pct: number;
  above_adaptive_limit: boolean;
  fixed_zone: RiskZone;
  overall_risk: RiskZone;
  by_intention: Record<string, { total: number; fixed: number; flexible: number }>;
  top_fixed_expenses: TopFixedExpense[];
  fixed_growth_warnings: string[];
  warnings: string[];
}

export const useMonthSummary = () => {
  const { session } = useAuth();

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['month-summary', session?.user?.id],
    queryFn: async (): Promise<MonthSummary | null> => {
      if (!session?.access_token) return null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/month-summary`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar resumo');
      }

      return result.data;
    },
    enabled: !!session?.access_token,
    staleTime: 30000, // 30 seconds
  });

  return {
    summary,
    isLoading,
    error,
    refetch,
  };
};
