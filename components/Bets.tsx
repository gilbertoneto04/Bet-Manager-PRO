import React, { useMemo, useState, useEffect } from 'react';
import { Bet, BetPlacement, Tipster, BetResult, Account } from '../types';
import { computeBet, fmtBRL, placementsOf } from '../finance';
import {
  Dices, Plus, Pencil, Trash2, X, Save, Search, Filter, TrendingUp,
  Users, BarChart3, ArrowDownUp, Columns3, Lock, Unlock, CheckCircle2, Hourglass
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { BetsImport } from './BetsImport'; // TEMP: importador do Sheets — remover na versão final

interface BetsProps {
  bets: Bet[];
  tipsters: Tipster[];
  accounts: Account[];
  availableHouses: string[];
  houseProviders: Record<string, string>;
  onSaveBet: (bet: Bet) => void;
  onDeleteBet: (id: string) => void;
  onDeleteManyBets: (ids: string[]) => void;
  onSaveTipster: (t: Tipster) => void;
  onDeleteTipster: (id: string) => void;
}

const RESULT_OPTIONS: { value: BetResult; label: string }[] = [
  { value: 'TBD', label: 'Em aberto' }, { value: 'W', label: 'Green' }, { value: 'L', label: 'Red' },
  { value: 'R', label: 'Void' }, { value: 'HW', label: '½ Green' }, { value: 'HL', label: '½ Red' }, { value: 'CASHED', label: 'Cashout' },
];
const RESULT_LABEL: Record<BetResult, string> = RESULT_OPTIONS.reduce((a, o) => { a[o.value] = o.label; return a; }, {} as Record<BetResult, string>);
const resultBadgeClass = (r: BetResult) => {
  switch (r) {
    case 'W': case 'HW': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'L': case 'HL': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'CASHED': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'R': return 'bg-slate-600/20 text-slate-300 border-slate-600/30';
    default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
};

const num = (v: any) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const round2 = (v: number) => Math.round(v * 100) / 100;
// Stake em unidades guardado com mais casas para preservar centavos (R$ = unidades * valor da unidade).
// Ex.: unidade=1000 e R$ 1164,96 ⇒ 1.16496u (round2 perderia os centavos).
const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const fmtNum = (v: number) => round2(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtU = (v: number) => `${v >= 0 ? '+' : ''}${fmtNum(v)}u`;
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const iso = d.length > 10 ? d.slice(0, 10) : d;
  const [y, m, day] = iso.split('-');
  return (day && m && y) ? `${day}/${m}/${y}` : d;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

type ResultFilter = 'ALL' | 'OPEN' | 'SETTLED' | BetResult;
type SortKey = 'DATE_DESC' | 'DATE_ASC' | 'PL_DESC' | 'PL_ASC';
type Dimension = 'date' | 'prelive' | 'tipster' | 'titular' | 'house' | 'sport' | 'market' | 'provider';
type PageSize = 10 | 25 | 50 | 100 | 'ALL';

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'date', label: 'Data' }, { value: 'prelive', label: 'Pré/Live' }, { value: 'tipster', label: 'Tipster' },
  { value: 'titular', label: 'Titular' }, { value: 'house', label: 'Casa' }, { value: 'sport', label: 'Esporte' },
  { value: 'market', label: 'Mercado' }, { value: 'provider', label: 'Provedor' },
];
const PLACEMENT_DIMS: Dimension[] = ['titular', 'house', 'provider'];

const COLUMNS: { key: string; label: string }[] = [
  { key: 'date', label: 'Data' }, { key: 'time', label: 'Hora' }, { key: 'tipster', label: 'Tipster' },
  { key: 'event', label: 'Evento' }, { key: 'selection', label: 'Aposta' }, { key: 'market', label: 'Mercado' },
  { key: 'titular', label: 'Titular' }, { key: 'house', label: 'Casa' }, { key: 'provider', label: 'Provedor' }, { key: 'moment', label: 'Momento' },
  { key: 'stake', label: 'Stake' }, { key: 'odd', label: 'Odd' }, { key: 'result', label: 'Resultado' }, { key: 'pl', label: 'P/L' },
];
const DEFAULT_COLS = ['date', 'time', 'tipster', 'event', 'selection', 'market', 'titular', 'house', 'stake', 'odd', 'result', 'pl'];

const dimKey = (b: Bet, dim: Dimension): string => {
  if (dim === 'date') return b.date || '—';
  if (dim === 'prelive') return b.moment === 'LIVE' ? 'Live' : b.moment === 'PRE' ? 'Pré' : '—';
  if (dim === 'tipster') return b.tipster || '—';
  if (dim === 'sport') return b.sport || '—';
  if (dim === 'market') return b.market || '—';
  return '—';
};
const placementField = (dim: Dimension): 'house' | 'owner' | 'provider' => dim === 'titular' ? 'owner' : dim === 'provider' ? 'provider' : 'house';
const summarize = (b: Bet, field: 'house' | 'owner' | 'provider') => {
  const vals = Array.from(new Set(placementsOf(b).map(p => p[field]).filter(Boolean))) as string[];
  if (vals.length === 0) return '—';
  return vals.length === 1 ? vals[0] : `${vals[0]} +${vals.length - 1}`;
};

type PlacementForm = { accountId?: string; house?: string; owner?: string; provider?: string; stakeUnits?: number; stakeReais?: number; odds?: number };
type BetForm = {
  id?: string; date?: string; time?: string; tipster?: string; unitValue?: number; result?: BetResult; cashoutValue?: number;
  sport?: string; team1?: string; team2?: string; market?: string; selection?: string; moment?: 'PRE' | 'LIVE'; fairOdds?: number; note?: string;
  createdAt?: string; placements: PlacementForm[];
};

export const Bets: React.FC<BetsProps> = ({ bets, tipsters, accounts, availableHouses, houseProviders, onSaveBet, onDeleteBet, onDeleteManyBets, onSaveTipster, onDeleteTipster }) => {
  const [search, setSearch] = useState('');
  const [filterTipster, setFilterTipster] = useState('ALL');
  const [filterResult, setFilterResult] = useState<ResultFilter>('ALL');
  const [filterHouse, setFilterHouse] = useState('ALL');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayISO());
  const [sortBy, setSortBy] = useState<SortKey>('DATE_DESC');
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);
  const [dimension, setDimension] = useState<Dimension>('date');
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_COLS));
  const [showCols, setShowCols] = useState(false);
  const [chartUnit, setChartUnit] = useState<'BRL' | 'U'>('BRL');
  const [betForm, setBetForm] = useState<BetForm | null>(null);
  const [unitLocked, setUnitLocked] = useState(true);
  const [detailBet, setDetailBet] = useState<Bet | null>(null);
  const [showTipsters, setShowTipsters] = useState(false);
  const [tipsterForm, setTipsterForm] = useState<Partial<Tipster>>({ name: '', unitValue: 0 });
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setBetForm(null); setShowTipsters(false); setDetailBet(null); setShowCols(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const vis = (k: string) => visibleCols.has(k);
  // Ao escolher a casa no filtro, já assume o provedor configurado dela (se houver).
  const onChangeFilterHouse = (house: string) => {
    setFilterHouse(house); setPage(1);
    if (house !== 'ALL' && houseProviders[house]) setFilterProvider(houseProviders[house]);
    else if (house === 'ALL') setFilterProvider('ALL');
  };
  const tipsterUnit = (name: string) => tipsters.find(t => t.name === name)?.unitValue || 0;
  const activeAccounts = useMemo(() => accounts.filter(a => a.status !== 'DELETED'), [accounts]);
  const distinctBet = (key: keyof Bet) => Array.from(new Set(bets.map(b => (b[key] as string) || '').filter(Boolean))).sort();
  const distinctPlacement = (field: 'house' | 'provider') => Array.from(new Set(bets.flatMap(b => placementsOf(b).map(p => p[field] || '')).filter(Boolean))).sort();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bets.filter(b => {
      if (filterTipster !== 'ALL' && b.tipster !== filterTipster) return false;
      if (filterHouse !== 'ALL' && !placementsOf(b).some(p => (p.house || '') === filterHouse)) return false;
      if (filterProvider !== 'ALL' && !placementsOf(b).some(p => (p.provider || '') === filterProvider)) return false;
      if (filterMarket !== 'ALL' && (b.market || '') !== filterMarket) return false;
      if (filterResult === 'OPEN' && b.result !== 'TBD') return false;
      if (filterResult === 'SETTLED' && b.result === 'TBD') return false;
      if (filterResult !== 'ALL' && filterResult !== 'OPEN' && filterResult !== 'SETTLED' && b.result !== filterResult) return false;
      const d = (b.date || '').slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (term) {
        const hay = [b.tipster, b.team1, b.team2, b.selection, b.market, b.sport, ...placementsOf(b).flatMap(p => [p.house, p.owner, p.provider])].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [bets, search, filterTipster, filterResult, filterHouse, filterProvider, filterMarket, dateFrom, dateTo]);

  // KPIs, resumo e gráficos respeitam os filtros ativos (data, mercado, casa, etc.).
  const kpis = useMemo(() => {
    let invested = 0, profit = 0, plUnits = 0, settled = 0, openCount = 0, openStake = 0;
    filtered.forEach(b => {
      const c = computeBet(b);
      if (c.pending) { openCount++; openStake += c.stake; }
      else { settled++; invested += c.stake; profit += c.pl; plUnits += c.plUnits; }
    });
    return { invested, profit, plUnits, settled, openCount, openStake, total: filtered.length, roi: invested > 0 ? profit / invested : 0 };
  }, [filtered]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'DATE_ASC': return (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
      case 'PL_DESC': return computeBet(b).pl - computeBet(a).pl;
      case 'PL_ASC': return computeBet(a).pl - computeBet(b).pl;
      default: return (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''));
    }
  }), [filtered, sortBy]);

  const size = pageSize === 'ALL' ? sorted.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => sorted.slice((safePage - 1) * size, safePage * size), [sorted, safePage, size]);

  const filterSig = [search, filterTipster, filterResult, filterHouse, filterProvider, filterMarket, dateFrom, dateTo, sortBy, String(pageSize), String(safePage)].join('|');
  const betIdsSig = useMemo(() => bets.map(b => b.id).sort().join(','), [bets]);
  useEffect(() => { setDisplayIds(pageSlice.map(b => b.id)); /* eslint-disable-next-line */ }, [filterSig, betIdsSig]);

  const byId = useMemo(() => new Map(bets.map(b => [b.id, b])), [bets]);
  const renderBets = displayIds.map(id => byId.get(id)).filter(Boolean) as Bet[];

  // ---- seleção múltipla / exclusão em massa ----
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pageAllSelected = renderBets.length > 0 && renderBets.every(b => selectedIds.has(b.id));
  const toggleSelectPage = () => setSelectedIds(prev => {
    const n = new Set(prev);
    if (pageAllSelected) renderBets.forEach(b => n.delete(b.id));
    else renderBets.forEach(b => n.add(b.id));
    return n;
  });
  const selectAllFiltered = () => setSelectedIds(new Set(sorted.map(b => b.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const deleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} aposta(s) selecionada(s)? Esta ação não pode ser desfeita.`)) return;
    onDeleteManyBets(ids);
    clearSelection();
  };
  // Mantém a seleção limpa de ids que sumiram (ex.: após exclusão).
  useEffect(() => { setSelectedIds(prev => { const n = new Set(Array.from(prev).filter(id => byId.has(id))); return n.size === prev.size ? prev : n; }); }, [byId]);

  const summary = useMemo(() => {
    const map = new Map<string, { count: number; stake: number; pl: number; plUnits: number }>();
    const add = (key: string, c: { stake: number; pl: number; plUnits: number }) => {
      const cur = map.get(key) || { count: 0, stake: 0, pl: 0, plUnits: 0 };
      cur.count++; cur.stake += c.stake; cur.pl += c.pl; cur.plUnits += c.plUnits; map.set(key, cur);
    };
    filtered.forEach(b => {
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
  }, [filtered, dimension]);

  const cumData = useMemo(() => {
    const settled = filtered.filter(b => !computeBet(b).pending).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    let cum = 0, cumU = 0;
    return settled.map((b, i) => { const c = computeBet(b); cum += c.pl; cumU += c.plUnits; return { i, label: fmtDate(b.date), v: round2(chartUnit === 'BRL' ? cum : cumU) }; });
  }, [filtered, chartUnit]);
  const barData = useMemo(() => summary.map(s => ({ key: dimension === 'date' ? fmtDate(s.key) : s.key, v: round2(chartUnit === 'BRL' ? s.pl : s.plUnits) })), [summary, chartUnit, dimension]);

  // ---- form ----
  const recomputeReais = (placements: PlacementForm[], unit: number) => placements.map(p => ({ ...p, stakeReais: round2((p.stakeUnits || 0) * unit) }));
  const openNewBet = () => { setUnitLocked(true); setBetForm({ date: todayISO(), tipster: '', unitValue: 0, result: 'TBD', moment: 'PRE', placements: [{ stakeUnits: 0, stakeReais: 0, odds: 0 }] }); };
  const openEditBet = (b: Bet) => {
    setUnitLocked(true); setDetailBet(null);
    const ps = placementsOf(b);
    const unit = b.unitValue || ps[0]?.unitValue || 0;
    setBetForm({
      id: b.id, date: b.date, time: b.time, tipster: b.tipster, unitValue: unit, result: b.result, cashoutValue: b.cashoutValue,
      sport: b.sport, team1: b.team1, team2: b.team2, market: b.market, selection: b.selection, moment: b.moment, fairOdds: b.fairOdds, note: b.note, createdAt: b.createdAt,
      placements: ps.map(p => ({ accountId: p.accountId, house: p.house, owner: p.owner, provider: p.provider, stakeUnits: p.stakeUnits, stakeReais: round2((p.stakeUnits || 0) * (p.unitValue || unit)), odds: p.odds })),
    });
  };
  const setFormTipster = (name: string) => {
    const uv = tipsterUnit(name); setUnitLocked(true);
    setBetForm(f => f ? { ...f, tipster: name, unitValue: uv, placements: recomputeReais(f.placements, uv) } : f);
  };
  const setUnitValue = (v: number) => setBetForm(f => f ? { ...f, unitValue: v, placements: recomputeReais(f.placements, v) } : f);
  const patchPlacement = (idx: number, patch: Partial<PlacementForm>) => setBetForm(f => { if (!f) return f; const ps = [...f.placements]; ps[idx] = { ...ps[idx], ...patch }; return { ...f, placements: ps }; });
  const setPUnits = (idx: number, v: number) => setBetForm(f => { if (!f) return f; const ps = [...f.placements]; ps[idx] = { ...ps[idx], stakeUnits: v, stakeReais: round2(v * (f.unitValue || 0)) }; return { ...f, placements: ps }; });
  const setPReais = (idx: number, v: number) => setBetForm(f => { if (!f) return f; const ps = [...f.placements]; ps[idx] = { ...ps[idx], stakeReais: v, stakeUnits: (f.unitValue || 0) > 0 ? round6(v / (f.unitValue || 1)) : 0 }; return { ...f, placements: ps }; });
  const pickAccount = (idx: number, accountId: string) => {
    const acc = activeAccounts.find(a => a.id === accountId);
    patchPlacement(idx, acc ? { accountId, house: acc.house, owner: acc.owner || acc.name, provider: houseProviders[acc.house] || '' } : { accountId: undefined });
  };
  const addPlacement = () => setBetForm(f => f ? { ...f, placements: [...f.placements, { stakeUnits: 0, stakeReais: 0, odds: 0 }] } : f);
  const removePlacement = (idx: number) => setBetForm(f => f ? { ...f, placements: f.placements.length > 1 ? f.placements.filter((_, i) => i !== idx) : f.placements } : f);

  const formTotals = useMemo(() => {
    if (!betForm) return { stake: 0, units: 0, avgOdds: 0 };
    let stake = 0, units = 0, oddW = 0;
    betForm.placements.forEach(p => { const s = (p.stakeUnits || 0) * (betForm.unitValue || 0); stake += s; units += p.stakeUnits || 0; oddW += s * (p.odds || 0); });
    return { stake, units, avgOdds: stake > 0 ? oddW / stake : 0 };
  }, [betForm]);

  const saveBet = () => {
    if (!betForm) return;
    if (!betForm.tipster) { alert('Selecione o tipster.'); return; }
    const unit = Number(betForm.unitValue) || 0;
    const placements: BetPlacement[] = betForm.placements.filter(p => (p.stakeUnits || 0) > 0 && (p.odds || 0) > 0).map(p => ({
      id: genId(), accountId: p.accountId || undefined, house: p.house || undefined,
      owner: p.owner || undefined, provider: p.provider || (p.house ? houseProviders[p.house] : undefined) || undefined,
      stakeUnits: round6(p.stakeUnits || 0), unitValue: unit, odds: Number(p.odds) || 0,
    }));
    if (placements.length === 0) { alert('Adicione ao menos uma entrada com stake e odd.'); return; }
    const totalUnits = placements.reduce((s, p) => s + p.stakeUnits, 0);
    const totalStake = placements.reduce((s, p) => s + p.stakeUnits * p.unitValue, 0);
    const avgOdds = totalStake > 0 ? placements.reduce((s, p) => s + p.stakeUnits * p.unitValue * p.odds, 0) / totalStake : 0;
    const first = placements[0];
    onSaveBet({
      id: betForm.id || '', date: betForm.date || todayISO(), time: betForm.time || undefined, tipster: betForm.tipster!,
      unitValue: unit, stakeUnits: round6(totalUnits), odds: round2(avgOdds),
      house: first.house, owner: first.owner, provider: first.provider, placements,
      result: (betForm.result as BetResult) || 'TBD', cashoutValue: betForm.result === 'CASHED' ? (Number(betForm.cashoutValue) || 0) : undefined,
      sport: betForm.sport || undefined, team1: betForm.team1 || undefined, team2: betForm.team2 || undefined, market: betForm.market || undefined,
      selection: betForm.selection || undefined, moment: betForm.moment || undefined, fairOdds: betForm.fairOdds ? Number(betForm.fairOdds) : undefined,
      note: betForm.note || undefined, createdAt: betForm.createdAt || new Date().toISOString(),
    } as Bet);
    setBetForm(null);
  };

  const changeResult = (b: Bet, result: BetResult) => {
    const patch: Partial<Bet> = { result };
    if (result === 'CASHED' && b.cashoutValue == null) patch.cashoutValue = computeBet(b).stake;
    onSaveBet({ ...b, ...patch });
  };
  const saveTipster = () => {
    if (!tipsterForm.name || !tipsterForm.name.trim()) { alert('Informe o nome do tipster.'); return; }
    onSaveTipster({ id: tipsterForm.id || '', name: tipsterForm.name.trim(), unitValue: Number(tipsterForm.unitValue) || 0, createdAt: tipsterForm.createdAt || new Date().toISOString() } as Tipster);
    setTipsterForm({ name: '', unitValue: 0 });
  };

  const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const labelClass = 'text-xs font-medium text-slate-400 mb-1 block';
  const selClass = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none';

  const StatChip = ({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) => (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}><Icon size={18} /></div>
      <div><p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p><p className="text-2xl font-bold text-white leading-none font-mono">{value}</p></div>
    </div>
  );
  const KpiCard = ({ label, value, sub, accent, valueClass }: { label: string; value: string; sub?: string; accent: string; valueClass?: string }) => (
    <div className={`rounded-xl p-4 border ${accent}`}>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className={`text-2xl font-bold font-mono leading-tight ${valueClass || 'text-white'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{sub}</p>}
    </div>
  );

  const detailCalc = detailBet ? computeBet(detailBet) : null;
  const detailPlacements = detailBet ? placementsOf(detailBet) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Dices className="text-indigo-400" /> Apostas</h2>
          <p className="text-slate-400 text-sm mt-1">Registro e desempenho das apostas</p>
        </div>
        <div className="flex gap-2">
          {/* TEMP: importador do Sheets — remover na versão final (apague só esta linha) */}
          <BetsImport bets={bets} tipsters={tipsters} onSaveBet={onSaveBet} onSaveTipster={onSaveTipster} />
          <button onClick={() => setShowTipsters(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"><Users size={16} /> Tipsters</button>
          <button onClick={openNewBet} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"><Plus size={18} /> Nova Aposta</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatChip label="Total" value={String(kpis.total)} icon={Dices} color="bg-indigo-500/10 text-indigo-400" />
        <StatChip label="Resolvidas" value={String(kpis.settled)} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
        <StatChip label="Pendentes" value={String(kpis.openCount)} icon={Hourglass} color="bg-amber-500/10 text-amber-400" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Lucro / Prejuízo" value={fmtBRL(kpis.profit)} sub={fmtU(kpis.plUnits)} accent={kpis.profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} valueClass={kpis.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <KpiCard label="ROI" value={`${(kpis.roi * 100).toFixed(1)}%`} accent="bg-slate-900 border-slate-800" valueClass={kpis.roi >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <KpiCard label="Investido" value={fmtBRL(kpis.invested)} accent="bg-slate-900 border-slate-800" />
        <KpiCard label="Em Aberto" value={fmtBRL(kpis.openStake)} sub={`${kpis.openCount} aposta(s)`} accent="bg-amber-500/10 border-amber-500/30" valueClass="text-amber-300" />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium shrink-0"><Filter size={16} /> Filtros:</div>
          <div className="relative flex-1 min-w-[180px] lg:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar time, mercado, titular..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
          <select value={filterTipster} onChange={e => { setFilterTipster(e.target.value); setPage(1); }} className={selClass}><option value="ALL">Todos Tipsters</option>{tipsters.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>
          <select value={filterResult} onChange={e => { setFilterResult(e.target.value as ResultFilter); setPage(1); }} className={selClass}>
            <option value="ALL">Todos Resultados</option><option value="OPEN">Em aberto</option><option value="SETTLED">Resolvidas</option>
            {RESULT_OPTIONS.filter(o => o.value !== 'TBD').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterHouse} onChange={e => onChangeFilterHouse(e.target.value)} className={selClass}><option value="ALL">Todas Casas</option>{distinctPlacement('house').map(h => <option key={h} value={h}>{h}</option>)}</select>
          <select value={filterProvider} onChange={e => { setFilterProvider(e.target.value); setPage(1); }} className={selClass}><option value="ALL">Todos Provedores</option>{Array.from(new Set([...distinctPlacement('provider'), ...Object.values(houseProviders)].filter(Boolean))).sort().map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select value={filterMarket} onChange={e => { setFilterMarket(e.target.value); setPage(1); }} className={selClass}><option value="ALL">Todos Mercados</option>{distinctBet('market').map(m => <option key={m} value={m}>{m}</option>)}</select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-[11px] text-slate-500 uppercase font-bold">De</label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={`${selClass} [color-scheme:dark] cursor-pointer`} />
          <label className="text-[11px] text-slate-500 uppercase font-bold">Até</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={`${selClass} [color-scheme:dark] cursor-pointer`} />
          {(dateFrom || dateTo !== todayISO()) && (
            <button onClick={() => { setDateFrom(''); setDateTo(todayISO()); setPage(1); }} className="text-[11px] text-slate-400 hover:text-white underline">limpar datas</button>
          )}
          <div className="relative ml-auto">
            <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className={`${selClass} pl-9`}>
              <option value="DATE_DESC">Data (recente)</option><option value="DATE_ASC">Data (antiga)</option><option value="PL_DESC">Maior P/L</option><option value="PL_ASC">Menor P/L</option>
            </select>
          </div>
          <div className="relative">
            <button onClick={() => setShowCols(s => !s)} className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"><Columns3 size={14} /> Colunas</button>
            {showCols && (<>
              <div className="fixed inset-0 z-20" onClick={() => setShowCols(false)} />
              <div className="absolute right-0 mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl w-44">
                {COLUMNS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer text-sm text-slate-200">
                    <input type="checkbox" checked={vis(c.key)} onChange={() => setVisibleCols(prev => { const n = new Set(prev); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })} className="accent-indigo-500" />{c.label}
                  </label>
                ))}
              </div>
            </>)}
          </div>
        </div>
      </div>

      {/* Barra de seleção em massa */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-indigo-600/10 border border-indigo-500/30 rounded-xl px-4 py-2.5">
          <span className="text-sm text-indigo-200 font-semibold">{selectedIds.size} selecionada(s)</span>
          {selectedIds.size < sorted.length && (
            <button onClick={selectAllFiltered} className="text-xs text-indigo-300 hover:text-white underline">Selecionar todas ({sorted.length})</button>
          )}
          <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-white underline">Limpar seleção</button>
          <button onClick={deleteSelected} className="ml-auto flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"><Trash2 size={14} /> Excluir selecionadas</button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {renderBets.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 text-slate-500"><Dices size={32} /></div>
            <h3 className="text-lg font-medium text-slate-300">Nenhuma aposta encontrada</h3>
            <p className="text-slate-500 text-sm">Ajuste os filtros ou clique em “Nova Aposta”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={pageAllSelected} onChange={toggleSelectPage} className="accent-indigo-500 w-4 h-4 align-middle cursor-pointer" title="Selecionar todas desta página" /></th>
                  {vis('date') && <th className="text-left font-semibold px-4 py-2.5">Data</th>}
                  {vis('time') && <th className="text-left font-semibold px-2 py-2.5">Hora</th>}
                  {vis('tipster') && <th className="text-left font-semibold px-3 py-2.5">Tipster</th>}
                  {vis('event') && <th className="text-left font-semibold px-3 py-2.5">Evento</th>}
                  {vis('selection') && <th className="text-left font-semibold px-3 py-2.5">Aposta</th>}
                  {vis('market') && <th className="text-left font-semibold px-3 py-2.5">Mercado</th>}
                  {vis('titular') && <th className="text-left font-semibold px-3 py-2.5">Titular</th>}
                  {vis('house') && <th className="text-left font-semibold px-3 py-2.5">Casa</th>}
                  {vis('provider') && <th className="text-left font-semibold px-3 py-2.5">Provedor</th>}
                  {vis('moment') && <th className="text-left font-semibold px-3 py-2.5">Mom.</th>}
                  {vis('stake') && <th className="text-right font-semibold px-3 py-2.5">Stake</th>}
                  {vis('odd') && <th className="text-right font-semibold px-3 py-2.5">Odd</th>}
                  {vis('result') && <th className="text-left font-semibold px-3 py-2.5">Resultado</th>}
                  {vis('pl') && <th className="text-right font-semibold px-3 py-2.5">P/L</th>}
                  <th className="text-right font-semibold px-4 py-2.5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {renderBets.map(b => {
                  const c = computeBet(b);
                  const multi = placementsOf(b).length > 1;
                  return (
                    <tr key={b.id} onClick={() => setDetailBet(b)} className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${selectedIds.has(b.id) ? 'bg-indigo-600/10' : ''}`}>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} className="accent-indigo-500 w-4 h-4 cursor-pointer" /></td>
                      {vis('date') && <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap font-mono text-xs">{fmtDate(b.date)}</td>}
                      {vis('time') && <td className="px-2 py-2.5 text-slate-400 whitespace-nowrap font-mono text-xs">{b.time || '—'}</td>}
                      {vis('tipster') && <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap">{b.tipster}</td>}
                      {vis('event') && <td className="px-3 py-2.5 text-slate-300 max-w-[160px]"><span className="block truncate" title={[b.team1, b.team2].filter(Boolean).join(' x ')}>{[b.team1, b.team2].filter(Boolean).join(' x ') || '—'}</span></td>}
                      {vis('selection') && <td className="px-3 py-2.5 max-w-[220px]"><span className="block truncate font-medium text-indigo-200" title={b.selection}>{b.selection || '—'}</span></td>}
                      {vis('market') && <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{b.market || '—'}</td>}
                      {vis('titular') && <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{summarize(b, 'owner')}</td>}
                      {vis('house') && <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{summarize(b, 'house')}</td>}
                      {vis('provider') && <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{summarize(b, 'provider')}</td>}
                      {vis('moment') && <td className="px-3 py-2.5 text-[10px] uppercase text-slate-500">{b.moment || '—'}</td>}
                      {vis('stake') && <td className="px-3 py-2.5 text-right whitespace-nowrap"><span className="text-slate-200 font-mono">{fmtNum(c.units)}u</span><span className="block text-[10px] text-slate-500 font-mono">{fmtBRL(c.stake)}</span></td>}
                      {vis('odd') && <td className="px-3 py-2.5 text-right text-slate-200 font-mono whitespace-nowrap">{c.avgOdds ? c.avgOdds.toFixed(2) : '—'}{multi && <span className="block text-[9px] text-slate-500">média</span>}</td>}
                      {vis('result') && <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <select value={b.result} onChange={e => changeResult(b, e.target.value as BetResult)} className={`text-[11px] font-semibold rounded-md border px-1.5 py-1 outline-none cursor-pointer bg-slate-950 ${resultBadgeClass(b.result)}`}>
                          {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-slate-900 text-white">{o.label}</option>)}
                        </select>
                      </td>}
                      {vis('pl') && <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {c.pending ? <span className="text-amber-400/70 text-xs">em aberto</span> : <><span className={`font-mono font-bold ${c.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(c.pl)}</span><span className={`block text-[10px] font-mono ${c.pl >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{fmtU(c.plUnits)}</span></>}
                      </td>}
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditBet(b)} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg" title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => onDeleteBet(b.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg" title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Por página:</span>
            <select value={String(pageSize)} onChange={e => { setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) as PageSize); setPage(1); }} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white outline-none">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}<option value="ALL">Todas</option>
            </select>
            <span className="text-slate-500">· {sorted.length} aposta(s)</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Página {safePage} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-40">Próxima</button>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 size={16} className="text-indigo-400" /> Gráficos</h3>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button onClick={() => setChartUnit('BRL')} className={`px-3 py-1 rounded-md text-xs font-medium ${chartUnit === 'BRL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Valores (R$)</button>
            <button onClick={() => setChartUnit('U')} className={`px-3 py-1 rounded-md text-xs font-medium ${chartUnit === 'U' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Unidades</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">P/L acumulado</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cumData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} hide={cumData.length > 25} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} cursor={{ stroke: '#475569' }} formatter={(v: any) => chartUnit === 'BRL' ? fmtBRL(v) : `${fmtNum(v)}u`} />
                <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">P/L por {DIMENSIONS.find(d => d.value === dimension)?.label}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="key" tick={{ fill: '#94a3b8', fontSize: 10 }} hide={barData.length > 20} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} cursor={{ fill: 'rgba(148,163,184,0.08)' }} formatter={(v: any) => chartUnit === 'BRL' ? fmtBRL(v) : `${fmtNum(v)}u`} />
                <Bar dataKey="v">{barData.map((d, i) => <Cell key={i} fill={d.v >= 0 ? '#10b981' : '#ef4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Resumo por dimensão */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /> Resumo por</h3>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 flex-wrap">
            {DIMENSIONS.map(d => <button key={d.value} onClick={() => setDimension(d.value)} className={`px-3 py-1 rounded-md text-xs font-medium ${dimension === d.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{d.label}</button>)}
          </div>
        </div>
        {summary.length === 0 ? <div className="px-5 py-10 text-center text-slate-500 text-sm">Sem apostas resolvidas para resumir ainda.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70">
                <tr><th className="text-left font-semibold px-5 py-2">{DIMENSIONS.find(d => d.value === dimension)?.label}</th><th className="text-right font-semibold px-3 py-2">Apostas</th><th className="text-right font-semibold px-3 py-2">Investido</th><th className="text-right font-semibold px-3 py-2">P/L</th><th className="text-right font-semibold px-3 py-2">P/L (u)</th><th className="text-right font-semibold px-5 py-2">ROI</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {summary.map(s => (
                  <tr key={s.key} className="hover:bg-slate-800/20">
                    <td className="px-5 py-2.5 text-slate-200 font-medium whitespace-nowrap">{dimension === 'date' ? fmtDate(s.key) : s.key}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 font-mono">{s.count}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmtBRL(s.stake)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${s.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(s.pl)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${s.plUnits >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>{fmtU(s.plUnits)}</td>
                    <td className={`px-5 py-2.5 text-right font-mono ${s.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(s.roi * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Card de detalhes ===== */}
      {detailBet && detailCalc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDetailBet(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Aposta</p>
                  <h3 className="text-lg font-bold text-indigo-200 leading-tight break-words">{detailBet.selection || '—'}</h3>
                  <p className="text-sm text-slate-400 mt-1">{[detailBet.team1, detailBet.team2].filter(Boolean).join('  x  ') || '—'}</p>
                </div>
                <button onClick={() => setDetailBet(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg shrink-0"><X size={20} /></button>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`text-[11px] font-semibold rounded-md border px-2 py-1 ${resultBadgeClass(detailBet.result)}`}>{RESULT_LABEL[detailBet.result]}</span>
                {detailCalc.pending ? <span className="text-xs text-amber-400/70">em aberto</span> : <span className={`text-sm font-mono font-bold ${detailCalc.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(detailCalc.pl)} · {fmtU(detailCalc.plUnits)} · ROI {(detailCalc.roi * 100).toFixed(1)}%</span>}
              </div>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ['Data', fmtDate(detailBet.date)], ['Horário', detailBet.time || '—'], ['Tipster', detailBet.tipster], ['Esporte', detailBet.sport || '—'],
                  ['Mercado', detailBet.market || '—'], ['Momento', detailBet.moment === 'LIVE' ? 'Live' : detailBet.moment === 'PRE' ? 'Pré' : '—'],
                  ['Investido', fmtBRL(detailCalc.stake)], ['Stake (u)', `${fmtNum(detailCalc.units)}u`],
                  ['Odd média', detailCalc.avgOdds ? detailCalc.avgOdds.toFixed(2) : '—'], ['Retorno', fmtBRL(detailCalc.retorno)],
                ].map(([k, v]) => (<div key={k as string}><p className="text-[10px] uppercase tracking-wide text-slate-500">{k}</p><p className="text-slate-200 font-medium break-words">{v}</p></div>))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Entradas ({detailPlacements.length})</p>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-950 text-slate-500 uppercase"><tr><th className="text-left px-3 py-1.5">Casa</th><th className="text-left px-3 py-1.5">Titular</th><th className="text-left px-3 py-1.5">Provedor</th><th className="text-right px-3 py-1.5">Stake</th><th className="text-right px-3 py-1.5">Odd</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {detailPlacements.map((p, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-slate-200">{p.house || '—'}</td>
                          <td className="px-3 py-1.5 text-slate-400">{p.owner || '—'}</td>
                          <td className="px-3 py-1.5 text-slate-400">{p.provider || '—'}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-200">{fmtNum(p.stakeUnits)}u<span className="block text-[9px] text-slate-500">{fmtBRL((p.stakeUnits || 0) * (p.unitValue || 0))}</span></td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-200">{(p.odds || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {detailBet.note && <div><p className="text-[10px] uppercase tracking-wide text-slate-500">Observação</p><p className="text-slate-300 text-sm">{detailBet.note}</p></div>}
            </div>
            <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">
              <button onClick={() => openEditBet(detailBet)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"><Pencil size={16} /> Editar</button>
              <button onClick={() => { onDeleteBet(detailBet.id); setDetailBet(null); }} className="px-4 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded-xl"><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Nova/Editar Aposta ===== */}
      {betForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setBetForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Dices size={20} className="text-indigo-400" /> {betForm.id ? 'Editar Aposta' : 'Nova Aposta'}</h3>
              <button onClick={() => setBetForm(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Data</label><input type="date" value={(betForm.date || '').slice(0, 10)} onChange={e => setBetForm({ ...betForm, date: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Horário</label><input type="time" value={betForm.time || ''} onChange={e => setBetForm({ ...betForm, time: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Tipster *</label>
                  <select value={betForm.tipster || ''} onChange={e => setFormTipster(e.target.value)} className={inputClass}><option value="">Selecione...</option>{tipsters.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>
                </div>
                <div><label className={labelClass}>Valor da unidade (R$)</label>
                  <div className="flex gap-1">
                    <input type="number" step="0.01" value={betForm.unitValue ?? 0} disabled={unitLocked} onChange={e => setUnitValue(num(e.target.value))} className={`${inputClass} ${unitLocked ? 'opacity-60 cursor-not-allowed' : ''}`} />
                    <button type="button" onClick={() => setUnitLocked(l => !l)} title={unitLocked ? 'Desbloquear' : 'Bloquear'} className={`px-2 rounded-lg border shrink-0 ${unitLocked ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-amber-500/40 text-amber-400 bg-amber-500/10'}`}>{unitLocked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                  </div>
                </div>
              </div>

              {/* Entradas (multi casa/odd) */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Entradas — mesma aposta em uma ou mais casas</span>
                  <button type="button" onClick={addPlacement} className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"><Plus size={13} /> Entrada</button>
                </div>
                <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wide text-slate-500 px-1">
                  <span className="col-span-4">Conta / Casa</span><span className="col-span-2">Stake (u)</span><span className="col-span-2">Stake (R$)</span><span className="col-span-2">Odd</span><span className="col-span-2"></span>
                </div>
                {betForm.placements.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 md:col-span-4 flex gap-1">
                      <select value={p.accountId || ''} onChange={e => pickAccount(idx, e.target.value)} className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— conta —</option>
                        {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.house} · {a.owner || a.name}</option>)}
                      </select>
                      <input list="dl-phouse" type="text" value={p.house || ''} onChange={e => patchPlacement(idx, { house: e.target.value })} placeholder="Casa" className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                    </div>
                    <input type="number" step="0.01" value={p.stakeUnits ?? 0} onChange={e => setPUnits(idx, num(e.target.value))} className="col-span-4 md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-right font-mono outline-none" />
                    <input type="number" step="0.01" value={p.stakeReais ?? 0} onChange={e => setPReais(idx, num(e.target.value))} className="col-span-4 md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-right font-mono outline-none" />
                    <input type="number" step="0.01" value={p.odds ?? 0} onChange={e => patchPlacement(idx, { odds: num(e.target.value) })} className="col-span-3 md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-right font-mono outline-none" />
                    <button type="button" onClick={() => removePlacement(idx)} disabled={betForm.placements.length <= 1} className="col-span-1 md:col-span-2 text-slate-500 hover:text-red-400 disabled:opacity-30 flex justify-center"><Trash2 size={14} /></button>
                  </div>
                ))}
                <div className="text-right text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                  Investido: <span className="text-slate-200 font-mono">{fmtBRL(formTotals.stake)}</span> · {fmtNum(formTotals.units)}u · Odd média: <span className="text-slate-200 font-mono">{formTotals.avgOdds.toFixed(2)}</span>
                </div>
                <datalist id="dl-phouse">{Array.from(new Set([...availableHouses, ...distinctPlacement('house')])).map(v => <option key={v} value={v} />)}</datalist>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Resultado</label><select value={betForm.result || 'TBD'} onChange={e => setBetForm({ ...betForm, result: e.target.value as BetResult })} className={inputClass}>{RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                {betForm.result === 'CASHED' && <div><label className={labelClass}>Retorno cashout (R$)</label><input type="number" step="0.01" value={betForm.cashoutValue ?? 0} onChange={e => setBetForm({ ...betForm, cashoutValue: num(e.target.value) })} className={inputClass} /></div>}
                <div><label className={labelClass}>Momento</label><select value={betForm.moment || 'PRE'} onChange={e => setBetForm({ ...betForm, moment: e.target.value as 'PRE' | 'LIVE' })} className={inputClass}><option value="PRE">Pré</option><option value="LIVE">Live</option></select></div>
                <div><label className={labelClass}>Esporte</label><input list="dl-sport" value={betForm.sport || ''} onChange={e => setBetForm({ ...betForm, sport: e.target.value })} className={inputClass} /><datalist id="dl-sport">{distinctBet('sport').map(v => <option key={v} value={v} />)}</datalist></div>
                <div><label className={labelClass}>Mercado</label><input list="dl-market" value={betForm.market || ''} onChange={e => setBetForm({ ...betForm, market: e.target.value })} className={inputClass} /><datalist id="dl-market">{distinctBet('market').map(v => <option key={v} value={v} />)}</datalist></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Time 1 / Evento</label><input type="text" value={betForm.team1 || ''} onChange={e => setBetForm({ ...betForm, team1: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Time 2</label><input type="text" value={betForm.team2 || ''} onChange={e => setBetForm({ ...betForm, team2: e.target.value })} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Aposta (seleção)</label><input type="text" value={betForm.selection || ''} onChange={e => setBetForm({ ...betForm, selection: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="p-5 border-t border-slate-800 flex gap-3">
              <button onClick={saveBet} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18} /> Salvar Aposta</button>
              <button onClick={() => setBetForm(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Tipsters ===== */}
      {showTipsters && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowTipsters(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users size={20} className="text-indigo-400" /> Tipsters &amp; Unidades</h3>
              <button onClick={() => setShowTipsters(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex gap-2 items-end bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                <div className="flex-1"><label className={labelClass}>Nome do tipster</label><input type="text" value={tipsterForm.name || ''} onChange={e => setTipsterForm({ ...tipsterForm, name: e.target.value })} className={inputClass} /></div>
                <div className="w-32"><label className={labelClass}>Valor unidade (R$)</label><input type="number" step="0.01" value={tipsterForm.unitValue ?? 0} onChange={e => setTipsterForm({ ...tipsterForm, unitValue: num(e.target.value) })} className={inputClass} /></div>
                <button onClick={saveTipster} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">{tipsterForm.id ? <Save size={16} /> : <Plus size={16} />}</button>
                {tipsterForm.id && <button onClick={() => setTipsterForm({ name: '', unitValue: 0 })} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm"><X size={16} /></button>}
              </div>
              {tipsters.length === 0 ? <p className="text-center text-slate-500 text-sm py-6">Nenhum tipster cadastrado.</p> : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {[...tipsters].sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-800/30">
                      <span className="text-slate-200 font-medium">{t.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-emerald-300">{fmtBRL(t.unitValue)}<span className="text-slate-500 text-xs">/u</span></span>
                        <button onClick={() => setTipsterForm({ ...t })} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => onDeleteTipster(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500">O valor da unidade aqui é só o padrão ao criar novas apostas. Apostas já registradas mantêm o valor que tinham.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
