import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const url = new URL(req.url);
    const monthlyContribution = parseFloat(url.searchParams.get('monthly_contribution') ?? '0');
    const annualReturnPct = parseFloat(url.searchParams.get('annual_return_pct') ?? '8');
    const targetAmount = parseFloat(url.searchParams.get('target') ?? '1000000');

    if (monthlyContribution <= 0) {
      return new Response(
        JSON.stringify({ error: 'monthly_contribution deve ser maior que 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (annualReturnPct < 0 || annualReturnPct > 100) {
      return new Response(
        JSON.stringify({ error: 'annual_return_pct deve estar entre 0 e 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Monthly rate from annual rate
    const monthlyRate = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;

    // Calculate months to reach target using compound interest formula
    // FV = PMT * ((1 + r)^n - 1) / r
    // Solving for n: n = log(1 + FV * r / PMT) / log(1 + r)
    
    let months: number;
    if (monthlyRate === 0) {
      months = Math.ceil(targetAmount / monthlyContribution);
    } else {
      months = Math.ceil(
        Math.log(1 + (targetAmount * monthlyRate) / monthlyContribution) / 
        Math.log(1 + monthlyRate)
      );
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    // Calculate final value for verification
    let finalValue: number;
    if (monthlyRate === 0) {
      finalValue = monthlyContribution * months;
    } else {
      finalValue = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    }

    // Calculate total contributed vs gains
    const totalContributed = monthlyContribution * months;
    const totalGains = finalValue - totalContributed;

    const result = {
      monthly_contribution: monthlyContribution,
      annual_return_pct: annualReturnPct,
      target: targetAmount,
      months_to_target: months,
      years: years,
      remaining_months: remainingMonths,
      formatted_time: `${years} anos${remainingMonths > 0 ? ` e ${remainingMonths} meses` : ''}`,
      final_value: Math.round(finalValue * 100) / 100,
      total_contributed: Math.round(totalContributed * 100) / 100,
      total_gains: Math.round(totalGains * 100) / 100,
      gains_percentage: Math.round((totalGains / totalContributed) * 10000) / 100,
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na projeção:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
