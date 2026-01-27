import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const dropPct = parseFloat(url.searchParams.get('drop_pct') ?? '0.2');

    if (dropPct < 0 || dropPct > 1) {
      return new Response(
        JSON.stringify({ error: 'drop_pct deve estar entre 0 e 1' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('income_floor')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch expenses to calculate fixed_total
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, computed_rigidity, cancelability_score, override_rigidity')
      .eq('user_id', user.id);

    if (expensesError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar despesas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fixed_total using rigidity_effective logic
    let fixedTotal = 0;
    for (const expense of expenses ?? []) {
      const rigidityEffective = expense.override_rigidity ?? expense.computed_rigidity;
      const isFixed = rigidityEffective === 'FIXO' || 
        (rigidityEffective === null && (expense.cancelability_score ?? 100) < 55);
      
      if (isFixed) {
        fixedTotal += expense.amount ?? 0;
      }
    }

    const incomeFloor = profile.income_floor ?? 0;
    const newIncome = incomeFloor * (1 - dropPct);
    const deficit = fixedTotal - newIncome;
    const breaks = deficit > 0;

    const result = {
      income_floor: incomeFloor,
      drop_pct: dropPct,
      new_income: Math.round(newIncome * 100) / 100,
      fixed_total: Math.round(fixedTotal * 100) / 100,
      deficit: Math.round(deficit * 100) / 100,
      breaks,
      coverage_months: newIncome > 0 ? Math.round((newIncome / fixedTotal) * 10) / 10 : 0,
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na simulação:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
