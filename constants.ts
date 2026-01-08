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