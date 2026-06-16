import { Transaction, TransactionType, BetPlacement, BetResult } from './types';

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

// --- Motor de P/L das apostas (mesma lógica do Sheets, agora com múltiplas entradas) ---
export interface BetCalc {
  stake: number;     // R$ total investido (soma das entradas)
  units: number;     // unidades totais
  avgOdds: number;   // odd média (ponderada pelo stake em R$)
  retorno: number;   // retorno bruto em R$
  pl: number;        // lucro/prejuízo em R$ (0 enquanto pendente)
  plUnits: number;   // P/L em unidades
  roi: number;       // pl / stake
  settled: boolean;  // resolvida (não TBD)
  pending: boolean;  // em aberto
}

// Aceita uma aposta com `placements` OU os campos legados (apostas antigas/single).
type BetCalcInput = {
  result: BetResult;
  cashoutValue?: number;
  placements?: BetPlacement[];
  stakeUnits?: number;
  unitValue?: number;
  odds?: number;
  house?: string;
  owner?: string;
  provider?: string;
};

// Retorna as entradas; se não houver `placements`, cria uma entrada sintética a partir dos campos legados.
export function placementsOf(b: BetCalcInput): BetPlacement[] {
  if (b.placements && b.placements.length) return b.placements;
  return [{
    id: 'legacy', house: b.house, owner: b.owner, provider: b.provider,
    stakeUnits: Number(b.stakeUnits) || 0, unitValue: Number(b.unitValue) || 0, odds: Number(b.odds) || 0,
  }];
}

function placementReturn(result: BetResult, s: number, o: number): number {
  switch (result) {
    case 'W': return s * o;
    case 'L': return 0;
    case 'R': return s;
    case 'HW': return (s / 2) * o + s / 2;
    case 'HL': return s / 2;
    default: return s;
  }
}

export function computeBet(b: BetCalcInput): BetCalc {
  const ps = placementsOf(b);
  const result = b.result;
  const pending = !result || result === 'TBD';
  let stake = 0, units = 0, oddW = 0, retorno = 0, plUnits = 0;
  ps.forEach(p => {
    const unit = Number(p.unitValue) || 0;
    const s = (Number(p.stakeUnits) || 0) * unit;
    const o = Number(p.odds) || 0;
    stake += s; units += Number(p.stakeUnits) || 0; oddW += s * o;
    if (!pending && result !== 'CASHED') {
      const r = placementReturn(result, s, o);
      retorno += r;
      plUnits += unit > 0 ? (r - s) / unit : 0;
    }
  });
  if (result === 'CASHED') {
    retorno = Number(b.cashoutValue) || 0;
    const avgUnit = units > 0 ? stake / units : 0;
    plUnits = avgUnit > 0 ? (retorno - stake) / avgUnit : 0;
  } else if (pending) {
    retorno = stake;
  }
  const pl = pending ? 0 : retorno - stake;
  return {
    stake, units, avgOdds: stake > 0 ? oddW / stake : 0,
    retorno, pl, plUnits, roi: stake > 0 ? pl / stake : 0,
    settled: !pending, pending,
  };
}
