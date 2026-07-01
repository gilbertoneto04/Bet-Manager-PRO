import React, { useMemo, useState } from 'react';
import { Expense, MonthlyResult } from '../types';
import { fmtBRL } from '../finance';
import { EXPENSE_APOSTAS_CATEGORY, MONTH_NAMES } from '../constants';
import { ChevronLeft, ChevronRight, TrendingUp, Wallet, Dices, Sparkles, ShieldAlert, CalendarRange, Info } from 'lucide-react';

interface SummaryProps {
  expenses: Expense[];
  monthlyResults: MonthlyResult[];
  onSaveMonthlyResult: (month: string, data: Partial<MonthlyResult>) => void;
}

const isApostas = (cat?: string) => (cat || '').trim().toUpperCase() === EXPENSE_APOSTAS_CATEGORY;
const toNum = (s: string | number) => { const n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; };
const monthOf = (d?: string) => (d || '').slice(0, 7);

// Campo numérico com edição inline (grava ao sair/Enter); vazio fica em branco.
const InlineNumber: React.FC<{ value: number | undefined; onCommit: (v: number | undefined) => void; className?: string; placeholder?: string }> = ({ value, onCommit, className, placeholder }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value != null ? String(value) : '');
  return (
    <input
      type="number" step="0.01" value={display} placeholder={placeholder ?? '—'}
      onWheel={e => e.currentTarget.blur()}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft !== null) { const v = draft.trim() === '' ? undefined : toNum(draft); if (v !== value) onCommit(v); setDraft(null); } }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className}
    />
  );
};

interface MonthRow {
  month: string; label: string;
  despesas: number; apostas: number;
  inicial?: number; final?: number; scam: number; rendimentos: number;
  effInicial?: number; resultado: number; lucro: number; adicional: number;
}

export const Summary: React.FC<SummaryProps> = ({ expenses, monthlyResults, onSaveMonthlyResult }) => {
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const resultByMonth = useMemo(() => {
    const m = new Map<string, MonthlyResult>();
    monthlyResults.forEach(r => m.set(r.month, r));
    return m;
  }, [monthlyResults]);

  // Despesas/Apostas por mês (do livro de gastos).
  const ledgerByMonth = useMemo(() => {
    const m = new Map<string, { despesas: number; apostas: number }>();
    expenses.forEach(e => {
      const key = monthOf(e.date);
      const cur = m.get(key) || { despesas: 0, apostas: 0 };
      const v = Number(e.amount) || 0;
      if (isApostas(e.category)) cur.apostas += v; else cur.despesas += v;
      m.set(key, cur);
    });
    return m;
  }, [expenses]);

  // Linhas do ano: Jan→Dez, com encadeamento (Inicial = Final do mês anterior se não preenchido).
  const rows = useMemo<MonthRow[]>(() => {
    const out: MonthRow[] = [];
    let prevFinal: number | undefined = undefined;
    for (let i = 0; i < 12; i++) {
      const month = `${year}-${String(i + 1).padStart(2, '0')}`;
      const led = ledgerByMonth.get(month) || { despesas: 0, apostas: 0 };
      const r = resultByMonth.get(month);
      const inicial = r?.patrimonioInicial;
      const final = r?.patrimonioFinal;
      const scam = Number(r?.scam) || 0;
      const rendimentos = Number(r?.rendimentos) || 0;
      const effInicial = inicial ?? prevFinal;
      const delta = (final != null && effInicial != null) ? final - effInicial : 0;
      const resultado = delta + led.despesas + led.apostas + scam - rendimentos;
      const lucro = resultado - led.apostas + rendimentos;
      const adicional = lucro - led.despesas;
      out.push({ month, label: MONTH_NAMES[i], despesas: led.despesas, apostas: led.apostas, inicial, final, scam, rendimentos, effInicial, resultado, lucro, adicional });
      if (final != null) prevFinal = final;
    }
    return out;
  }, [year, ledgerByMonth, resultByMonth]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    despesas: a.despesas + r.despesas, apostas: a.apostas + r.apostas,
    lucro: a.lucro + r.lucro, scam: a.scam + r.scam, adicional: a.adicional + r.adicional,
  }), { despesas: 0, apostas: 0, lucro: 0, scam: 0, adicional: 0 }), [rows]);

  const hasAnyData = useMemo(() => rows.some(r => r.despesas || r.apostas || r.inicial != null || r.final != null || r.scam || r.rendimentos), [rows]);

  const numCls = 'w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-right font-mono text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none';
  const plClass = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-400';

  const Kpi = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
        <p className="text-lg font-bold text-white font-mono truncate">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header + ano */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Resumo Anual</h2>
          <p className="text-slate-400 text-sm mt-1">Fechamento mês a mês — Despesas e Apostas vêm do livro de Gastos; Lucro e Adicional são calculados</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button onClick={() => setYear(y => y - 1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Ano anterior"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2 px-3 min-w-[90px] justify-center">
            <CalendarRange size={15} className="text-indigo-400" />
            <span className="text-sm font-semibold text-white">{year}</span>
          </div>
          <button onClick={() => setYear(y => y + 1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Próximo ano"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* KPIs do ano */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={Wallet} label="Despesas" value={fmtBRL(totals.despesas)} accent="bg-rose-500/10 text-rose-400" />
        <Kpi icon={Dices} label="Apostas (custo)" value={fmtBRL(totals.apostas)} accent="bg-indigo-500/10 text-indigo-400" />
        <Kpi icon={TrendingUp} label="Lucro" value={fmtBRL(totals.lucro)} accent="bg-emerald-500/10 text-emerald-400" />
        <Kpi icon={ShieldAlert} label="Scam" value={fmtBRL(totals.scam)} accent="bg-amber-500/10 text-amber-400" />
        <Kpi icon={Sparkles} label="Adicional" value={fmtBRL(totals.adicional)} accent="bg-sky-500/10 text-sky-400" />
      </div>

      {/* Como funciona */}
      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
        <Info size={14} className="shrink-0 mt-0.5 text-slate-500" />
        <p>Preencha <span className="text-slate-200">Patrimônio Inicial/Final</span>, <span className="text-slate-200">Scam</span> e <span className="text-slate-200">Rendimentos</span> de cada mês. O Inicial em branco assume o Final do mês anterior. <span className="text-slate-300">Resultado = (Final − Inicial) + Despesas + Apostas + Scam − Rendimentos · Lucro = Resultado − Apostas + Rendimentos · Adicional = Lucro − Despesas.</span></p>
      </div>

      {/* Tabela mensal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70 bg-slate-950/50">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5 sticky left-0 bg-slate-950/50">Mês</th>
                <th className="text-right font-semibold px-3 py-2.5">Pat. Inicial</th>
                <th className="text-right font-semibold px-3 py-2.5">Pat. Final</th>
                <th className="text-right font-semibold px-3 py-2.5">Rendim.</th>
                <th className="text-right font-semibold px-3 py-2.5">Scam</th>
                <th className="text-right font-semibold px-3 py-2.5 text-rose-300/70">Despesas</th>
                <th className="text-right font-semibold px-3 py-2.5 text-indigo-300/70">Apostas</th>
                <th className="text-right font-semibold px-3 py-2.5 text-emerald-300/70">Lucro</th>
                <th className="text-right font-semibold px-4 py-2.5 text-sky-300/70">Adicional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map(r => {
                const filled = r.despesas || r.apostas || r.inicial != null || r.final != null || r.scam || r.rendimentos;
                return (
                  <tr key={r.month} className={`hover:bg-slate-800/20 transition-colors ${filled ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-2 text-slate-200 font-medium whitespace-nowrap sticky left-0 bg-slate-900">{r.label}</td>
                    <td className="px-3 py-2 text-right">
                      <InlineNumber value={r.inicial} placeholder={r.effInicial != null ? String(r.effInicial) : '—'}
                        onCommit={v => onSaveMonthlyResult(r.month, { patrimonioInicial: v })} className={numCls} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <InlineNumber value={r.final} onCommit={v => onSaveMonthlyResult(r.month, { patrimonioFinal: v })} className={numCls} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <InlineNumber value={r.rendimentos || undefined} onCommit={v => onSaveMonthlyResult(r.month, { rendimentos: v })} className={numCls} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <InlineNumber value={r.scam || undefined} onCommit={v => onSaveMonthlyResult(r.month, { scam: v })} className={`${numCls} text-amber-300`} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">{r.despesas ? fmtBRL(r.despesas) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">{r.apostas ? fmtBRL(r.apostas) : '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${plClass(r.lucro)}`}>{filled ? fmtBRL(r.lucro) : '—'}</td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${plClass(r.adicional)}`}>{filled ? fmtBRL(r.adicional) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-bold">
                <td className="px-4 py-3 text-slate-200 sticky left-0 bg-slate-950/60">TOTAL {year}</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right font-mono text-amber-300">{fmtBRL(totals.scam)}</td>
                <td className="px-3 py-3 text-right font-mono text-rose-300">{fmtBRL(totals.despesas)}</td>
                <td className="px-3 py-3 text-right font-mono text-indigo-300">{fmtBRL(totals.apostas)}</td>
                <td className={`px-3 py-3 text-right font-mono ${plClass(totals.lucro)}`}>{fmtBRL(totals.lucro)}</td>
                <td className={`px-4 py-3 text-right font-mono ${plClass(totals.adicional)}`}>{fmtBRL(totals.adicional)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {!hasAnyData && (
        <p className="text-xs text-slate-600 text-center">
          Sem dados em {year}. Lance gastos na aba <span className="text-slate-400">Gastos</span> e preencha o patrimônio mês a mês aqui para o Resumo se montar.
        </p>
      )}
    </div>
  );
};
