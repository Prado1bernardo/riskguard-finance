import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DropIncomeResult {
  income_floor: number;
  drop_pct: number;
  new_income: number;
  fixed_total: number;
  deficit: number;
  breaks: boolean;
  coverage_months: number;
}

interface ProjectionResult {
  monthly_contribution: number;
  annual_return_pct: number;
  target: number;
  months_to_target: number;
  years: number;
  remaining_months: number;
  formatted_time: string;
  final_value: number;
  total_contributed: number;
  total_gains: number;
  gains_percentage: number;
}

export const useSimulations = () => {
  const { session } = useAuth();
  const [isLoadingDrop, setIsLoadingDrop] = useState(false);
  const [isLoadingProjection, setIsLoadingProjection] = useState(false);

  const simulateDropIncome = async (dropPct: number): Promise<DropIncomeResult | null> => {
    if (!session?.access_token) return null;
    setIsLoadingDrop(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulate-drop-income?drop_pct=${dropPct}`,
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
      if (!response.ok) throw new Error(result.error);
      return result.data;
    } catch (error) {
      console.error('Erro na simulação:', error);
      return null;
    } finally {
      setIsLoadingDrop(false);
    }
  };

  const projectFirstMillion = async (
    monthlyContribution: number,
    annualReturnPct: number = 8,
    target: number = 1000000
  ): Promise<ProjectionResult | null> => {
    if (!session?.access_token) return null;
    setIsLoadingProjection(true);

    try {
      const params = new URLSearchParams({
        monthly_contribution: monthlyContribution.toString(),
        annual_return_pct: annualReturnPct.toString(),
        target: target.toString(),
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/projection-first-million?${params}`,
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
      if (!response.ok) throw new Error(result.error);
      return result.data;
    } catch (error) {
      console.error('Erro na projeção:', error);
      return null;
    } finally {
      setIsLoadingProjection(false);
    }
  };

  return {
    simulateDropIncome,
    projectFirstMillion,
    isLoadingDrop,
    isLoadingProjection,
  };
};
