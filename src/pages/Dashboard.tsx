import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RiskGauge } from '@/components/RiskGauge';
import { RiskCard } from '@/components/RiskCard';
import { IncomeDropSimulation, FirstMillionProjection } from '@/components/SimulationCards';
import { LogOut, AlertTriangle, Shield, TrendingUp, Wallet, PiggyBank, Activity, Plus, Lock, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const INTENTION_COLORS: Record<string, string> = {
  ESSENCIAL: 'hsl(0, 70%, 50%)',
  CONFORTO: 'hsl(45, 70%, 50%)',
  CRESCIMENTO: 'hsl(120, 70%, 40%)',
  PATRIMONIO: 'hsl(210, 70%, 50%)',
  LAZER: 'hsl(280, 70%, 50%)',
};

const INTENTION_LABELS: Record<string, string> = {
  ESSENCIAL: 'Essencial',
  CONFORTO: 'Conforto',
  CRESCIMENTO: 'Crescimento',
  PATRIMONIO: 'Patrimônio',
  LAZER: 'Lazer',
};

const Dashboard = () => {
  const { signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { expenses, totalsByIntention, isLoading: expensesLoading } = useExpenses();
  const { summary, isLoading: summaryLoading } = useMonthSummary();

  const isLoading = profileLoading || expensesLoading || summaryLoading;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Prepare chart data
  const chartData = Object.entries(totalsByIntention)
    .filter(([_, value]) => value > 0)
    .map(([intention, value]) => ({
      name: INTENTION_LABELS[intention] || intention,
      value,
      color: INTENTION_COLORS[intention] || 'hsl(0, 0%, 50%)',
    }));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando análise de risco...</div>
      </div>
    );
  }

  const hasProfile = profile?.income_floor && profile.income_floor > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold">Análise de Risco</h1>
            <p className="text-sm text-muted-foreground">Medidor de saúde financeira</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/expenses">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Despesas
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Perfil
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4">
        {/* Profile Setup Notice */}
        {!hasProfile && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configure seu perfil</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Para uma análise precisa de risco, configure sua renda mínima, reserva de emergência e outras informações financeiras.</span>
              <Link to="/profile">
                <Button size="sm" variant="outline" className="ml-4">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Risk Warnings */}
        {summary && summary.warnings.length > 0 && (
          <div className="space-y-2">
            {summary.warnings.map((warning, index) => {
              const isVermelho = warning.includes('VERMELHA') || warning.includes('Crítico') || warning.includes('DSCR abaixo');
              return (
                <Alert key={index} variant={isVermelho ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}

        {/* Main Risk Gauge */}
        {summary && (
          <div className="grid gap-4 lg:grid-cols-2">
            <RiskGauge
              value={summary.fixed_pct}
              maxValue={60}
              zone={summary.fixed_zone}
              label="Custos Fixos / Renda"
              suffix="%"
              showThresholds
            />
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2">
                <CardDescription>Avaliação Geral de Risco</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {summary.overall_risk.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    summary.overall_risk.status === 'OK' ? 'bg-emerald-100 text-emerald-700' :
                    summary.overall_risk.status === 'AMARELO' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {summary.overall_risk.status}
                  </span>
                  {summary.above_adaptive_limit && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      Acima do limite ({summary.adaptive_limit_pct}%)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Key Metrics Grid */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RiskCard
              title="Renda Mínima"
              value={formatCurrency(summary.income_floor)}
              subtitle="Base para cálculos"
              icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
            />
            <RiskCard
              title="Índice de Rigidez"
              value={`${(summary.rigidity_index * 100).toFixed(1)}%`}
              subtitle="(Fixo + Dívida) / Renda"
              zone={summary.rigidity_index >= 0.6 
                ? { status: 'VERMELHO', label: 'Alto' }
                : summary.rigidity_index >= 0.45 
                  ? { status: 'AMARELO', label: 'Médio' }
                  : { status: 'OK', label: 'Baixo' }
              }
            />
            <RiskCard
              title="DSCR"
              value={summary.dscr !== null ? summary.dscr.toFixed(2) : '—'}
              subtitle={summary.dscr_status}
              zone={summary.dscr === null 
                ? undefined 
                : summary.dscr < 1 
                  ? { status: 'VERMELHO', label: 'Crítico' }
                  : summary.dscr < 1.5 
                    ? { status: 'AMARELO', label: 'Apertado' }
                    : { status: 'OK', label: 'Saudável' }
              }
              icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
            />
            <RiskCard
              title="Runway"
              value={summary.runway_months !== null ? `${summary.runway_months.toFixed(1)} meses` : '—'}
              subtitle="Reserva / Custos fixos"
              zone={summary.runway_months === null 
                ? undefined
                : summary.runway_months < 3 
                  ? { status: 'VERMELHO', label: 'Crítico' }
                  : summary.runway_months < 6 
                    ? { status: 'AMARELO', label: 'Baixo' }
                    : { status: 'OK', label: 'Saudável' }
              }
              icon={<PiggyBank className="h-5 w-5 text-muted-foreground" />}
            />
          </div>
        )}

        {/* Fixed vs Flexible Breakdown */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Composição dos Custos
              </CardTitle>
              <CardDescription>Distribuição entre fixos e flexíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total de Despesas</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_expenses)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">Custos Fixos</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.fixed_total)}</p>
                  <p className="text-xs text-red-500">{summary.fixed_pct.toFixed(1)}% da renda</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-sm text-emerald-600">Custos Flexíveis</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.flexible_total)}</p>
                  <p className="text-xs text-emerald-500">Mais fáceis de ajustar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fixed Growth Warnings */}
        {summary && summary.fixed_growth_warnings && summary.fixed_growth_warnings.length > 0 && (
          <div className="space-y-2">
            {summary.fixed_growth_warnings.map((warning, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Top Fixed Expenses */}
        {summary && summary.top_fixed_expenses && summary.top_fixed_expenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Top 5 Custos Fixos
              </CardTitle>
              <CardDescription>Maiores despesas fixas - foco para redução de risco</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.top_fixed_expenses.map((expense, idx) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{expense.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {expense.cancelability_score ?? '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link to="/expenses">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Gerenciar Despesas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribution Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Intenção</CardTitle>
              <CardDescription>Visualização por categoria de gasto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simulations */}
        <div className="grid gap-4 lg:grid-cols-2">
          <IncomeDropSimulation />
          <FirstMillionProjection />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Despesas Registradas ({expenses.length})</CardTitle>
            <CardDescription>Lista com score de cancelabilidade e rigidez</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma despesa cadastrada ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const score = expense.cancelability_score ?? 0;
                  const isFixed = expense.computed_rigidity === 'FIXO' || score < 55;
                  return (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isFixed ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/50'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{expense.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {INTENTION_LABELS[expense.intention]}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            isFixed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isFixed ? 'FIXO' : 'FLEXÍVEL'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                        <p className={`text-xs ${score < 40 ? 'text-red-600' : score < 55 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          Score: {score}/100
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Setup Notice */}
        {!hasProfile && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground">
                Configure seu perfil financeiro para análises mais precisas.
              </p>
              <Link to="/profile">
                <Button variant="outline" className="mt-2">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar Perfil
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
