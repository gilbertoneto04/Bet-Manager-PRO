import { TaskType, TaskStatus } from './types';

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.SMS]: 'SMS',
  [TaskType.FACIAL_SEMANAL]: 'Facial Semanal',
  [TaskType.REMOVER_2FA]: 'Remover 2FA',
  [TaskType.DEPOSITO]: 'Depósito',
  [TaskType.SAQUE]: 'Saque',
  [TaskType.ENVIO_SALDO]: 'Envio de Saldo',
  [TaskType.CONTA_NOVA]: 'Conta Nova',
  [TaskType.OUTRO]: 'Outro'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDENTE]: 'Pendente',
  [TaskStatus.SOLICITADA]: 'Solicitada',
  [TaskStatus.FINALIZADA]: 'Finalizada',
  [TaskStatus.EXCLUIDA]: 'Excluída'
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  'ACTIVE': 'Ativa',
  'LIMITED': 'Limitada',
  'REPLACEMENT': 'Reposição',
  'DELETED': 'Excluída'
};

// Descrição padrão da transação de depósito inicial gerada no cadastro da conta.
// O campo "Valor Depósito" da conta é a fonte de verdade; esta transação é seu espelho no ledger.
export const INITIAL_DEPOSIT_DESCRIPTION = 'Depósito inicial (cadastro da conta)';

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  'DEPOSITO': 'Depósito',
  'SAQUE': 'Saque',
  'PIX_RECEBIDO': 'Pix Recebido',
  'PIX_ENVIADO': 'Pix Enviado',
  'AJUSTE': 'Ajuste',
  'OUTRO': 'Outro'
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.PENDENTE]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  [TaskStatus.SOLICITADA]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  [TaskStatus.FINALIZADA]: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  [TaskStatus.EXCLUIDA]: 'bg-red-500/10 text-red-500 border-red-500/20'
};

export const MOCK_HOUSES = [
  'Bet365',
  'Betano',
  'Novibet',
  'KTO',
  'EstrelaBet',
  'Stake',
  'Outra'
];

// Categoria especial dos gastos: custo da operação de apostas.
// No Resumo ela é somada à parte, separada das demais "Despesas".
// (As categorias aparecem sozinhas conforme forem sendo usadas — não há lista fixa.)
export const EXPENSE_APOSTAS_CATEGORY = 'APOSTAS';

// Formas de pagamento de um gasto.
export const PAYMENT_METHODS: { value: 'PIX' | 'DINHEIRO' | 'DEBITO' | 'CREDITO' | 'BOLETO'; label: string }[] = [
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'CREDITO', label: 'Crédito' },
  { value: 'BOLETO', label: 'Boleto' },
];

// Tag aplicada a contas/bancos criados pelo importador de saldos (SaldosImport).
// Permite o "Limpar importados" identificar com precisão o que veio da planilha.
export const IMPORTED_ACCOUNT_TAG = 'IMPORTADO_PLANILHA';
export const PAYMENT_METHOD_LABELS: Record<string, string> = PAYMENT_METHODS.reduce((a, m) => { a[m.value] = m.label; return a; }, {} as Record<string, string>);

// Nomes dos meses (usados nas abas Gastos e Resumo).
export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];