import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface ProfileData {
  income_floor: number;
  income_is_variable: boolean;
  dependents: number;
  emergency_reserve: number;
  debt_service: number;
}

interface ExpenseData {
  id: string;
  name: string;
  amount: number;
  intention: string;
  computed_rigidity: string | null;
  cancelability_score: number | null;
}

interface RiskZone {
  status: 'OK' | 'AMARELO' | 'VERMELHO';
  label: string;
}

interface TopFixedExpense {
  id: string;
  name: string;
  amount: number;
  cancelability_score: number | null;
  impact_pct: number | null;
}

interface MonthSummary {
  // Core metrics
  income_floor: number;
  total_expenses: number;
  fixed_total: number;
  flexible_total: number;
  fixed_pct: number;
  
  // Risk metrics
  rigidity_index: number;
  dscr: number | null;
  dscr_status: string;
  runway_months: number | null;
  
  // Adaptive limit
  adaptive_limit_pct: number;
  above_adaptive_limit: boolean;
  
  // Zone assessment
  fixed_zone: RiskZone;
  overall_risk: RiskZone;
  
  // Breakdown by intention
  by_intention: Record<string, { total: number; fixed: number; flexible: number }>;
  
  // Top fixed expenses (actionable insights)
  top_fixed_expenses: TopFixedExpense[];
  
  // Growth warnings
  fixed_growth_warnings: string[];
  
  // Warnings
  warnings: string[];
}

function calculateAdaptiveLimit(profile: ProfileData): number {
  let limit = 35; // Base: 35%
  
  // Renda variável: -5pp
  if (profile.income_is_variable) {
    limit -= 5;
  }
  
  // Por dependente (máx 4): -1pp cada
  const dependentsAdjustment = Math.min(profile.dependents ?? 0, 4);
  limit -= dependentsAdjustment;
  
  // Clamp entre 25% e 38%
  return Math.max(25, Math.min(38, limit));
}

function getFixedZone(fixedPct: number): RiskZone {
  if (fixedPct >= 40) {
    return { status: 'VERMELHO', label: 'Risco Alto' };
  } else if (fixedPct >= 30) {
    return { status: 'AMARELO', label: 'Atenção' };
  }
  return { status: 'OK', label: 'Saudável' };
}

function calculateOverallRisk(
  fixedPct: number,
  rigidityIndex: number,
  dscr: number | null,
  runwayMonths: number | null,
  aboveAdaptiveLimit: boolean
): RiskZone {
  let riskScore = 0;
  
  // Fixed percentage contribution
  if (fixedPct >= 40) riskScore += 3;
  else if (fixedPct >= 30) riskScore += 1;
  
  // Rigidity index contribution
  if (rigidityIndex >= 0.6) riskScore += 2;
  else if (rigidityIndex >= 0.45) riskScore += 1;
  
  // DSCR contribution (lower is worse)
  if (dscr !== null) {
    if (dscr < 1) riskScore += 3;
    else if (dscr < 1.5) riskScore += 1;
  }
  
  // Runway contribution
  if (runwayMonths !== null) {
    if (runwayMonths < 3) riskScore += 2;
    else if (runwayMonths < 6) riskScore += 1;
  }
  
  // Above adaptive limit
  if (aboveAdaptiveLimit) riskScore += 1;
  
  if (riskScore >= 5) {
    return { status: 'VERMELHO', label: 'Risco Crítico' };
  } else if (riskScore >= 2) {
    return { status: 'AMARELO', label: 'Atenção Necessária' };
  }
  return { status: 'OK', label: 'Situação Saudável' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('income_floor, income_is_variable, dependents, emergency_reserve, debt_service')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado. Configure seu perfil primeiro.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch expenses with name and id for top fixed
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, name, amount, intention, computed_rigidity, cancelability_score')
      .eq('user_id', userId);

    if (expensesError) {
      console.error('Expenses fetch error:', expensesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar despesas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData: ProfileData = {
      income_floor: profile.income_floor ?? 0,
      income_is_variable: profile.income_is_variable ?? false,
      dependents: profile.dependents ?? 0,
      emergency_reserve: profile.emergency_reserve ?? 0,
      debt_service: profile.debt_service ?? 0,
    };

    const expenseList: ExpenseData[] = expenses ?? [];
    const warnings: string[] = [];

    // Extract profile values early for use in loop
    const incomeFloor = profileData.income_floor;
    const debtService = profileData.debt_service;
    const emergencyReserve = profileData.emergency_reserve;

    // Calculate totals
    let totalExpenses = 0;
    let fixedTotal = 0;
    let flexibleTotal = 0;
    let essentialsTotal = 0;
    let fixedEssentialTotal = 0;
    
    // Track fixed expenses for top 5
    const fixedExpensesList: TopFixedExpense[] = [];

    // Anti-drible: track unclassified and no-score expenses
    let unclassifiedCount = 0;
    let noScoreCount = 0;

    const byIntention: Record<string, { total: number; fixed: number; flexible: number }> = {};

    for (const expense of expenseList) {
      const amount = expense.amount ?? 0;
      totalExpenses += amount;

      // Anti-drible: if computed_rigidity is null, DO NOT infer from cancelability_score
      // Treat as FIXO for safety (meter should "fight" the user)
      let isFixed = false;
      let isUnclassified = false;
      
      if (expense.computed_rigidity !== null && expense.computed_rigidity !== undefined) {
        // Has classification - use it
        isFixed = expense.computed_rigidity === 'FIXO';
      } else {
        // No classification - mark as unclassified and treat as FIXO for safety
        isUnclassified = true;
        unclassifiedCount++;
        isFixed = true; // Conservative: treat unclassified as FIXO
      }

      // Track expenses without score separately
      if (expense.cancelability_score === null || expense.cancelability_score === undefined) {
        noScoreCount++;
      }

      if (isFixed) {
        fixedTotal += amount;
        fixedExpensesList.push({
          id: expense.id,
          name: expense.name,
          amount: amount,
          cancelability_score: expense.cancelability_score,
          impact_pct: incomeFloor > 0 ? Math.round((amount / incomeFloor) * 1000) / 10 : null,
        });
      } else {
        flexibleTotal += amount;
      }

      // Track essentials - only count as fixed essential if classified as FIXO
      if (expense.intention === 'ESSENCIAL') {
        essentialsTotal += amount;
        if (isFixed) {
          fixedEssentialTotal += amount;
        }
      }

      // By intention breakdown
      if (!byIntention[expense.intention]) {
        byIntention[expense.intention] = { total: 0, fixed: 0, flexible: 0 };
      }
      byIntention[expense.intention].total += amount;
      if (isFixed) {
        byIntention[expense.intention].fixed += amount;
      } else {
        byIntention[expense.intention].flexible += amount;
      }
    }

    // Anti-drible warnings
    if (unclassifiedCount > 0) {
      warnings.push(`${unclassifiedCount} despesa(s) sem classificação calculada - tratadas como FIXO por segurança.`);
    }
    if (noScoreCount > 0) {
      warnings.push(`${noScoreCount} despesa(s) sem score de cancelabilidade.`);
    }

    // Sort and get top 5 fixed expenses by amount (impact_pct already calculated in loop)
    const topFixedExpenses = fixedExpensesList
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Fixed percentage
    const fixedPct = incomeFloor > 0 ? (fixedTotal / incomeFloor) * 100 : 0;

    // Rigidity Index = (fixed_total + debt_service) / income_floor
    const rigidityIndex = incomeFloor > 0 
      ? (fixedTotal + debtService) / incomeFloor 
      : 0;

    // DSCR = (income_floor - essentials_total) / debt_service
    let dscr: number | null = null;
    let dscrStatus = 'Sem dívida';
    
    if (debtService > 0) {
      dscr = (incomeFloor - essentialsTotal) / debtService;
      if (dscr < 1) {
        dscrStatus = 'Crítico';
        warnings.push('DSCR abaixo de 1: renda disponível não cobre o serviço da dívida.');
      } else if (dscr < 1.5) {
        dscrStatus = 'Apertado';
        warnings.push('DSCR entre 1 e 1.5: margem baixa para cobrir dívidas.');
      } else {
        dscrStatus = 'Saudável';
      }
    }

    // Runway = emergency_reserve / fixed_essential_total (ESSENCIAL + FIXO only)
    // Fallback to essentials_total if fixed_essential_total is 0
    let runwayBase = fixedEssentialTotal;
    let usedRunwayFallback = false;
    
    if (fixedEssentialTotal === 0 && essentialsTotal > 0) {
      runwayBase = essentialsTotal;
      usedRunwayFallback = true;
    }
    
    const runwayMonths = runwayBase > 0 
      ? emergencyReserve / runwayBase 
      : null;

    if (usedRunwayFallback) {
      warnings.push('Runway calculado com fallback (total essenciais) - nenhuma despesa essencial classificada como FIXO.');
    }

    if (runwayMonths !== null && runwayMonths < 3) {
      warnings.push(`Reserva de emergência cobre apenas ${runwayMonths.toFixed(1)} meses. Recomendado: mínimo 6 meses.`);
    }

    // Adaptive limit
    const adaptiveLimitPct = calculateAdaptiveLimit(profileData);
    const aboveAdaptiveLimit = fixedPct > adaptiveLimitPct;
    
    if (aboveAdaptiveLimit) {
      warnings.push(`Custos fixos (${fixedPct.toFixed(1)}%) acima do limite adaptativo (${adaptiveLimitPct}%) para seu perfil.`);
    }

    // Zone assessment
    const fixedZone = getFixedZone(fixedPct);
    
    if (fixedZone.status === 'VERMELHO') {
      warnings.push('Zona VERMELHA: custos fixos representam 40%+ da renda. Risco de insolvência elevado.');
    } else if (fixedZone.status === 'AMARELO') {
      warnings.push('Zona AMARELA: custos fixos entre 30-40% da renda. Atenção recomendada.');
    }

    const overallRisk = calculateOverallRisk(fixedPct, rigidityIndex, dscr, runwayMonths, aboveAdaptiveLimit);

    // High rigidity expenses warning - only count expenses WITH a score
    const expensesWithScore = expenseList.filter(e => e.cancelability_score !== null && e.cancelability_score !== undefined);
    const highRigidityCount = expensesWithScore.filter(e => e.cancelability_score! < 40).length;
    if (highRigidityCount > 0) {
      warnings.push(`${highRigidityCount} despesa(s) com baixo score de cancelabilidade (<40).`);
    }

    // Fixed growth warnings (threshold crossings)
    const fixedGrowthWarnings: string[] = [];
    if (fixedPct >= 40) {
      fixedGrowthWarnings.push('ALERTA: Custos fixos cruzaram 40% da renda - zona de risco crítico.');
    } else if (fixedPct >= 30) {
      fixedGrowthWarnings.push('ATENÇÃO: Custos fixos cruzaram 30% da renda - zona de atenção.');
    }
    
    if (topFixedExpenses.length > 0 && topFixedExpenses[0].amount > incomeFloor * 0.15) {
      fixedGrowthWarnings.push(`Maior despesa fixa (${topFixedExpenses[0].name}) representa mais de 15% da renda.`);
    }

    const summary: MonthSummary = {
      income_floor: incomeFloor,
      total_expenses: totalExpenses,
      fixed_total: fixedTotal,
      flexible_total: flexibleTotal,
      fixed_pct: Math.round(fixedPct * 10) / 10,
      rigidity_index: Math.round(rigidityIndex * 1000) / 1000,
      dscr: dscr !== null ? Math.round(dscr * 100) / 100 : null,
      dscr_status: dscrStatus,
      runway_months: runwayMonths !== null ? Math.round(runwayMonths * 10) / 10 : null,
      adaptive_limit_pct: adaptiveLimitPct,
      above_adaptive_limit: aboveAdaptiveLimit,
      fixed_zone: fixedZone,
      overall_risk: overallRisk,
      by_intention: byIntention,
      top_fixed_expenses: topFixedExpenses,
      fixed_growth_warnings: fixedGrowthWarnings,
      warnings,
    };

    return new Response(
      JSON.stringify({ success: true, data: summary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao calcular resumo:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao calcular resumo mensal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
