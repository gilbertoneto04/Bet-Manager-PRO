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
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  defaultPixKeyId?: string; // New field for default key preference
}

export interface PixKey {
  id: string;
  name: string; // Nome do titular ou identificador
  bank: string;
  keyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  key: string;
}

export interface Task {
  id: string;
  type: string;
  house: string;
  accountName?: string;
  quantity?: number;
  description?: string;
  pixKeyInfo?: string; // Information about where to send money
  status: TaskStatus;
  deletionReason?: string;
  createdAt: string;
  updatedAt: string;
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
  email: string;
  password?: string;
  card?: string;
  house: string;
  depositValue: number;
  status: 'ACTIVE' | 'LIMITED' | 'REPLACEMENT';
  owner?: string; // New field
  tags: string[]; // New field
  createdAt: string;
  taskIdSource?: string;
  packId?: string;
}

export interface LogEntry {
  id: string;
  taskId?: string; // Made optional for system logs
  taskDescription: string;
  action: string;
  user: string;
  timestamp: string;
}

export type TabView = 'DASHBOARD' | 'NEW_REQUEST' | 'HISTORY' | 'ACCOUNTS_ACTIVE' | 'ACCOUNTS_LIMITED' | 'ACCOUNTS_REPLACEMENT' | 'PACKS' | 'SETTINGS' | 'INSIGHTS';