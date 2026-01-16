
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

export interface Account {
  id: string;
  name: string;
  username?: string; // Login na casa de aposta
  email: string;
  password?: string; // Senha na casa de aposta
  house: string;
  depositValue: number;
  status: 'ACTIVE' | 'LIMITED' | 'REPLACEMENT' | 'DELETED';
  limitedAt?: string;
  replacementAt?: string; // Date when marked for replacement
  deletionReason?: string;
  owner?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  taskIdSource?: string;
  packId?: string;
  phone?: string;
  card?: string; // Moved to end as requested
}

export interface LogEntry {
  id: string;
  taskId?: string;
  taskDescription: string;
  action: string;
  user: string;
  timestamp: string;
}

export type TabView = 'DASHBOARD' | 'NEW_REQUEST' | 'HISTORY' | 'ACCOUNTS_ACTIVE' | 'ACCOUNTS_LIMITED' | 'ACCOUNTS_REPLACEMENT' | 'ACCOUNTS_DELETED' | 'PACKS' | 'SETTINGS' | 'INSIGHTS';