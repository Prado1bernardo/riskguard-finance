import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenses, ExpenseIntention } from '@/hooks/useExpenses';
import { useComputePreview } from '@/hooks/useComputePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Plus, Trash2, AlertTriangle, Calculator, 
  Filter, Lock, Unlock, TrendingDown, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const INTENTION_OPTIONS: { value: ExpenseIntention; label: string; description: string }[] = [
  { value: 'ESSENCIAL', label: 'Essencial', description: 'Moradia, alimentação, saúde' },
  { value: 'CONFORTO', label: 'Conforto', description: 'Conveniências e qualidade de vida' },
  { value: 'CRESCIMENTO', label: 'Crescimento', description: 'Educação, cursos, desenvolvimento' },
  { value: 'PATRIMONIO', label: 'Patrimônio', description: 'Investimentos e construção de riqueza' },
  { value: 'LAZER', label: 'Lazer', description: 'Entretenimento e diversão' },
];

const RECURRENCE_OPTIONS = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'ANUAL', label: 'Anual' },
  { value: 'UNICA', label: 'Única' },
];

const INTENTION_LABELS: Record<string, string> = {
  ESSENCIAL: 'Essencial',
  CONFORTO: 'Conforto',
  CRESCIMENTO: 'Crescimento',
  PATRIMONIO: 'Patrimônio',
  LAZER: 'Lazer',
};

interface FormData {
  name: string;
  amount: number;
  intention: ExpenseIntention;
  recurrence: string;
  contract_months_remaining: number;
  notice_days: number;
  cancellation_fee_pct: number;
  has_legal_link: boolean;
  essential_obligation: boolean;
  substitutability: number;
  override_rigidity: string | null;
  override_reason: string;
}

const initialFormData: FormData = {
  name: '',
  amount: 0,
  intention: 'ESSENCIAL',
  recurrence: 'MENSAL',
  contract_months_remaining: 0,
  notice_days: 0,
  cancellation_fee_pct: 0,
  has_legal_link: false,
  essential_obligation: false,
  substitutability: 5,
  override_rigidity: null,
  override_reason: '',
};

const Expenses = () => {
  const { signOut } = useAuth();
  const { 
    expenses, 
    isLoading, 
    addExpenseAsync,
    deleteExpenseAsync,
    isAdding, 
    isDeleting 
  } = useExpenses();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterIntention, setFilterIntention] = useState<string>('ALL');
  const [filterRigidity, setFilterRigidity] = useState<string>('ALL');

  // Live preview with debounce
  const previewInput = useMemo(() => {
    if (!formData.name || formData.amount <= 0) return null;
    return formData;
  }, [formData]);

  const { preview, isLoading: previewLoading, error: previewError } = useComputePreview(previewInput, 400);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome da despesa é obrigatório');
      return;
    }
    
    if (formData.amount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    // Validate override
    if (formData.override_rigidity === 'FLEXIVEL' && formData.override_reason.length < 8) {
      toast.error('Override para FLEXIVEL requer justificativa com pelo menos 8 caracteres');
      return;
    }

    try {
      await addExpenseAsync({
        name: formData.name.trim(),
        amount: formData.amount,
        intention: formData.intention,
        recurrence: formData.recurrence,
        contract_months_remaining: formData.contract_months_remaining,
        notice_days: formData.notice_days,
        cancellation_fee_pct: formData.cancellation_fee_pct,
        has_legal_link: formData.has_legal_link,
        essential_obligation: formData.essential_obligation,
        substitutability: formData.substitutability,
        override_rigidity: formData.override_rigidity,
        override_reason: formData.override_reason || null,
      });
      
      setFormData(initialFormData);
      setShowAdvanced(false);
      toast.success('Despesa adicionada com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar despesa';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      await deleteExpenseAsync(id);
      toast.success('Despesa excluída');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir despesa';
      toast.error(message);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filterIntention !== 'ALL' && expense.intention !== filterIntention) return false;
      if (filterRigidity !== 'ALL') {
        const isFixed = expense.computed_rigidity === 'FIXO';
        if (filterRigidity === 'FIXO' && !isFixed) return false;
        if (filterRigidity === 'FLEXIVEL' && isFixed) return false;
      }
      return true;
    });
  }, [expenses, filterIntention, filterRigidity]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Gestão de Despesas</h1>
              <p className="text-sm text-muted-foreground">Cadastre e analise seus gastos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        <Tabs defaultValue="add" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="add">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </TabsTrigger>
            <TabsTrigger value="list">
              <Filter className="mr-2 h-4 w-4" />
              Lista ({expenses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Nova Despesa
                  </CardTitle>
                  <CardDescription>
                    Preencha os dados e veja o score em tempo real
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Aluguel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Valor (R$) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.amount || ''}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="intention">Intenção</Label>
                        <Select
                          value={formData.intention}
                          onValueChange={(value) => setFormData({ ...formData, intention: value as ExpenseIntention })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTENTION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div>
                                  <span className="font-medium">{opt.label}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recurrence">Recorrência</Label>
                        <Select
                          value={formData.recurrence}
                          onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RECURRENCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Advanced Toggle */}
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <span className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Sinais de Cancelabilidade
                      </span>
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {/* Advanced Fields */}
                    {showAdvanced && (
                      <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="contract_months">Meses de Contrato Restantes</Label>
                            <Input
                              id="contract_months"
                              type="number"
                              min="0"
                              value={formData.contract_months_remaining || ''}
                              onChange={(e) => setFormData({ ...formData, contract_months_remaining: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notice_days">Dias de Aviso Prévio</Label>
                            <Input
                              id="notice_days"
                              type="number"
                              min="0"
                              value={formData.notice_days || ''}
                              onChange={(e) => setFormData({ ...formData, notice_days: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cancellation_fee">Multa de Cancelamento (%)</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="cancellation_fee"
                              min={0}
                              max={100}
                              step={5}
                              value={[formData.cancellation_fee_pct]}
                              onValueChange={([value]) => setFormData({ ...formData, cancellation_fee_pct: value })}
                              className="flex-1"
                            />
                            <span className="w-12 text-right font-medium">{formData.cancellation_fee_pct}%</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="substitutability">Substituibilidade (0=difícil, 10=fácil)</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="substitutability"
                              min={0}
                              max={10}
                              step={1}
                              value={[formData.substitutability]}
                              onValueChange={([value]) => setFormData({ ...formData, substitutability: value })}
                              className="flex-1"
                            />
                            <span className="w-8 text-right font-medium">{formData.substitutability}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="has_legal_link" className="cursor-pointer">
                              Vínculo Legal (contrato, financiamento)
                            </Label>
                            <Switch
                              id="has_legal_link"
                              checked={formData.has_legal_link}
                              onCheckedChange={(checked) => setFormData({ ...formData, has_legal_link: checked })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="essential_obligation" className="cursor-pointer">
                              Obrigação Essencial (impossível viver sem)
                            </Label>
                            <Switch
                              id="essential_obligation"
                              checked={formData.essential_obligation}
                              onCheckedChange={(checked) => setFormData({ ...formData, essential_obligation: checked })}
                            />
                          </div>
                        </div>

                        {/* Override Section */}
                        <div className="border-t pt-4 space-y-3">
                          <Label className="text-sm font-medium text-muted-foreground">Override Manual</Label>
                          <Select
                            value={formData.override_rigidity || 'AUTO'}
                            onValueChange={(value) => setFormData({ 
                              ...formData, 
                              override_rigidity: value === 'AUTO' ? null : value 
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Automático" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AUTO">Automático (recomendado)</SelectItem>
                              <SelectItem value="FIXO">Forçar FIXO</SelectItem>
                              <SelectItem value="FLEXIVEL">Forçar FLEXÍVEL</SelectItem>
                            </SelectContent>
                          </Select>

                          {formData.override_rigidity === 'FLEXIVEL' && (
                            <div className="space-y-2">
                              <Label htmlFor="override_reason">Justificativa (mín. 8 caracteres) *</Label>
                              <Textarea
                                id="override_reason"
                                value={formData.override_reason}
                                onChange={(e) => setFormData({ ...formData, override_reason: e.target.value })}
                                placeholder="Por que este custo deve ser considerado flexível?"
                                className="min-h-[80px]"
                              />
                              {formData.override_reason.length > 0 && formData.override_reason.length < 8 && (
                                <p className="text-xs text-destructive">
                                  {8 - formData.override_reason.length} caracteres restantes
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isAdding}>
                      {isAdding ? 'Salvando...' : 'Salvar Despesa'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Preview em Tempo Real
                  </CardTitle>
                  <CardDescription>
                    Score calculado no servidor (anti-bypass)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!previewInput ? (
                    <p className="text-center text-muted-foreground py-8">
                      Preencha nome e valor para ver o preview
                    </p>
                  ) : previewLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-pulse text-muted-foreground">Calculando...</div>
                    </div>
                  ) : preview ? (
                    <>
                      {/* Score Gauge */}
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${
                          preview.cancelability_score < 40 ? 'text-red-600' :
                          preview.cancelability_score < 55 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {preview.cancelability_score}
                        </div>
                        <p className="text-sm text-muted-foreground">Score de Cancelabilidade (0-100)</p>
                      </div>

                      {/* Rigidity Badge */}
                      <div className="flex justify-center gap-2">
                        <Badge
                          variant={preview.rigidity_effective === 'FIXO' ? 'destructive' : 'default'}
                          className="text-sm px-4 py-1"
                        >
                          {preview.rigidity_effective === 'FIXO' ? (
                            <><Lock className="mr-1 h-3 w-3" /> FIXO</>
                          ) : (
                            <><Unlock className="mr-1 h-3 w-3" /> FLEXÍVEL</>
                          )}
                        </Badge>
                      </div>

                      {/* Warnings */}
                      {preview.warnings.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Avisos do Sistema:</Label>
                          {preview.warnings.map((warning, idx) => (
                            <Alert key={idx} variant="default" className="py-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-sm">{warning}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        Calculado em: {new Date(preview.computed_at).toLocaleTimeString('pt-BR')}
                      </p>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {previewError ? `Erro ao calcular preview: ${previewError}` : 'Erro ao calcular preview'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Intenção</Label>
                    <Select value={filterIntention} onValueChange={setFilterIntention}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas</SelectItem>
                        {INTENTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rigidez</Label>
                    <Select value={filterRigidity} onValueChange={setFilterRigidity}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas</SelectItem>
                        <SelectItem value="FIXO">Fixas</SelectItem>
                        <SelectItem value="FLEXIVEL">Flexíveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredExpenses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {expenses.length === 0 
                    ? 'Nenhuma despesa cadastrada ainda.' 
                    : 'Nenhuma despesa encontrada com os filtros selecionados.'
                  }
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => {
                  const isFixed = expense.computed_rigidity === 'FIXO';
                  const score = expense.cancelability_score ?? 0;
                  const warnings = (expense.warnings as string[]) || [];

                  return (
                    <Card 
                      key={expense.id}
                      className={`${isFixed ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{expense.name}</h3>
                              <Badge variant={isFixed ? 'destructive' : 'default'} className="text-xs">
                                {isFixed ? <Lock className="mr-1 h-3 w-3" /> : <Unlock className="mr-1 h-3 w-3" />}
                                {isFixed ? 'FIXO' : 'FLEXÍVEL'}
                              </Badge>
                            </div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                {INTENTION_LABELS[expense.intention]}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                score < 40 ? 'bg-red-100 text-red-700' :
                                score < 55 ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                Score: {score}
                              </span>
                            </div>
                            {warnings.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {warnings.slice(0, 2).map((w, i) => (
                                  <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {w}
                                  </p>
                                ))}
                                {warnings.length > 2 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{warnings.length - 2} aviso(s)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(expense.id, expense.name)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Expenses;
