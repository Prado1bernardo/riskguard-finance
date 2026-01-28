import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Expense = Tables<'expenses'>;
export type ExpenseInsert = TablesInsert<'expenses'>;
export type ExpenseUpdate = TablesUpdate<'expenses'>;
export type ExpenseIntention = 'ESSENCIAL' | 'CONFORTO' | 'CRESCIMENTO' | 'PATRIMONIO' | 'LAZER';

// Interface for Edge Function response
interface ComputeExpenseResponse {
  success: boolean;
  data?: {
    cancelability_score: number;
    computed_rigidity: 'FIXO' | 'FLEXIVEL';
    rigidity_effective: 'FIXO' | 'FLEXIVEL';
    warnings: string[];
    computed_at: string;
  };
  error?: string;
}

// Call the Edge Function to compute score (server-side only - anti-bypass)
export const computeExpenseScore = async (expense: Partial<Expense>): Promise<ComputeExpenseResponse> => {
  const body = {
    name: expense.name || 'Unnamed',
    amount: expense.amount || 0,
    intention: expense.intention,
    contract_months_remaining: expense.contract_months_remaining ?? 0,
    notice_days: expense.notice_days ?? 0,
    cancellation_fee_pct: expense.cancellation_fee_pct ?? 0,
    has_legal_link: expense.has_legal_link ?? false,
    essential_obligation: expense.essential_obligation ?? false,
    substitutability: expense.substitutability ?? 5,
    override_rigidity: expense.override_rigidity,
    override_reason: expense.override_reason,
  };

  const invokeOnce = async () => {
    return supabase.functions.invoke('compute-expense', { body });
  };

  // Retry once on transient fetch/cold-start issues; also refresh session once on 401.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await invokeOnce();

    if (!error) return data as ComputeExpenseResponse;

    const msg = (error as any)?.message ?? '';
    const status = (error as any)?.status;
    const isUnauthorized = status === 401 || status === 403 || /jwt|unauthor/i.test(msg);

    if (isUnauthorized && attempt === 0) {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // ignore and fall through to return the original error
      }
      continue;
    }

    const isTransient = /failed to fetch|failed to send/i.test(msg);
    if (isTransient && attempt === 0) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }

    console.error('Error computing expense:', error);
    return { success: false, error: msg || 'Erro ao calcular despesa' };
  }

  return { success: false, error: 'Erro ao calcular despesa' };
};

export const useExpenses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addExpense = useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, 'user_id'>) => {
      if (!user?.id) throw new Error('No user');

      // Compute score server-side (anti-bypass)
      const computeResult = await computeExpenseScore(expense);
      if (!computeResult.success || !computeResult.data) {
        throw new Error(computeResult.error || 'Erro ao calcular score');
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          user_id: user.id,
          cancelability_score: computeResult.data.cancelability_score,
          computed_rigidity: computeResult.data.rigidity_effective,
          warnings: computeResult.data.warnings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate & { id: string }) => {
      if (!user?.id) throw new Error('No user');

      // Compute score server-side (anti-bypass)
      const computeResult = await computeExpenseScore(updates);
      if (!computeResult.success || !computeResult.data) {
        throw new Error(computeResult.error || 'Erro ao calcular score');
      }

      const { data, error } = await supabase
        .from('expenses')
        .update({
          ...updates,
          cancelability_score: computeResult.data.cancelability_score,
          computed_rigidity: computeResult.data.rigidity_effective,
          warnings: computeResult.data.warnings,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    },
  });

  // Calculate totals by intention
  const totalsByIntention = expenses.reduce((acc, expense) => {
    acc[expense.intention] = (acc[expense.intention] || 0) + expense.amount;
    return acc;
  }, {} as Record<ExpenseIntention, number>);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    expenses,
    isLoading,
    error,
    // Prefer async variants in UI so we can await + show real errors
    addExpense: addExpense.mutate,
    addExpenseAsync: addExpense.mutateAsync,
    updateExpense: updateExpense.mutate,
    updateExpenseAsync: updateExpense.mutateAsync,
    deleteExpense: deleteExpense.mutate,
    deleteExpenseAsync: deleteExpense.mutateAsync,
    isAdding: addExpense.isPending,
    isUpdating: updateExpense.isPending,
    isDeleting: deleteExpense.isPending,
    totalsByIntention,
    totalExpenses,
  };
};
