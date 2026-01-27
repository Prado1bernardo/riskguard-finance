import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpenseInput {
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

interface ComputeResult {
  cancelability_score: number;
  computed_rigidity: 'FIXO' | 'FLEXIVEL';
  rigidity_effective: 'FIXO' | 'FLEXIVEL';
  warnings: string[];
  computed_at: string;
}

function validateInput(payload: unknown): { valid: true; data: ExpenseInput } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload deve ser um objeto válido' };
  }

  const data = payload as Record<string, unknown>;

  // Required fields
  if (typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { valid: false, error: 'Campo "name" é obrigatório e deve ser uma string não vazia' };
  }

  if (typeof data.amount !== 'number' || data.amount < 0) {
    return { valid: false, error: 'Campo "amount" é obrigatório e deve ser um número >= 0' };
  }

  // Optional numeric fields validation
  if (data.contract_months_remaining !== undefined && data.contract_months_remaining !== null) {
    if (typeof data.contract_months_remaining !== 'number' || data.contract_months_remaining < 0) {
      return { valid: false, error: 'Campo "contract_months_remaining" deve ser um número >= 0' };
    }
  }

  if (data.notice_days !== undefined && data.notice_days !== null) {
    if (typeof data.notice_days !== 'number' || data.notice_days < 0) {
      return { valid: false, error: 'Campo "notice_days" deve ser um número >= 0' };
    }
  }

  if (data.cancellation_fee_pct !== undefined && data.cancellation_fee_pct !== null) {
    if (typeof data.cancellation_fee_pct !== 'number' || data.cancellation_fee_pct < 0 || data.cancellation_fee_pct > 100) {
      return { valid: false, error: 'Campo "cancellation_fee_pct" deve ser um número entre 0 e 100' };
    }
  }

  if (data.substitutability !== undefined && data.substitutability !== null) {
    if (typeof data.substitutability !== 'number' || data.substitutability < 0 || data.substitutability > 10) {
      return { valid: false, error: 'Campo "substitutability" deve ser um número entre 0 e 10' };
    }
  }

  // Boolean fields validation
  if (data.has_legal_link !== undefined && data.has_legal_link !== null && typeof data.has_legal_link !== 'boolean') {
    return { valid: false, error: 'Campo "has_legal_link" deve ser booleano' };
  }

  if (data.essential_obligation !== undefined && data.essential_obligation !== null && typeof data.essential_obligation !== 'boolean') {
    return { valid: false, error: 'Campo "essential_obligation" deve ser booleano' };
  }

  // Override validation
  if (data.override_rigidity !== undefined && data.override_rigidity !== null) {
    if (typeof data.override_rigidity !== 'string' || !['FIXO', 'FLEXIVEL'].includes(data.override_rigidity)) {
      return { valid: false, error: 'Campo "override_rigidity" deve ser "FIXO" ou "FLEXIVEL"' };
    }
  }

  if (data.override_reason !== undefined && data.override_reason !== null && typeof data.override_reason !== 'string') {
    return { valid: false, error: 'Campo "override_reason" deve ser uma string' };
  }

  return {
    valid: true,
    data: {
      name: data.name as string,
      amount: data.amount as number,
      intention: data.intention as string | undefined,
      contract_months_remaining: (data.contract_months_remaining as number) ?? 0,
      notice_days: (data.notice_days as number) ?? 0,
      cancellation_fee_pct: (data.cancellation_fee_pct as number) ?? 0,
      has_legal_link: (data.has_legal_link as boolean) ?? false,
      essential_obligation: (data.essential_obligation as boolean) ?? false,
      substitutability: (data.substitutability as number) ?? 5,
      override_rigidity: data.override_rigidity as string | null,
      override_reason: data.override_reason as string | null,
    }
  };
}

function calculateCancelabilityScore(expense: ExpenseInput): number {
  let score = 100; // Start with max cancelability

  // Reduce score based on contract commitment (max -30 points)
  const contractMonths = expense.contract_months_remaining ?? 0;
  if (contractMonths > 0) {
    score -= Math.min(30, contractMonths * 2);
  }

  // Reduce score based on cancellation fee (max -25 points)
  const cancellationFee = expense.cancellation_fee_pct ?? 0;
  if (cancellationFee > 0) {
    score -= Math.min(25, cancellationFee / 4);
  }

  // Reduce score if has legal link (-20 points)
  if (expense.has_legal_link) {
    score -= 20;
  }

  // Reduce score if essential obligation (-15 points)
  if (expense.essential_obligation) {
    score -= 15;
  }

  // Reduce based on low substitutability (max -20 points)
  // Higher substitutability = more substitutable = easier to cancel
  const substitutability = expense.substitutability ?? 5;
  score -= Math.max(0, (10 - substitutability) * 2);

  // Reduce based on notice days (max -10 points)
  const noticeDays = expense.notice_days ?? 0;
  if (noticeDays > 0) {
    score -= Math.min(10, noticeDays / 3);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeRigidityAndWarnings(expense: ExpenseInput, score: number): ComputeResult {
  const warnings: string[] = [];
  
  // Determine base rigidity from score
  let computedRigidity: 'FIXO' | 'FLEXIVEL' = score < 55 ? 'FIXO' : 'FLEXIVEL';

  // Hard signals check
  const hasHardSignals = 
    expense.has_legal_link || 
    (expense.contract_months_remaining ?? 0) > 0 || 
    expense.essential_obligation;

  // If has hard signals but score suggests FLEXIVEL, add warning about conflict
  if (hasHardSignals && score >= 55) {
    warnings.push('Score alto mas possui sinais de rigidez (vínculo legal, contrato ativo ou obrigação essencial). Avalie com cautela.');
    // Force to FIXO if hard signals present and score is borderline (55-70)
    if (score < 70) {
      computedRigidity = 'FIXO';
      warnings.push('Rigidez ajustada para FIXO devido a sinais de rigidez presentes.');
    }
  }

  // Handle override
  if (expense.override_rigidity) {
    const overrideReason = expense.override_reason?.trim() ?? '';
    
    if (expense.override_rigidity === 'FLEXIVEL') {
      // Validate override_reason length
      if (overrideReason.length < 8) {
        warnings.push('Override para FLEXIVEL requer justificativa com pelo menos 8 caracteres.');
      } else {
        // Check if override is not recommended
        const hasRiskyConditions = 
          (expense.notice_days ?? 0) >= 30 || 
          (expense.contract_months_remaining ?? 0) > 0 || 
          expense.has_legal_link;

        if (hasRiskyConditions) {
          warnings.push('Override não recomendado: existem condições de risco (aviso prévio >= 30 dias, contrato ativo ou vínculo legal).');
        }

        // Apply override only if reason is valid
        computedRigidity = 'FLEXIVEL';
      }
    } else if (expense.override_rigidity === 'FIXO') {
      // FIXO override is always safe
      computedRigidity = 'FIXO';
    }
  }

  // Additional warnings for specific conditions
  if ((expense.cancellation_fee_pct ?? 0) >= 50) {
    warnings.push('Multa de cancelamento elevada (>= 50%). Considere aguardar término do contrato.');
  }

  if ((expense.contract_months_remaining ?? 0) >= 12) {
    warnings.push('Contrato de longo prazo (>= 12 meses restantes). Difícil cancelamento a curto prazo.');
  }

  if ((expense.substitutability ?? 5) <= 2) {
    warnings.push('Baixa substituibilidade. Poucas alternativas disponíveis no mercado.');
  }

  // rigidity_effective is the final classification used by dashboard (anti-bypass)
  // It respects overrides only when properly justified
  const rigidityEffective = computedRigidity;

  return {
    cancelability_score: score,
    computed_rigidity: computedRigidity,
    rigidity_effective: rigidityEffective,
    warnings,
    computed_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Body deve ser um JSON válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const validation = validateInput(payload);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expense = validation.data;

    // Calculate score
    const score = calculateCancelabilityScore(expense);

    // Compute rigidity and warnings
    const result = computeRigidityAndWarnings(expense, score);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name: expense.name,
          amount: expense.amount,
          cancelability_score: result.cancelability_score,
          computed_rigidity: result.computed_rigidity,
          rigidity_effective: result.rigidity_effective,
          warnings: result.warnings,
          computed_at: result.computed_at,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar despesa:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar a despesa' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
