// Helpers compartilhados entre as abas Apostas (registro) e Resultados (análise).
import { Bet, BetResult } from '../types';
import { computeBet, placementsOf } from '../finance';

export const num = (v: any) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
export const round2 = (v: number) => Math.round(v * 100) / 100;
// Stake em unidades guardado com mais casas para preservar centavos (R$ = unidades * valor da unidade).
export const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
export const fmtNum = (v: number) => round2(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtU = (v: number) => `${v >= 0 ? '+' : ''}${fmtNum(v)}u`;
export const fmtDate = (d?: string) => {
  if (!d) return '—';
  const iso = d.length > 10 ? d.slice(0, 10) : d;
  const [y, m, day] = iso.split('-');
  return (day && m && y) ? `${day}/${m}/${y}` : d;
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

export type ResultFilter = 'ALL' | 'OPEN' | 'SETTLED' | BetResult;
export type Dimension = 'date' | 'prelive' | 'tipster' | 'titular' | 'house' | 'sport' | 'market' | 'provider';

export const RESULT_OPTIONS: { value: BetResult; label: string }[] = [
  { value: 'TBD', label: 'Em aberto' }, { value: 'W', label: 'Green' }, { value: 'L', label: 'Red' },
  { value: 'R', label: 'Void' }, { value: 'HW', label: '½ Green' }, { value: 'HL', label: '½ Red' }, { value: 'CASHED', label: 'Cashout' },
];
export const RESULT_LABEL: Record<BetResult, string> = RESULT_OPTIONS.reduce((a, o) => { a[o.value] = o.label; return a; }, {} as Record<BetResult, string>);
export const resultBadgeClass = (r: BetResult) => {
  switch (r) {
    case 'W': case 'HW': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'L': case 'HL': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'CASHED': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'R': return 'bg-slate-600/20 text-slate-300 border-slate-600/30';
    default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
};

export const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'date', label: 'Data' }, { value: 'prelive', label: 'Pré/Live' }, { value: 'tipster', label: 'Tipster' },
  { value: 'titular', label: 'Titular' }, { value: 'house', label: 'Casa' }, { value: 'sport', label: 'Esporte' },
  { value: 'market', label: 'Mercado' }, { value: 'provider', label: 'Provedor' },
];
export const PLACEMENT_DIMS: Dimension[] = ['titular', 'house', 'provider'];

export const dimKey = (b: Bet, dim: Dimension): string => {
  if (dim === 'date') return b.date || '—';
  if (dim === 'prelive') return b.moment === 'LIVE' ? 'Live' : b.moment === 'PRE' ? 'Pré' : '—';
  if (dim === 'tipster') return b.tipster || '—';
  if (dim === 'sport') return b.sport || '—';
  if (dim === 'market') return b.market || '—';
  return '—';
};
export const placementField = (dim: Dimension): 'house' | 'owner' | 'provider' => dim === 'titular' ? 'owner' : dim === 'provider' ? 'provider' : 'house';
export const summarize = (b: Bet, field: 'house' | 'owner' | 'provider') => {
  const vals = Array.from(new Set(placementsOf(b).map(p => p[field]).filter(Boolean))) as string[];
  if (vals.length === 0) return '—';
  return vals.length === 1 ? vals[0] : `${vals[0]} +${vals.length - 1}`;
};

// --- Filtros (compartilhados) ---
export interface BetFilters {
  search?: string; tipster?: string; result?: ResultFilter;
  house?: string; provider?: string; market?: string; titular?: string;
  dateFrom?: string; dateTo?: string;
}
export const betMatches = (b: Bet, f: BetFilters): boolean => {
  const ps = placementsOf(b);
  if (f.tipster && f.tipster !== 'ALL' && b.tipster !== f.tipster) return false;
  if (f.house && f.house !== 'ALL' && !ps.some(p => (p.house || '') === f.house)) return false;
  if (f.provider && f.provider !== 'ALL' && !ps.some(p => (p.provider || '') === f.provider)) return false;
  if (f.titular && f.titular !== 'ALL' && !ps.some(p => (p.owner || '') === f.titular)) return false;
  if (f.market && f.market !== 'ALL' && (b.market || '') !== f.market) return false;
  if (f.result === 'OPEN' && b.result !== 'TBD') return false;
  if (f.result === 'SETTLED' && b.result === 'TBD') return false;
  if (f.result && f.result !== 'ALL' && f.result !== 'OPEN' && f.result !== 'SETTLED' && b.result !== f.result) return false;
  const d = (b.date || '').slice(0, 10);
  if (f.dateFrom && d < f.dateFrom) return false;
  if (f.dateTo && d > f.dateTo) return false;
  const term = (f.search || '').trim().toLowerCase();
  if (term) {
    const hay = [b.tipster, b.team1, b.team2, b.selection, b.market, b.sport, ...ps.flatMap(p => [p.house, p.owner, p.provider])].join(' ').toLowerCase();
    if (!hay.includes(term)) return false;
  }
  return true;
};

// --- KPIs / resumo / acumulado (compartilhados) ---
export interface BetKpis { invested: number; profit: number; plUnits: number; settled: number; openCount: number; openStake: number; total: number; roi: number; }
export const buildKpis = (bets: Bet[]): BetKpis => {
  let invested = 0, profit = 0, plUnits = 0, settled = 0, openCount = 0, openStake = 0;
  bets.forEach(b => {
    const c = computeBet(b);
    if (c.pending) { openCount++; openStake += c.stake; }
    else { settled++; invested += c.stake; profit += c.pl; plUnits += c.plUnits; }
  });
  return { invested, profit, plUnits, settled, openCount, openStake, total: bets.length, roi: invested > 0 ? profit / invested : 0 };
};

export interface SummaryRow { key: string; count: number; stake: number; pl: number; plUnits: number; roi: number; }
export const buildSummary = (bets: Bet[], dimension: Dimension): SummaryRow[] => {
  const map = new Map<string, { count: number; stake: number; pl: number; plUnits: number }>();
  const add = (key: string, c: { stake: number; pl: number; plUnits: number }) => {
    const cur = map.get(key) || { count: 0, stake: 0, pl: 0, plUnits: 0 };
    cur.count++; cur.stake += c.stake; cur.pl += c.pl; cur.plUnits += c.plUnits; map.set(key, cur);
  };
  bets.forEach(b => {
    const c = computeBet(b);
    if (c.pending) return;
    if (PLACEMENT_DIMS.includes(dimension)) {
      const field = placementField(dimension);
      const ps = placementsOf(b);
      if (b.result === 'CASHED') { add((ps[0]?.[field] as string) || '—', c); }
      else ps.forEach(p => add((p[field] as string) || '—', computeBet({ result: b.result, placements: [p] })));
    } else add(dimKey(b, dimension), c);
  });
  const arr = Array.from(map.entries()).map(([key, v]) => ({ key, ...v, roi: v.stake > 0 ? v.pl / v.stake : 0 }));
  return dimension === 'date' ? arr.sort((a, b) => a.key.localeCompare(b.key)) : arr.sort((a, b) => b.pl - a.pl);
};

export const buildCum = (bets: Bet[], chartUnit: 'BRL' | 'U') => {
  const settled = bets.filter(b => !computeBet(b).pending).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  let cum = 0, cumU = 0;
  return settled.map((b, i) => { const c = computeBet(b); cum += c.pl; cumU += c.plUnits; return { i, label: fmtDate(b.date), v: round2(chartUnit === 'BRL' ? cum : cumU) }; });
};

// Valores distintos de um campo de placement (casa/provedor/titular) presentes nas apostas.
export const distinctPlacementVals = (bets: Bet[], field: 'house' | 'provider' | 'owner') =>
  Array.from(new Set(bets.flatMap(b => placementsOf(b).map(p => p[field] || '')).filter(Boolean))).sort();
export const distinctBetVals = (bets: Bet[], key: keyof Bet) =>
  Array.from(new Set(bets.map(b => (b[key] as string) || '').filter(Boolean))).sort();
