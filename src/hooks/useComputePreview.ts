import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExpensePreviewInput {
  name: string;
  amount: number;
  intention?: string;
  contract_months_remaining?: number;
  notice_days?: number;
  cancellation_fee_pct?: number;
  has_legal_link?: boolean;
  essential_obligation?: boolean;
  substitutability?: number;
  override_rigidity?: string | null;
  override_reason?: string | null;
}

interface ComputePreviewResult {
  cancelability_score: number;
  computed_rigidity: 'FIXO' | 'FLEXIVEL';
  rigidity_effective: 'FIXO' | 'FLEXIVEL';
  warnings: string[];
  computed_at: string;
}

interface UseComputePreviewReturn {
  preview: ComputePreviewResult | null;
  isLoading: boolean;
  error: string | null;
}

export const useComputePreview = (
  input: ExpensePreviewInput | null,
  debounceMs: number = 500
): UseComputePreviewReturn => {
  const [preview, setPreview] = useState<ComputePreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!input || !input.name || input.amount <= 0) {
      setPreview(null);
      setError(null);
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('compute-expense', {
          body: {
            name: input.name,
            amount: input.amount,
            intention: input.intention,
            contract_months_remaining: input.contract_months_remaining ?? 0,
            notice_days: input.notice_days ?? 0,
            cancellation_fee_pct: input.cancellation_fee_pct ?? 0,
            has_legal_link: input.has_legal_link ?? false,
            essential_obligation: input.essential_obligation ?? false,
            substitutability: input.substitutability ?? 5,
            override_rigidity: input.override_rigidity,
            override_reason: input.override_reason,
          },
        });

        if (invokeError) {
          setError(invokeError.message);
          setPreview(null);
        } else if (data?.success && data?.data) {
          setPreview(data.data as ComputePreviewResult);
          setError(null);
        } else {
          setError(data?.error || 'Erro ao calcular preview');
          setPreview(null);
        }
      } catch (err) {
        setError('Erro de conexão');
        setPreview(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    input?.name,
    input?.amount,
    input?.intention,
    input?.contract_months_remaining,
    input?.notice_days,
    input?.cancellation_fee_pct,
    input?.has_legal_link,
    input?.essential_obligation,
    input?.substitutability,
    input?.override_rigidity,
    input?.override_reason,
    debounceMs,
  ]);

  return { preview, isLoading, error };
};
