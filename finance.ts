import { Transaction, TransactionType, Bet } from './types';

// Tipos que representam dinheiro ENTRANDO para nós (caixa +)
export const INFLOW_TYPES: TransactionType[] = ['SAQUE', 'PIX_RECEBIDO'];
// Tipos que representam dinheiro SAINDO de nós (caixa -)
export const OUTFLOW_TYPES: TransactionType[] = ['DEPOSITO', 'PIX_ENVIADO'];

export const isInflow = (t: TransactionType) => INFLOW_TYPES.includes(t);
export const isOutflow = (t: TransactionType) => OUTFLOW_TYPES.includes(t);

export interface FinanceSummary {
  deposited: number;   // Total depositado nas casas
  withdrawn: number;   // Total sacado das casas
  pixIn: number;       // Pix recebidos
  pixOut: number;      // Pix enviados
  adjust: number;      // Ajustes (tratados como entrada)
  inflow: number;      // Entradas totais (saque + pix recebido + ajuste)
  outflow: number;     // Saídas totais (depósito + pix enviado)
  net: number;         // Saldo de movimentação (inflow - outflow)
  pl: number;          // Lucro/Prejuízo = total de saque - total depositado
  count: number;       // Quantidade de transações consideradas
}

export function summarize(txs: Transaction[]): FinanceSummary {
  let deposited = 0, withdrawn = 0, pixIn = 0, pixOut = 0, adjust = 0;

  txs.forEach(t => {
    const a = Number(t.amount) || 0;
    switch (t.type) {
      case 'DEPOSITO': deposited += a; break;
      case 'SAQUE': withdrawn += a; break;
      case 'PIX_RECEBIDO': pixIn += a; break;
      case 'PIX_ENVIADO': pixOut += a; break;
      case 'AJUSTE': adjust += a; break;
      default: break; // OUTRO não afeta os números
    }
  });

  const inflow = withdrawn + pixIn + adjust;
  const outflow = deposited + pixOut;

  return {
    deposited, withdrawn, pixIn, pixOut, adjust,
    inflow, outflow,
    net: inflow - outflow,
    pl: withdrawn - deposited, // fórmula solicitada: saque - depósito
    count: txs.length
  };
}

export const fmtBRL = (v: number) =>
  (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// --- Motor de P/L das apostas (mesma lógica do Sheets) ---
export interface BetCalc {
  stake: number;     // stake em R$ (stakeUnits * unitValue)
  retorno: number;   // retorno bruto em R$
  pl: number;        // lucro/prejuízo em R$ (0 enquanto pendente)
  plUnits: number;   // P/L em unidades
  roi: number;       // pl / stake
  settled: boolean;  // resolvida (não TBD)
  pending: boolean;  // em aberto
}

export function computeBet(b: Pick<Bet, 'result' | 'stakeUnits' | 'unitValue' | 'odds' | 'cashoutValue'>): BetCalc {
  const unit = Number(b.unitValue) || 0;
  const stake = (Number(b.stakeUnits) || 0) * unit;
  const odds = Number(b.odds) || 0;
  let retorno = stake;
  let pending = false;
  switch (b.result) {
    case 'W': retorno = stake * odds; break;            // green
    case 'L': retorno = 0; break;                       // red
    case 'R': retorno = stake; break;                   // void (devolve)
    case 'HW': retorno = (stake / 2) * odds + stake / 2; break; // meio green
    case 'HL': retorno = stake / 2; break;              // meio red
    case 'CASHED': retorno = Number(b.cashoutValue) || 0; break; // cashout (retorno informado)
    case 'TBD':
    default: pending = true; retorno = stake; break;    // em aberto
  }
  const pl = pending ? 0 : retorno - stake;
  return {
    stake,
    retorno,
    pl,
    plUnits: unit > 0 ? pl / unit : 0,
    roi: stake > 0 ? pl / stake : 0,
    settled: !pending,
    pending,
  };
}
