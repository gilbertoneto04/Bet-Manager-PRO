import React, { useMemo, useState, useEffect } from 'react';
import { Bet, Tipster, BetResult } from '../types';
import { computeBet, fmtBRL } from '../finance';
import {
  Dices, Plus, Pencil, Trash2, X, Save, Search, Filter, TrendingUp, Target,
  Users, BarChart3, Wallet, Clock, ArrowDownUp
} from 'lucide-react';
import { BetsImport } from './BetsImport'; // TEMP: importador do Sheets — remover na versão final

interface BetsProps {
  bets: Bet[];
  tipsters: Tipster[];
  availableHouses: string[];
  onSaveBet: (bet: Bet) => void;
  onDeleteBet: (id: string) => void;
  onSaveTipster: (t: Tipster) => void;
  onDeleteTipster: (id: string) => void;
}

const RESULT_OPTIONS: { value: BetResult; label: string }[] = [
  { value: 'TBD', label: 'Em aberto' },
  { value: 'W', label: 'Green' },
  { value: 'L', label: 'Red' },
  { value: 'R', label: 'Void' },
  { value: 'HW', label: '½ Green' },
  { value: 'HL', label: '½ Red' },
  { value: 'CASHED', label: 'Cashout' },
];
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
const round4 = (v: number) => Math.round(v * 10000) / 10000;
const fmtU = (v: number) => `${v >= 0 ? '+' : ''}${round2(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}u`;
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const iso = d.length > 10 ? d.slice(0, 10) : d;
  const [y, m, day] = iso.split('-');
  return (day && m && y) ? `${day}/${m}/${y}` : d;
};
const todayISO = () => new Date().toISOString().slice(0, 10);

type ResultFilter = 'ALL' | 'OPEN' | 'SETTLED' | BetResult;
type SortKey = 'DATE_DESC' | 'DATE_ASC' | 'PL_DESC' | 'PL_ASC';
type Dimension = 'tipster' | 'house' | 'sport' | 'market' | 'provider';

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'tipster', label: 'Tipster' },
  { value: 'house', label: 'Casa' },
  { value: 'sport', label: 'Esporte' },
  { value: 'market', label: 'Mercado' },
  { value: 'provider', label: 'Provedor' },
];

type BetForm = Partial<Bet> & { stakeReais?: number };

export const Bets: React.FC<BetsProps> = ({ bets, tipsters, availableHouses, onSaveBet, onDeleteBet, onSaveTipster, onDeleteTipster }) => {
  const [search, setSearch] = useState('');
  const [filterTipster, setFilterTipster] = useState('ALL');
  const [filterResult, setFilterResult] = useState<ResultFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('DATE_DESC');
  const [dimension, setDimension] = useState<Dimension>('tipster');

  const [betForm, setBetForm] = useState<BetForm | null>(null);
  const [showTipsters, setShowTipsters] = useState(false);
  const [tipsterForm, setTipsterForm] = useState<Partial<Tipster>>({ name: '', unitValue: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setBetForm(null); setShowTipsters(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tipsterUnit = (name: string) => tipsters.find(t => t.name === name)?.unitValue || 0;

  // Distinct values (para datalists de preenchimento rápido)
  const distinct = (key: keyof Bet) => Array.from(new Set(bets.map(b => (b[key] as string) || '').filter(Boolean))).sort();

  // KPIs globais
  const kpis = useMemo(() => {
    let invested = 0, profit = 0, plUnits = 0, settled = 0, openCount = 0, openStake = 0;
    bets.forEach(b => {
      const c = computeBet(b);
      if (c.pending) { openCount++; openStake += c.stake; }
      else { settled++; invested += c.stake; profit += c.pl; plUnits += c.plUnits; }
    });
    return { invested, profit, plUnits, settled, openCount, openStake, total: bets.length, roi: invested > 0 ? profit / invested : 0 };
  }, [bets]);

  // Lista filtrada + ordenada
  const filteredBets = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = bets.filter(b => {
      if (filterTipster !== 'ALL' && b.tipster !== filterTipster) return false;
      if (filterResult === 'OPEN' && b.result !== 'TBD') return false;
      if (filterResult === 'SETTLED' && b.result === 'TBD') return false;
      if (filterResult !== 'ALL' && filterResult !== 'OPEN' && filterResult !== 'SETTLED' && b.result !== filterResult) return false;
      const d = (b.date || '').slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (term) {
        const hay = [b.tipster, b.team1, b.team2, b.selection, b.market, b.house, b.sport, b.provider].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'DATE_ASC': return (a.date || '').localeCompare(b.date || '');
        case 'PL_DESC': return computeBet(b).pl - computeBet(a).pl;
        case 'PL_ASC': return computeBet(a).pl - computeBet(b).pl;
        case 'DATE_DESC':
        default: return (b.date || '').localeCompare(a.date || '');
      }
    });
    return list;
  }, [bets, search, filterTipster, filterResult, dateFrom, dateTo, sortBy]);

  // Resumo por dimensão (apenas resolvidas)
  const summary = useMemo(() => {
    const map = new Map<string, { count: number; stake: number; pl: number; plUnits: number }>();
    bets.forEach(b => {
      const c = computeBet(b);
      if (c.pending) return;
      const key = (b[dimension] as string) || '—';
      const cur = map.get(key) || { count: 0, stake: 0, pl: 0, plUnits: 0 };
      cur.count++; cur.stake += c.stake; cur.pl += c.pl; cur.plUnits += c.plUnits;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v, roi: v.stake > 0 ? v.pl / v.stake : 0 }))
      .sort((a, b) => b.pl - a.pl);
  }, [bets, dimension]);

  // --- Formulário de aposta: equivalência unidades <-> reais ---
  const openNewBet = () => {
    if (tipsters.length === 0) { alert('Cadastre ao menos um tipster antes (botão "Tipsters").'); setShowTipsters(true); return; }
    const t = tipsters[0];
    setBetForm({ date: todayISO(), tipster: t.name, unitValue: t.unitValue, stakeUnits: 0, stakeReais: 0, odds: 0, result: 'TBD', moment: 'PRE' });
  };
  const openEditBet = (b: Bet) => {
    setBetForm({ ...b, stakeReais: round2((b.stakeUnits || 0) * (b.unitValue || 0)) });
  };

  const setFormTipster = (name: string) => {
    const uv = tipsterUnit(name);
    setBetForm(f => f ? { ...f, tipster: name, unitValue: uv, stakeReais: round2((f.stakeUnits || 0) * uv) } : f);
  };
  const setUnits = (v: number) => setBetForm(f => f ? { ...f, stakeUnits: v, stakeReais: round2(v * (f.unitValue || 0)) } : f);
  const setReais = (v: number) => setBetForm(f => f ? { ...f, stakeReais: v, stakeUnits: (f.unitValue || 0) > 0 ? round4(v / (f.unitValue || 0)) : 0 } : f);
  const setUnitValue = (v: number) => setBetForm(f => f ? { ...f, unitValue: v, stakeReais: round2((f.stakeUnits || 0) * v) } : f);

  const saveBet = () => {
    if (!betForm) return;
    if (!betForm.tipster) { alert('Selecione o tipster.'); return; }
    if (!betForm.stakeUnits || betForm.stakeUnits <= 0) { alert('Informe o stake (em unidades ou reais).'); return; }
    if (!betForm.odds || betForm.odds <= 0) { alert('Informe a odd.'); return; }
    onSaveBet({
      id: betForm.id || '',
      date: betForm.date || todayISO(),
      tipster: betForm.tipster!,
      unitValue: Number(betForm.unitValue) || 0,
      stakeUnits: Number(betForm.stakeUnits) || 0,
      odds: Number(betForm.odds) || 0,
      result: (betForm.result as BetResult) || 'TBD',
      cashoutValue: betForm.result === 'CASHED' ? (Number(betForm.cashoutValue) || 0) : undefined,
      sport: betForm.sport || undefined,
      house: betForm.house || undefined,
      provider: betForm.provider || undefined,
      team1: betForm.team1 || undefined,
      team2: betForm.team2 || undefined,
      market: betForm.market || undefined,
      selection: betForm.selection || undefined,
      moment: betForm.moment || undefined,
      fairOdds: betForm.fairOdds ? Number(betForm.fairOdds) : undefined,
      note: betForm.note || undefined,
      createdAt: betForm.createdAt || new Date().toISOString(),
    } as Bet);
    setBetForm(null);
  };

  const changeResult = (b: Bet, result: BetResult) => {
    const patch: Partial<Bet> = { result };
    if (result === 'CASHED' && b.cashoutValue == null) patch.cashoutValue = computeBet(b).stake; // breakeven inicial; ajuste no editar
    onSaveBet({ ...b, ...patch });
  };

  const saveTipster = () => {
    if (!tipsterForm.name || !tipsterForm.name.trim()) { alert('Informe o nome do tipster.'); return; }
    onSaveTipster({
      id: tipsterForm.id || '',
      name: tipsterForm.name.trim(),
      unitValue: Number(tipsterForm.unitValue) || 0,
      createdAt: tipsterForm.createdAt || new Date().toISOString(),
    } as Tipster);
    setTipsterForm({ name: '', unitValue: 0 });
  };

  const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const labelClass = 'text-xs font-medium text-slate-400 mb-1 block';

  const SummaryCard = ({ icon: Icon, label, value, sub, accent, valueClass }: { icon: any; label: string; value: string; sub?: string; accent: string; valueClass?: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
        <p className={`text-lg font-bold font-mono truncate ${valueClass || 'text-white'}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-500 font-mono">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Dices className="text-indigo-400" /> Apostas</h2>
          <p className="text-slate-400 text-sm mt-1">{kpis.total} apostas · {kpis.settled} resolvidas · {kpis.openCount} em aberto</p>
        </div>
        <div className="flex gap-2">
          {/* TEMP: importador do Sheets — remover na versão final (apague só esta linha) */}
          <BetsImport bets={bets} tipsters={tipsters} onSaveBet={onSaveBet} onSaveTipster={onSaveTipster} />
          <button onClick={() => setShowTipsters(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Users size={16} /> Tipsters
          </button>
          <button onClick={openNewBet} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
            <Plus size={18} /> Nova Aposta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={BarChart3} label="Lucro / Prejuízo" value={fmtBRL(kpis.profit)} sub={fmtU(kpis.plUnits)} accent={kpis.profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} valueClass={kpis.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <SummaryCard icon={Target} label="ROI" value={`${(kpis.roi * 100).toFixed(1)}%`} accent="bg-indigo-500/10 text-indigo-400" valueClass={kpis.roi >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <SummaryCard icon={Wallet} label="Investido" value={fmtBRL(kpis.invested)} accent="bg-slate-500/10 text-slate-300" />
        <SummaryCard icon={Clock} label="Em Aberto" value={fmtBRL(kpis.openStake)} sub={`${kpis.openCount} aposta(s)`} accent="bg-amber-500/10 text-amber-400" />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:flex-wrap">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium shrink-0"><Filter size={16} /> Filtros:</div>
        <div className="relative flex-1 lg:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar time, mercado, casa..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
        <select value={filterTipster} onChange={e => setFilterTipster(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none">
          <option value="ALL">Todos os Tipsters</option>
          {tipsters.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select value={filterResult} onChange={e => setFilterResult(e.target.value as ResultFilter)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none">
          <option value="ALL">Todos os Resultados</option>
          <option value="OPEN">Em aberto</option>
          <option value="SETTLED">Resolvidas</option>
          {RESULT_OPTIONS.filter(o => o.value !== 'TBD').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="De" className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Até" className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
        <div className="relative">
          <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="DATE_DESC">Data (recente)</option>
            <option value="DATE_ASC">Data (antiga)</option>
            <option value="PL_DESC">Maior P/L</option>
            <option value="PL_ASC">Menor P/L</option>
          </select>
        </div>
      </div>

      {/* Tabela de apostas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {filteredBets.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 text-slate-500"><Dices size={32} /></div>
            <h3 className="text-lg font-medium text-slate-300">Nenhuma aposta encontrada</h3>
            <p className="text-slate-500 text-sm">Clique em “Nova Aposta” para registrar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Data</th>
                  <th className="text-left font-semibold px-3 py-2.5">Tipster</th>
                  <th className="text-left font-semibold px-3 py-2.5">Evento</th>
                  <th className="text-left font-semibold px-3 py-2.5">Mercado</th>
                  <th className="text-left font-semibold px-3 py-2.5">Casa</th>
                  <th className="text-right font-semibold px-3 py-2.5">Stake</th>
                  <th className="text-right font-semibold px-3 py-2.5">Odd</th>
                  <th className="text-left font-semibold px-3 py-2.5">Resultado</th>
                  <th className="text-right font-semibold px-3 py-2.5">P/L</th>
                  <th className="text-right font-semibold px-4 py-2.5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredBets.map(b => {
                  const c = computeBet(b);
                  return (
                    <tr key={b.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap font-mono text-xs">{fmtDate(b.date)}</td>
                      <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap">{b.tipster}</td>
                      <td className="px-3 py-2.5 text-slate-300 max-w-[200px]">
                        <span className="block truncate" title={[b.team1, b.team2].filter(Boolean).join(' x ')}>{[b.team1, b.team2].filter(Boolean).join(' x ') || '—'}</span>
                        {b.selection && <span className="block text-[10px] text-slate-500 truncate" title={b.selection}>{b.selection}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{b.market || '—'}{b.moment && <span className="ml-1 text-[9px] uppercase text-slate-600">{b.moment}</span>}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{b.house || '—'}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className="text-slate-200 font-mono">{round2(b.stakeUnits).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}u</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{fmtBRL(c.stake)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-200 font-mono whitespace-nowrap">{b.odds ? b.odds.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={b.result}
                          onChange={e => changeResult(b, e.target.value as BetResult)}
                          className={`text-[11px] font-semibold rounded-md border px-1.5 py-1 outline-none cursor-pointer bg-slate-950 ${resultBadgeClass(b.result)}`}
                        >
                          {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-slate-900 text-white">{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {c.pending ? (
                          <span className="text-amber-400/70 text-xs">em aberto</span>
                        ) : (
                          <>
                            <span className={`font-mono font-bold ${c.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(c.pl)}</span>
                            <span className={`block text-[10px] font-mono ${c.pl >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{fmtU(c.plUnits)}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditBet(b)} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => onDeleteBet(b.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo por dimensão */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /> Resumo por</h3>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 flex-wrap">
            {DIMENSIONS.map(d => (
              <button key={d.value} onClick={() => setDimension(d.value)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${dimension === d.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{d.label}</button>
            ))}
          </div>
        </div>
        {summary.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">Sem apostas resolvidas para resumir ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70">
                <tr>
                  <th className="text-left font-semibold px-5 py-2">{DIMENSIONS.find(d => d.value === dimension)?.label}</th>
                  <th className="text-right font-semibold px-3 py-2">Apostas</th>
                  <th className="text-right font-semibold px-3 py-2">Investido</th>
                  <th className="text-right font-semibold px-3 py-2">P/L</th>
                  <th className="text-right font-semibold px-3 py-2">P/L (u)</th>
                  <th className="text-right font-semibold px-5 py-2">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {summary.map(s => (
                  <tr key={s.key} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-2.5 text-slate-200 font-medium whitespace-nowrap">{s.key}</td>
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

      {/* ===== Modal Nova/Editar Aposta ===== */}
      {betForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setBetForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Dices size={20} className="text-indigo-400" /> {betForm.id ? 'Editar Aposta' : 'Nova Aposta'}</h3>
              <button onClick={() => setBetForm(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Data</label>
                  <input type="date" value={(betForm.date || '').slice(0, 10)} onChange={e => setBetForm({ ...betForm, date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tipster *</label>
                  <select value={betForm.tipster || ''} onChange={e => setFormTipster(e.target.value)} className={inputClass}>
                    {tipsters.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Momento</label>
                  <select value={betForm.moment || 'PRE'} onChange={e => setBetForm({ ...betForm, moment: e.target.value as 'PRE' | 'LIVE' })} className={inputClass}>
                    <option value="PRE">Pré</option>
                    <option value="LIVE">Live</option>
                  </select>
                </div>
              </div>

              {/* Stake: unidades <-> reais com valor da unidade (snapshot) */}
              <div className="grid grid-cols-3 gap-3 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                <div>
                  <label className={labelClass}>Valor da unidade (R$)</label>
                  <input type="number" step="0.01" value={betForm.unitValue ?? 0} onChange={e => setUnitValue(num(e.target.value))} className={inputClass} />
                  <p className="text-[10px] text-slate-500 mt-1">só nesta aposta</p>
                </div>
                <div>
                  <label className={labelClass}>Stake (u)</label>
                  <input type="number" step="0.01" value={betForm.stakeUnits ?? 0} onChange={e => setUnits(num(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Stake (R$)</label>
                  <input type="number" step="0.01" value={betForm.stakeReais ?? 0} onChange={e => setReais(num(e.target.value))} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Odd *</label>
                  <input type="number" step="0.01" value={betForm.odds ?? 0} onChange={e => setBetForm({ ...betForm, odds: num(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Resultado</label>
                  <select value={betForm.result || 'TBD'} onChange={e => setBetForm({ ...betForm, result: e.target.value as BetResult })} className={inputClass}>
                    {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {betForm.result === 'CASHED' && (
                  <div>
                    <label className={labelClass}>Retorno cashout (R$)</label>
                    <input type="number" step="0.01" value={betForm.cashoutValue ?? 0} onChange={e => setBetForm({ ...betForm, cashoutValue: num(e.target.value) })} className={inputClass} />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Odd justa (opc.)</label>
                  <input type="number" step="0.01" value={betForm.fairOdds ?? ''} onChange={e => setBetForm({ ...betForm, fairOdds: e.target.value === '' ? undefined : num(e.target.value) })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Esporte</label>
                  <input list="dl-sport" value={betForm.sport || ''} onChange={e => setBetForm({ ...betForm, sport: e.target.value })} className={inputClass} />
                  <datalist id="dl-sport">{distinct('sport').map(v => <option key={v} value={v} />)}</datalist>
                </div>
                <div>
                  <label className={labelClass}>Casa</label>
                  <input list="dl-house" value={betForm.house || ''} onChange={e => setBetForm({ ...betForm, house: e.target.value })} className={inputClass} />
                  <datalist id="dl-house">{Array.from(new Set([...availableHouses, ...distinct('house')])).map(v => <option key={v} value={v} />)}</datalist>
                </div>
                <div>
                  <label className={labelClass}>Provedor</label>
                  <input list="dl-prov" value={betForm.provider || ''} onChange={e => setBetForm({ ...betForm, provider: e.target.value })} className={inputClass} />
                  <datalist id="dl-prov">{distinct('provider').map(v => <option key={v} value={v} />)}</datalist>
                </div>
                <div>
                  <label className={labelClass}>Mercado</label>
                  <input list="dl-market" value={betForm.market || ''} onChange={e => setBetForm({ ...betForm, market: e.target.value })} className={inputClass} />
                  <datalist id="dl-market">{distinct('market').map(v => <option key={v} value={v} />)}</datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Time 1 / Evento</label>
                  <input type="text" value={betForm.team1 || ''} onChange={e => setBetForm({ ...betForm, team1: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Time 2</label>
                  <input type="text" value={betForm.team2 || ''} onChange={e => setBetForm({ ...betForm, team2: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Aposta (seleção)</label>
                <input type="text" value={betForm.selection || ''} onChange={e => setBetForm({ ...betForm, selection: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex gap-3">
              <button onClick={saveBet} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"><Save size={18} /> Salvar Aposta</button>
              <button onClick={() => setBetForm(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">Cancelar</button>
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
              {/* Form add/edit */}
              <div className="flex gap-2 items-end bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                <div className="flex-1">
                  <label className={labelClass}>Nome do tipster</label>
                  <input type="text" value={tipsterForm.name || ''} onChange={e => setTipsterForm({ ...tipsterForm, name: e.target.value })} className={inputClass} />
                </div>
                <div className="w-32">
                  <label className={labelClass}>Valor unidade (R$)</label>
                  <input type="number" step="0.01" value={tipsterForm.unitValue ?? 0} onChange={e => setTipsterForm({ ...tipsterForm, unitValue: num(e.target.value) })} className={inputClass} />
                </div>
                <button onClick={saveTipster} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                  {tipsterForm.id ? <Save size={16} /> : <Plus size={16} />}
                </button>
                {tipsterForm.id && (
                  <button onClick={() => setTipsterForm({ name: '', unitValue: 0 })} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm" title="Cancelar edição"><X size={16} /></button>
                )}
              </div>

              {/* Lista */}
              {tipsters.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-6">Nenhum tipster cadastrado. Adicione acima.</p>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {[...tipsters].sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-800/30">
                      <span className="text-slate-200 font-medium">{t.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-emerald-300">{fmtBRL(t.unitValue)}<span className="text-slate-500 text-xs">/u</span></span>
                        <button onClick={() => setTipsterForm({ ...t })} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => onDeleteTipster(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg" title="Excluir"><Trash2 size={14} /></button>
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
