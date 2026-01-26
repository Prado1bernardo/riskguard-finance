import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Expense = Tables<'expenses'>;
export type ExpenseInsert = TablesInsert<'expenses'>;
export type ExpenseUpdate = TablesUpdate<'expenses'>;
export type ExpenseIntention = 'ESSENCIAL' | 'CONFORTO' | 'CRESCIMENTO' | 'PATRIMONIO' | 'LAZER';

// Calculate cancelability score based on expense attributes
export const calculateCancelabilityScore = (expense: Partial<Expense>): number => {
  let score = 100; // Start with max cancelability

  // Reduce score based on contract commitment
  if (expense.contract_months_remaining && expense.contract_months_remaining > 0) {
    score -= Math.min(30, expense.contract_months_remaining * 2);
  }

  // Reduce score based on cancellation fee
  if (expense.cancellation_fee_pct && expense.cancellation_fee_pct > 0) {
    score -= Math.min(25, expense.cancellation_fee_pct / 4);
  }

  // Reduce score if has legal link
  if (expense.has_legal_link) {
    score -= 20;
  }

  // Reduce score if essential obligation
  if (expense.essential_obligation) {
    score -= 15;
  }

  // Reduce based on low substitutability (higher = more substitutable = easier to cancel)
  const substitutability = expense.substitutability ?? 5;
  score -= Math.max(0, (10 - substitutability) * 2);

  // Reduce based on notice days
  if (expense.notice_days && expense.notice_days > 0) {
    score -= Math.min(10, expense.notice_days / 3);
  }

  return Math.max(0, Math.round(score));
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

      const cancelabilityScore = calculateCancelabilityScore(expense);
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          user_id: user.id,
          cancelability_score: cancelabilityScore,
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

      const cancelabilityScore = calculateCancelabilityScore(updates);

      const { data, error } = await supabase
        .from('expenses')
        .update({
          ...updates,
          cancelability_score: cancelabilityScore,
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
    addExpense: addExpense.mutate,
    updateExpense: updateExpense.mutate,
    deleteExpense: deleteExpense.mutate,
    isAdding: addExpense.isPending,
    isUpdating: updateExpense.isPending,
    isDeleting: deleteExpense.isPending,
    totalsByIntention,
    totalExpenses,
  };
};
