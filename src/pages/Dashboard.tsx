import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { LogOut, AlertTriangle, TrendingDown, Shield } from 'lucide-react';
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
  const { expenses, totalsByIntention, totalExpenses, isLoading: expensesLoading } = useExpenses();

  const isLoading = profileLoading || expensesLoading;

  // Calculate risk metrics
  const incomeFloor = profile?.income_floor ?? 0;
  const essentialExpenses = totalsByIntention['ESSENCIAL'] ?? 0;
  const essentialRatio = incomeFloor > 0 ? (essentialExpenses / incomeFloor) * 100 : 0;
  const totalRatio = incomeFloor > 0 ? (totalExpenses / incomeFloor) * 100 : 0;

  // Emergency reserve coverage (months)
  const emergencyReserve = profile?.emergency_reserve ?? 0;
  const reserveCoverage = totalExpenses > 0 ? emergencyReserve / totalExpenses : 0;

  // Prepare chart data
  const chartData = Object.entries(totalsByIntention)
    .filter(([_, value]) => value > 0)
    .map(([intention, value]) => ({
      name: INTENTION_LABELS[intention] || intention,
      value,
      color: INTENTION_COLORS[intention] || 'hsl(0, 0%, 50%)',
    }));

  // Risk alerts
  const alerts: { type: 'warning' | 'danger'; message: string }[] = [];
  
  if (essentialRatio > 50) {
    alerts.push({
      type: 'danger',
      message: `Despesas essenciais consomem ${essentialRatio.toFixed(0)}% da renda mínima. Risco alto de insolvência.`,
    });
  } else if (essentialRatio > 30) {
    alerts.push({
      type: 'warning',
      message: `Despesas essenciais representam ${essentialRatio.toFixed(0)}% da renda. Atenção recomendada.`,
    });
  }

  if (totalRatio > 80) {
    alerts.push({
      type: 'danger',
      message: `Total de despesas consome ${totalRatio.toFixed(0)}% da renda. Margem muito baixa.`,
    });
  }

  if (reserveCoverage < 3 && totalExpenses > 0) {
    alerts.push({
      type: 'warning',
      message: `Reserva de emergência cobre apenas ${reserveCoverage.toFixed(1)} meses de despesas.`,
    });
  }

  // High rigidity expenses
  const highRigidityExpenses = expenses.filter(e => (e.cancelability_score ?? 100) < 40);
  if (highRigidityExpenses.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${highRigidityExpenses.length} despesa(s) com alta rigidez contratual.`,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Análise de Risco</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <Alert key={index} variant={alert.type === 'danger' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{alert.type === 'danger' ? 'Alerta Crítico' : 'Atenção'}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Renda Mínima</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(incomeFloor)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingDown className="mr-1 h-4 w-4" />
                Base para cálculo de risco
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Despesas</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(totalExpenses)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={Math.min(totalRatio, 100)} className="h-2" />
              <p className="mt-1 text-sm text-muted-foreground">
                {totalRatio.toFixed(0)}% da renda
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reserva de Emergência</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(emergencyReserve)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Shield className="mr-1 h-4 w-4" />
                {reserveCoverage.toFixed(1)} meses de cobertura
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Intenção</CardTitle>
              <CardDescription>Como suas despesas estão distribuídas</CardDescription>
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
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Despesas ({expenses.length})</CardTitle>
            <CardDescription>Lista de todos os custos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma despesa cadastrada ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {INTENTION_LABELS[expense.intention]} • {expense.recurrence}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {expense.cancelability_score ?? 0}/100
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Setup Notice */}
        {(!profile?.income_floor || profile.income_floor === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground">
                Configure seu perfil financeiro para análises mais precisas.
              </p>
              <Button variant="outline" className="mt-2">
                Configurar Perfil
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
