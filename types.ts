
export enum TaskType {
  SMS = 'SMS',
  FACIAL_SEMANAL = 'FACIAL_SEMANAL',
  REMOVER_2FA = 'REMOVER_2FA',
  DEPOSITO = 'DEPOSITO',
  SAQUE = 'SAQUE',
  ENVIO_SALDO = 'ENVIO_SALDO',
  CONTA_NOVA = 'CONTA_NOVA',
  OUTRO = 'OUTRO'
}

export enum TaskStatus {
  PENDENTE = 'PENDENTE',
  SOLICITADA = 'SOLICITADA',
  FINALIZADA = 'FINALIZADA',
  EXCLUIDA = 'EXCLUIDA'
}

export interface User {
  id: string;
  name: string; // Nome Completo
  username: string; // Nome de Usuário (Login)
  email: string;
  password?: string;
  role: 'ADMIN' | 'USER' | 'AGENCIA' | 'KFB';
  defaultPixKeyId?: string;
  createdAt?: string;
}

export interface PixKey {
  id: string;
  name: string;
  bank: string;
  keyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  key: string;
  createdAt: string;
}

export interface Task {
  id: string;
  type: string;
  house: string;
  accountName?: string;
  quantity?: number;
  description?: string;
  pixKeyInfo?: string;
  status: TaskStatus;
  deletionReason?: string;
  orderIndex?: number;
  createdBy?: string; // Name of the user who requested the task
  finishedBy?: string; // ID of the AGENCIA user who finished it
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string; // Date when status became FINALIZADA
}

export interface Pack {
  id: string;
  house: string;
  quantity: number;
  delivered: number;
  price: number;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

// Titular: pessoa dona dos dados das contas (nome, e-mail e telefone)
export interface Holder {
  id: string;
  name: string;   // Nome do Titular
  email: string;  // E-mail do titular
  phone: string;  // Telefone do titular
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Account {
  id: string;
  name: string;
  username?: string; // Login na casa de aposta
  email: string;     // E-mail efetivamente cadastrado NESTA casa (pode ser o do titular ou outro)
  password?: string; // Senha na casa de aposta
  house: string;
  depositValue: number;  // Valor depositado na conta
  paidValue?: number;    // Valor pago na conta (custo de aquisição/pagamento ao titular)
  status: 'ACTIVE' | 'LIMITED' | 'REPLACEMENT' | 'DELETED';
  limitedAt?: string;
  replacementAt?: string; // Date when marked for replacement
  deletionReason?: string;
  owner?: string;
  holderId?: string;     // Vínculo com o Titular cadastrado
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  taskIdSource?: string;
  packId?: string;
  phone?: string;        // Telefone efetivamente cadastrado NESTA casa (pode ser o do titular ou outro)
  card?: string; // Moved to end as requested
}

// Tipos de transação financeira de uma conta
export type TransactionType = 'DEPOSITO' | 'SAQUE' | 'PIX_RECEBIDO' | 'PIX_ENVIADO' | 'AJUSTE' | 'OUTRO';

export interface Transaction {
  id: string;
  accountId: string;
  accountName?: string;
  holderId?: string;
  house: string;
  type: TransactionType;
  amount: number;        // Sempre positivo; o sinal é definido pelo tipo
  origin?: string;       // Origem (ex.: de onde veio o Pix)
  destination?: string;  // Destino (ex.: para onde foi o Pix / saque)
  description?: string;
  date: string;          // Data da transação (ISO)
  createdBy?: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  taskId?: string;
  taskDescription: string;
  action: string;
  user: string;
  timestamp: string;
}

export type TabView = 'DASHBOARD' | 'NEW_REQUEST' | 'HISTORY' | 'ACCOUNTS_ACTIVE' | 'ACCOUNTS_LIMITED' | 'ACCOUNTS_REPLACEMENT' | 'ACCOUNTS_DELETED' | 'PACKS' | 'SETTINGS' | 'INSIGHTS' | 'HOLDERS';