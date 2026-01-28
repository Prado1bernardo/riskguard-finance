import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, User, DollarSign, Shield, Users, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();

  const [formData, setFormData] = useState({
    income_floor: 0,
    income_is_variable: false,
    dependents: 0,
    emergency_reserve: 0,
    debt_service: 0,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        income_floor: profile.income_floor ?? 0,
        income_is_variable: profile.income_is_variable ?? false,
        dependents: profile.dependents ?? 0,
        emergency_reserve: profile.emergency_reserve ?? 0,
        debt_service: profile.debt_service ?? 0,
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData, {
      onSuccess: () => {
        toast.success('Perfil atualizado com sucesso!');
      },
      onError: (error) => {
        toast.error(`Erro ao atualizar perfil: ${error.message}`);
      },
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurar Perfil</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Renda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Renda
              </CardTitle>
              <CardDescription>
                Configure sua renda mínima mensal garantida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income_floor">Renda Mínima Mensal (R$)</Label>
                <Input
                  id="income_floor"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 5000.00"
                  value={formData.income_floor}
                  onChange={(e) =>
                    setFormData({ ...formData, income_floor: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Este é o valor mínimo que você recebe por mês, mesmo em meses ruins
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="income_is_variable">Renda Variável</Label>
                  <p className="text-xs text-muted-foreground">
                    Sua renda varia significativamente mês a mês?
                  </p>
                </div>
                <Switch
                  id="income_is_variable"
                  checked={formData.income_is_variable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, income_is_variable: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Reserva de Emergência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Reserva de Emergência
              </CardTitle>
              <CardDescription>
                Quanto você tem guardado para emergências
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_reserve">Valor da Reserva (R$)</Label>
                <Input
                  id="emergency_reserve"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 30000.00"
                  value={formData.emergency_reserve}
                  onChange={(e) =>
                    setFormData({ ...formData, emergency_reserve: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Valor total disponível em aplicações de alta liquidez
                </p>
              </div>

              {formData.income_floor > 0 && formData.emergency_reserve > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Sua reserva cobre aproximadamente{' '}
                    <span className="font-semibold text-foreground">
                      {Math.floor(formData.emergency_reserve / formData.income_floor)} meses
                    </span>{' '}
                    de despesas básicas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dependentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Dependentes
              </CardTitle>
              <CardDescription>
                Número de pessoas que dependem da sua renda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="dependents">Quantidade de Dependentes</Label>
                <Input
                  id="dependents"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="Ex: 2"
                  value={formData.dependents}
                  onChange={(e) =>
                    setFormData({ ...formData, dependents: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Inclua cônjuge, filhos e outros que dependem financeiramente de você
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dívidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Compromissos com Dívidas
              </CardTitle>
              <CardDescription>
                Valor mensal comprometido com pagamento de dívidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="debt_service">Serviço da Dívida Mensal (R$)</Label>
                <Input
                  id="debt_service"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 1500.00"
                  value={formData.debt_service}
                  onChange={(e) =>
                    setFormData({ ...formData, debt_service: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Soma das parcelas de financiamentos, empréstimos e cartões
                </p>
              </div>

              {formData.income_floor > 0 && formData.debt_service > 0 && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Comprometimento com dívidas:{' '}
                    <span
                      className={`font-semibold ${
                        (formData.debt_service / formData.income_floor) * 100 > 30
                          ? 'text-destructive'
                          : 'text-foreground'
                      }`}
                    >
                      {((formData.debt_service / formData.income_floor) * 100).toFixed(1)}%
                    </span>{' '}
                    da renda
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg" disabled={isUpdating}>
            <Save className="mr-2 h-4 w-4" />
            {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
