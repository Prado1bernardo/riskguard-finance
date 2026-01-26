
# App de Finanças Pessoais - Risco de Insolvência

## Visão Geral
Aplicativo focado em análise de risco financeiro pessoal, com ênfase na gestão de custos fixos como principal fator de risco de insolvência.

---

## Fase 1: Fundação (Backend + Autenticação)

### 1.1 Configurar Lovable Cloud com Supabase
- Ativar Lovable Cloud para ter acesso ao Supabase integrado
- Configurar autenticação por email (login/cadastro)

### 1.2 Criar Estrutura do Banco de Dados

**Tabela `profiles`** (1 linha por usuário):
- Dados financeiros base: renda mínima, renda variável, dependentes
- Reserva de emergência e serviço de dívida
- Timestamps de criação e atualização

**Tabela `expenses`** (despesas do usuário):
- Informações básicas: nome, valor, intenção (ESSENCIAL, CONFORTO, CRESCIMENTO, PATRIMÔNIO, LAZER)
- Dados contratuais: recorrência, meses restantes, dias de aviso, multa
- Indicadores: vínculo legal, obrigação essencial, substituibilidade
- Score de cancelabilidade (calculado no frontend)
- Campos de override para ajustes manuais

### 1.3 Segurança com RLS
- Políticas para garantir que cada usuário só acessa seus próprios dados
- Proteção contra acesso não autorizado

---

## Fase 2: Interface do Usuário (UI Minimalista)

### 2.1 Páginas de Autenticação
- Tela de login limpa e funcional
- Tela de cadastro com validação
- Fluxo de recuperação de senha

### 2.2 Onboarding do Perfil
- Formulário para preencher dados financeiros iniciais
- Campos numéricos validados
- Indicador de progresso simples

### 2.3 Gestão de Despesas
- Lista de despesas com filtros por intenção
- Formulário de cadastro/edição de despesa
- Campo para calcular e exibir `cancelability_score`
- Indicadores visuais de rigidez

---

## Fase 3: Análise e Alertas

### 3.1 Gráficos de Distribuição
- Gráfico de pizza/rosca mostrando despesas por intenção
- Barra de proporção custos fixos vs variáveis
- Visualização simples do comprometimento da renda

### 3.2 Sistema de Alertas de Risco
- Alerta quando despesas essenciais ultrapassam % da renda
- Indicador de saúde financeira baseado na reserva de emergência
- Warnings para despesas de alta rigidez (contratos longos, multas altas)

---

## Resultado Final
Um app minimalista e seguro onde o usuário pode:
- Cadastrar seu perfil financeiro
- Gerenciar todas suas despesas categorizadas
- Visualizar a distribuição dos gastos por tipo
- Receber alertas quando os custos fixos representarem risco

