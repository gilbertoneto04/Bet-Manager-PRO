import React, { useMemo, useState } from 'react';
import { Bet, Tipster } from '../types';
import { fmtBRL } from '../finance';
import {
  BarChart3, TrendingUp, Filter, Search, CheckCircle2, Hourglass, Dices
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import {
  ResultFilter, Dimension, RESULT_OPTIONS, DIMENSIONS, fmtNum, fmtU, fmtDate, round2, todayISO,
  BetFilters, betMatches, buildKpis, buildSummary, buildCum, distinctPlacementVals, distinctBetVals,
} from './betsLib';

interface ResultsProps {
  bets: Bet[];
  tipsters: Tipster[];
  houseProviders: Record<string, string>;
}

// Aba Resultados: análise (KPIs, gráficos e resumo) com FILTROS PRÓPRIOS, independentes da aba Apostas.
export const Results: React.FC<ResultsProps> = ({ bets, tipsters, houseProviders }) => {
  const [search, setSearch] = useState('');
  const [filterTipster, setFilterTipster] = useState('ALL');
  const [filterResult, setFilterResult] = useState<ResultFilter>('ALL');
  const [filterHouse, setFilterHouse] = useState('ALL');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterTitular, setFilterTitular] = useState('ALL');
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayISO());
  const [dimension, setDimension] = useState<Dimension>('date');
  const [chartUnit, setChartUnit] = useState<'BRL' | 'U'>('BRL');

  const onChangeFilterHouse = (house: string) => {
    setFilterHouse(house);
    // Casa com provedor configurado → assume; sem provedor → volta para "todos".
    setFilterProvider(house !== 'ALL' && houseProviders[house] ? houseProviders[house] : 'ALL');
  };
  const openPicker = (e: React.SyntheticEvent<HTMLInputElement>) => { try { (e.currentTarget as any).showPicker?.(); } catch {} };

  const filters: BetFilters = { search, tipster: filterTipster, result: filterResult, house: filterHouse, provider: filterProvider, market: filterMarket, titular: filterTitular, dateFrom, dateTo };
  const filtered = useMemo(() => bets.filter(b => betMatches(b, filters)), [bets, search, filterTipster, filterResult, filterHouse, filterProvider, filterMarket, filterTitular, dateFrom, dateTo]);

  const kpis = useMemo(() => buildKpis(filtered), [filtered]);
  const summary = useMemo(() => buildSummary(filtered, dimension), [filtered, dimension]);
  const cumData = useMemo(() => buildCum(filtered, chartUnit), [filtered, chartUnit]);
  const barData = useMemo(() => summary.map(s => ({ key: dimension === 'date' ? fmtDate(s.key) : s.key, v: round2(chartUnit === 'BRL' ? s.pl : s.plUnits) })), [summary, chartUnit, dimension]);

  const providerOptions = useMemo(() => Array.from(new Set([...distinctPlacementVals(bets, 'provider'), ...Object.values(houseProviders)].filter(Boolean))).sort(), [bets, houseProviders]);

  const selClass = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none';
  const dateClass = `${selClass} [color-scheme:dark] cursor-pointer`;

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="text-indigo-400" /> Resultados</h2>
        <p className="text-slate-400 text-sm mt-1">Análise das apostas — filtros independentes da aba Apostas</p>
      </div>

      {/* Filtros próprios */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium shrink-0"><Filter size={16} /> Filtros:</div>
          <div className="relative flex-1 min-w-[180px] lg:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar time, mercado, titular..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
          <select value={filterTipster} onChange={e => setFilterTipster(e.target.value)} className={selClass}><option value="ALL">Todos Tipsters</option>{tipsters.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>
          <select value={filterResult} onChange={e => setFilterResult(e.target.value as ResultFilter)} className={selClass}>
            <option value="ALL">Todos Resultados</option><option value="OPEN">Em aberto</option><option value="SETTLED">Resolvidas</option>
            {RESULT_OPTIONS.filter(o => o.value !== 'TBD').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterHouse} onChange={e => onChangeFilterHouse(e.target.value)} className={selClass}><option value="ALL">Todas Casas</option>{distinctPlacementVals(bets, 'house').map(h => <option key={h} value={h}>{h}</option>)}</select>
          <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className={selClass}><option value="ALL">Todos Provedores</option>{providerOptions.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select value={filterTitular} onChange={e => setFilterTitular(e.target.value)} className={selClass}><option value="ALL">Todos Titulares</option>{distinctPlacementVals(bets, 'owner').map(o => <option key={o} value={o}>{o}</option>)}</select>
          <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className={selClass}><option value="ALL">Todos Mercados</option>{distinctBetVals(bets, 'market').map(m => <option key={m} value={m}>{m}</option>)}</select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-[11px] text-slate-500 uppercase font-bold">De</label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onFocus={openPicker} onClick={openPicker} onChange={e => setDateFrom(e.target.value)} className={dateClass} />
          <label className="text-[11px] text-slate-500 uppercase font-bold">Até</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onFocus={openPicker} onClick={openPicker} onChange={e => setDateTo(e.target.value)} className={dateClass} />
          {(dateFrom || dateTo !== todayISO()) && (
            <button onClick={() => { setDateFrom(''); setDateTo(todayISO()); }} className="text-[11px] text-slate-400 hover:text-white underline">limpar datas</button>
          )}
          <span className="ml-auto text-xs text-slate-500">{filtered.length} aposta(s) no filtro</span>
        </div>
      </div>

      {/* KPIs */}
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
            <ResponsiveContainer width="100%" height={240}>
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
            <ResponsiveContainer width="100%" height={240}>
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
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/50 flex-wrap">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /> Resumo por</h3>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 flex-wrap">
            {DIMENSIONS.map(d => <button key={d.value} onClick={() => setDimension(d.value)} className={`px-3 py-1 rounded-md text-xs font-medium ${dimension === d.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{d.label}</button>)}
          </div>
        </div>
        {summary.length === 0 ? <div className="px-5 py-10 text-center text-slate-500 text-sm">Sem apostas resolvidas para resumir no filtro atual.</div> : (
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
    </div>
  );
};
