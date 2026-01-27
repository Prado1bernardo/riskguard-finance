import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useSimulations } from '@/hooks/useSimulations';
import { AlertTriangle, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export const IncomeDropSimulation = () => {
  const { simulateDropIncome, isLoadingDrop } = useSimulations();
  const [dropPct, setDropPct] = useState(20);
  const [result, setResult] = useState<Awaited<ReturnType<typeof simulateDropIncome>>>(null);

  const handleSimulate = async () => {
    const data = await simulateDropIncome(dropPct / 100);
    setResult(data);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card className={cn(
      'border transition-all',
      result?.breaks ? 'border-red-200 bg-red-50' : result ? 'border-emerald-200 bg-emerald-50' : ''
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-muted-foreground" />
          Simulador de Queda de Renda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Queda de renda</Label>
            <span className="text-sm font-medium">{dropPct}%</span>
          </div>
          <Slider
            value={[dropPct]}
            onValueChange={([v]) => setDropPct(v)}
            min={5}
            max={80}
            step={5}
          />
        </div>

        <Button 
          onClick={handleSimulate} 
          disabled={isLoadingDrop}
          className="w-full"
          variant={result?.breaks ? 'destructive' : 'default'}
        >
          {isLoadingDrop ? 'Simulando...' : 'Simular'}
        </Button>

        {result && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Renda atual</p>
                <p className="font-medium">{formatCurrency(result.income_floor)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nova renda</p>
                <p className="font-medium">{formatCurrency(result.new_income)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Custos fixos</p>
                <p className="font-medium">{formatCurrency(result.fixed_total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Déficit</p>
                <p className={cn('font-medium', result.deficit > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {formatCurrency(result.deficit)}
                </p>
              </div>
            </div>

            {result.breaks ? (
              <div className="flex items-center gap-2 p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Quebra financeira!</p>
                  <p className="text-sm text-red-700">
                    Custos fixos excedem a renda simulada em {formatCurrency(result.deficit)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-emerald-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800">Situação sustentável</p>
                  <p className="text-sm text-emerald-700">
                    Cobertura de {result.coverage_months}x os custos fixos
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const FirstMillionProjection = () => {
  const { projectFirstMillion, isLoadingProjection } = useSimulations();
  const [monthlyContribution, setMonthlyContribution] = useState('1000');
  const [annualReturn, setAnnualReturn] = useState('8');
  const [result, setResult] = useState<Awaited<ReturnType<typeof projectFirstMillion>>>(null);

  const handleProject = async () => {
    const contribution = parseFloat(monthlyContribution) || 0;
    const returnPct = parseFloat(annualReturn) || 8;
    if (contribution > 0) {
      const data = await projectFirstMillion(contribution, returnPct);
      setResult(data);
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          Projeção: Primeiro Milhão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="contribution">Aporte mensal (R$)</Label>
            <Input
              id="contribution"
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="1000"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="return">Retorno anual (%)</Label>
            <Input
              id="return"
              type="number"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(e.target.value)}
              placeholder="8"
            />
          </div>
        </div>

        <Button 
          onClick={handleProject} 
          disabled={isLoadingProjection || !monthlyContribution}
          className="w-full"
        >
          {isLoadingProjection ? 'Calculando...' : 'Calcular'}
        </Button>

        {result && (
          <div className="space-y-3 pt-2 border-t">
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">{result.formatted_time}</p>
              <p className="text-sm text-muted-foreground">para alcançar R$ 1.000.000</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Total investido</p>
                <p className="font-medium">{formatCurrency(result.total_contributed)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ganhos com juros</p>
                <p className="font-medium text-emerald-600">{formatCurrency(result.total_gains)}</p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Rendimento sobre o investido
              </p>
              <p className="text-xl font-bold text-emerald-600">
                +{result.gains_percentage}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
