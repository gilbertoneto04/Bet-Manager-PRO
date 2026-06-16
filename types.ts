
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
  currentBalance?: number;   // Saldo atual na casa/banco (mantido manualmente; espelha a aba "Saldos")
  pendingBalance?: number;   // Saldo pendente (ex.: saque em processamento)
  balanceNote?: string;      // Observação do saldo (ex.: "Sacar", "Depositar", "Conta bloqueada")
  balanceUpdatedAt?: string; // Data da última atualização manual do saldo
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

// Banco ou investimento avulso: controle de patrimônio, FORA das contas de aposta
// e FORA do cálculo de P/L. Serve apenas para acompanhamento do saldo.
export interface Bank {
  id: string;
  name: string;            // Nome do banco/corretora (ex.: NUBANK, SICREDI, KFB Broker)
  kind: 'BANK' | 'INVESTMENT';
  holderId?: string;       // Titular vinculado (opcional)
  owner?: string;          // Nome do titular (espelho, para exibição)
  balance: number;         // Saldo atual
  pendingBalance?: number; // Saldo pendente
  note?: string;           // Observação (ex.: PF, PJ, CAIXINHA)
  createdAt: string;
  updatedAt?: string;
}

// Resolução de uma aposta (espelha a coluna "Result" do Sheets)
export type BetResult = 'TBD' | 'W' | 'L' | 'R' | 'HW' | 'HL' | 'CASHED';

// Tipster com valor padrão de unidade. Esse valor é apenas o DEFAULT ao criar a aposta;
// cada aposta guarda seu próprio unitValue (snapshot) e não muda se o padrão mudar depois.
export interface Tipster {
  id: string;
  name: string;
  unitValue: number;   // valor padrão de 1 unidade (R$)
  createdAt: string;
  updatedAt?: string;
}

export interface Bet {
  id: string;
  date: string;            // data da aposta/evento (ISO)
  tipster: string;         // nome do tipster
  unitValue: number;       // valor de 1 unidade NO MOMENTO da aposta (snapshot)
  stakeUnits: number;      // stake em unidades (R$ = stakeUnits * unitValue)
  odds: number;
  result: BetResult;
  cashoutValue?: number;   // retorno em R$ quando result = CASHED
  sport?: string;          // esporte
  house?: string;          // casa
  provider?: string;       // provedor
  team1?: string;
  team2?: string;
  market?: string;         // mercado
  selection?: string;      // aposta
  moment?: 'PRE' | 'LIVE';
  fairOdds?: number;       // odd justa (para EV%), opcional
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TabView = 'DASHBOARD' | 'NEW_REQUEST' | 'HISTORY' | 'ACCOUNTS_ACTIVE' | 'ACCOUNTS_LIMITED' | 'ACCOUNTS_REPLACEMENT' | 'ACCOUNTS_DELETED' | 'PACKS' | 'SETTINGS' | 'INSIGHTS' | 'HOLDERS' | 'BALANCES' | 'BETS';