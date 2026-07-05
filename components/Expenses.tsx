import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Expense, Bank, PaymentMethod } from '../types';
import { fmtBRL } from '../finance';
import { EXPENSE_APOSTAS_CATEGORY, PAYMENT_METHODS, MONTH_NAMES } from '../constants';
import { ExpensesImport } from './ExpensesImport'; // TEMP: importador do Sheets — remover na versão final
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, PieChart, Pie,
} from 'recharts';
import {
  Wallet, Dices, Sigma, ListChecks, Search, Filter, Plus, Trash2, Pencil,
  ChevronLeft, ChevronRight, CalendarDays, ArrowDownUp, BarChart3, ChevronDown, ChevronUp, X,
  PieChart as PieIcon, BarChart2,
} from 'lucide-react';

interface ExpensesProps {
  expenses: Expense[];
  banks: Bank[];
  onSaveExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteManyExpenses: (ids: string[]) => void;
  onUpdateManyExpenses: (updates: { id: string; data: Partial<Expense> }[]) => void;
}

const toNum = (s: string | number) => { const n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthOf = (d?: string) => (d || '').slice(0, 7);
const monthLabel = (ym: string) => { const [y, m] = ym.split('-'); const i = Number(m) - 1; return i >= 0 && i < 12 ? `${MONTH_NAMES[i]}/${(y || '').slice(2)}` : (ym || 'Sem data'); };
const monthLabelFull = (ym: string) => { const [y, m] = ym.split('-'); const i = Number(m) - 1; return i >= 0 && i < 12 ? `${MONTH_NAMES[i]} ${y}` : ym; };
const shiftMonth = (ym: string, delta: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const isApostas = (cat?: string) => (cat || '').trim().toUpperCase() === EXPENSE_APOSTAS_CATEGORY;
const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();
const openPicker = (e: React.SyntheticEvent<HTMLInputElement>) => { try { (e.currentTarget as any).showPicker?.(); } catch {} };

type SortKey = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'CATEGORY' | 'ITEM';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'DATE_DESC', label: 'Data (mais recente)' },
  { value: 'DATE_ASC', label: 'Data (mais antiga)' },
  { value: 'AMOUNT_DESC', label: 'Maior gasto' },
  { value: 'AMOUNT_ASC', label: 'Menor gasto' },
  { value: 'CATEGORY', label: 'Categoria (A–Z)' },
  { value: 'ITEM', label: 'Item (A–Z)' },
];
const PAGE_SIZES = [25, 50, 100, Infinity];

// --- Célula editável inline (estilo planilha) ---
const cellCls = 'w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-950 rounded px-2 py-1 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 transition-colors';

const InlineText: React.FC<{ value?: string; onCommit: (v: string) => void; listId?: string; placeholder?: string; className?: string }> = ({ value, onCommit, listId, placeholder, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input type="text" list={listId} value={draft ?? (value ?? '')} placeholder={placeholder ?? '—'}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft !== null) { const v = draft.trim(); if (v !== (value ?? '')) onCommit(v); setDraft(null); } }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className ?? cellCls} />
  );
};

// Valor em dinheiro: exibe SEMPRE formatado (R$ 0,00); ao clicar vira input numérico.
const InlineMoney: React.FC<{ value?: number; onCommit: (v: number) => void }> = ({ value, onCommit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const v = Number(value) || 0;
  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true); }}
        title="Clique para editar"
        className={`w-full text-right font-mono font-semibold px-2 py-1 rounded border border-transparent hover:border-slate-700 transition-colors whitespace-nowrap ${v < 0 ? 'text-emerald-400' : 'text-slate-100'}`}
      >
        {fmtBRL(v)}
      </button>
    );
  }
  return (
    <input type="number" step="0.01" autoFocus value={draft} onWheel={blurOnWheel}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { const nv = toNum(draft); setEditing(false); if (nv !== v) onCommit(nv); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
      className={`${cellCls} text-right font-mono`} />
  );
};

const InlineDate: React.FC<{ value?: string; onCommit: (v: string) => void }> = ({ value, onCommit }) => (
  <input type="date" value={(value || '').slice(0, 10)} onClick={openPicker}
    onChange={e => { if (e.target.value !== (value || '').slice(0, 10)) onCommit(e.target.value); }}
    className={`${cellCls} [color-scheme:dark] cursor-pointer font-mono text-xs w-[128px]`} />
);

const monthShort = (ym: string) => { const [y, m] = ym.split('-'); const i = Number(m) - 1; return i >= 0 && i < 12 ? `${MONTH_NAMES[i].slice(0, 3)}/${(y || '').slice(2)}` : 'S/data'; };

const CHART_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa', '#f87171', '#2dd4bf', '#e879f9', '#4ade80', '#fb923c', '#38bdf8'];

// Fora do componente (identidade estável): definidos dentro, o React remontava a caixa
// rolável a cada clique e a rolagem dos filtros voltava ao topo.
const Chip = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button onClick={onClick} className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}>{label}</button>
);
const FilterBox = ({ title, options, selected, onToggle, onSetAll, labelFn }: {
  title: string; options: string[]; selected: Set<string>;
  onToggle: (v: string) => void; onSetAll: (vals: string[]) => void; labelFn?: (v: string) => string;
}) => {
  const allOn = options.length > 0 && options.every(o => selected.has(o));
  return (
    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold truncate">{title}{selected.size > 0 && <span className="ml-1.5 text-indigo-400">({selected.size})</span>}</p>
        <button onClick={() => onSetAll(allOn ? [] : options)} disabled={options.length === 0} className="text-[10px] text-indigo-300 hover:text-indigo-200 font-medium shrink-0 disabled:opacity-40">
          {allOn ? 'limpar' : 'marcar todos'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
        {options.length === 0 ? <span className="text-xs text-slate-600">nenhum ainda</span> : options.map(o => <Chip key={o} on={selected.has(o)} label={labelFn ? labelFn(o) : o} onClick={() => onToggle(o)} />)}
      </div>
    </div>
  );
};

// Estilo compartilhado dos tooltips dos gráficos (fundo escuro + texto claro e legível).
const TOOLTIP_STYLES = {
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.55)', padding: '8px 12px' },
  labelStyle: { color: '#f1f5f9', fontWeight: 700, marginBottom: 4 },
  itemStyle: { color: '#c7d2fe', fontWeight: 600 },
} as const;

const fmtAxis = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return `R$ ${Math.round(v)}`;
};

export const Expenses: React.FC<ExpensesProps> = ({ expenses, banks, onSaveExpense, onDeleteExpense, onDeleteManyExpenses, onUpdateManyExpenses }) => {
  // Mês inicial: o do lançamento mais recente; senão, o atual.
  const latestMonth = useMemo(() => {
    const months = expenses.map(e => monthOf(e.date)).filter(Boolean).sort();
    return months.length ? months[months.length - 1] : monthOf(todayISO());
  }, [expenses]);

  const [month, setMonth] = useState<string>(latestMonth);
  const [allMonths, setAllMonths] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterBank, setFilterBank] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('DATE_DESC');
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Partial<Expense>>({ date: todayISO(), paymentMethod: 'PIX' });
  const [showAnalysis, setShowAnalysis] = useState(true);

  // Seleção de linhas (edição rápida / exclusão em massa)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ date?: string; category?: string; bank?: string; source?: string; paymentMethod?: PaymentMethod | '' }>({});
  const headerChk = useRef<HTMLInputElement>(null);

  useEffect(() => { setMonth(latestMonth); }, [latestMonth]);
  // Remove da seleção ids que deixaram de existir (ex.: apagados).
  useEffect(() => {
    setSelected(prev => {
      const valid = new Set(expenses.map(e => e.id));
      const next = new Set([...prev].filter(id => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [expenses]);

  const usingDateRange = !!(dateFrom || dateTo);

  // Opções derivadas dos dados (aparecem conforme uso).
  const categoryOptions = useMemo(() => Array.from(new Set(expenses.map(e => (e.category || '').trim()).filter(Boolean))).sort(), [expenses]);
  const sourceOptions = useMemo(() => Array.from(new Set(expenses.map(e => (e.source || '').trim()).filter(Boolean))).sort(), [expenses]);
  const bankOptions = useMemo(() => Array.from(new Set([...banks.map(b => b.name), ...expenses.map(e => (e.bank || '').trim())].filter(Boolean))).sort(), [banks, expenses]);
  const monthsInData = useMemo(() => Array.from(new Set(expenses.map(e => monthOf(e.date)).filter(Boolean))).sort(), [expenses]);

  // --- Lançamentos: período (data range OU mês) + filtros + busca ---
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = expenses.filter(e => {
      if (usingDateRange) {
        const d = (e.date || '').slice(0, 10);
        if (dateFrom && (!d || d < dateFrom)) return false;
        if (dateTo && (!d || d > dateTo)) return false;
      } else if (!allMonths) {
        if (monthOf(e.date) !== month) return false;
      }
      if (filterCategory !== 'ALL' && (e.category || '').trim() !== filterCategory) return false;
      if (filterBank !== 'ALL' && (e.bank || '').trim() !== filterBank) return false;
      if (term) {
        const hay = [e.category, e.item, e.description, e.source, e.bank].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const cmp: Record<SortKey, (a: Expense, b: Expense) => number> = {
      DATE_DESC: (a, b) => (b.date || '').localeCompare(a.date || ''),
      DATE_ASC: (a, b) => (a.date || '').localeCompare(b.date || ''),
      AMOUNT_DESC: (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
      AMOUNT_ASC: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
      CATEGORY: (a, b) => (a.category || '').localeCompare(b.category || '') || (b.date || '').localeCompare(a.date || ''),
      ITEM: (a, b) => (a.item || '').localeCompare(b.item || '') || (b.date || '').localeCompare(a.date || ''),
    };
    return [...list].sort(cmp[sortBy]);
  }, [expenses, month, allMonths, usingDateRange, dateFrom, dateTo, search, filterCategory, filterBank, sortBy]);

  useEffect(() => { setPage(0); }, [month, allMonths, dateFrom, dateTo, search, filterCategory, filterBank, sortBy, pageSize]);

  const kpis = useMemo(() => {
    let despesas = 0, apostas = 0;
    filtered.forEach(e => { const v = Number(e.amount) || 0; if (isApostas(e.category)) apostas += v; else despesas += v; });
    return { despesas, apostas, total: despesas + apostas, count: filtered.length };
  }, [filtered]);

  const totalPages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, totalPages - 1);
  const pageRows = pageSize === Infinity ? filtered : filtered.slice(curPage * pageSize, curPage * pageSize + pageSize);
  const rowStart = filtered.length === 0 ? 0 : (pageSize === Infinity ? 1 : curPage * pageSize + 1);
  const rowEnd = pageSize === Infinity ? filtered.length : Math.min(filtered.length, curPage * pageSize + pageSize);

  // --- Seleção ---
  const allSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id));
  useEffect(() => { if (headerChk.current) headerChk.current.indeterminate = selected.size > 0 && !allSelected; }, [selected, allSelected]);
  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(e => e.id)));

  const applyBulk = () => {
    const data: Partial<Expense> = {};
    if (bulk.date) data.date = bulk.date;
    if (bulk.category && bulk.category.trim()) data.category = bulk.category.trim();
    if (bulk.bank && bulk.bank.trim()) data.bank = bulk.bank.trim();
    if (bulk.source && bulk.source.trim()) data.source = bulk.source.trim();
    if (bulk.paymentMethod) data.paymentMethod = bulk.paymentMethod as PaymentMethod;
    if (Object.keys(data).length === 0) { alert('Preencha ao menos um campo para aplicar aos selecionados.'); return; }
    if (!confirm(`Aplicar as alterações a ${selected.size} gasto(s)?`)) return;
    onUpdateManyExpenses([...selected].map(id => ({ id, data })));
    setBulk({}); setSelected(new Set());
  };

  const deleteBulk = () => {
    if (!confirm(`Excluir ${selected.size} gasto(s)? Esta ação não pode ser desfeita.`)) return;
    onDeleteManyExpenses([...selected]);
    setSelected(new Set());
  };

  const commitDraft = () => {
    const category = (draft.category || '').trim();
    if (draft.amount === undefined || Number.isNaN(Number(draft.amount))) { alert('Informe o valor do novo gasto.'); return; }
    onSaveExpense({
      id: '', date: draft.date || todayISO(), category,
      item: (draft.item || '').trim() || undefined, amount: Number(draft.amount) || 0,
      description: (draft.description || '').trim() || undefined, source: (draft.source || '').trim() || undefined,
      bank: (draft.bank || '').trim() || undefined, paymentMethod: draft.paymentMethod || undefined,
      createdAt: new Date().toISOString(),
    } as Expense);
    setDraft({ date: draft.date || todayISO(), paymentMethod: 'PIX' });
  };

  const clearRangeFilters = () => { setDateFrom(''); setDateTo(''); };

  // --- Análise (gráficos) — filtros PRÓPRIOS, separados dos lançamentos ---
  const [aCats, setACats] = useState<Set<string>>(new Set());
  const [aMonths, setAMonths] = useState<Set<string>>(new Set());
  const [aBanks, setABanks] = useState<Set<string>>(new Set());
  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => { const n = new Set(set); n.has(val) ? n.delete(val) : n.add(val); setter(n); };

  const analysisRows = useMemo(() => expenses.filter(e => {
    if (aCats.size && !aCats.has((e.category || '').trim())) return false;
    if (aMonths.size && !aMonths.has(monthOf(e.date))) return false;
    if (aBanks.size && !aBanks.has((e.bank || '').trim())) return false;
    return true;
  }), [expenses, aCats, aMonths, aBanks]);

  const analysisTotal = useMemo(() => analysisRows.reduce((s, e) => s + (Number(e.amount) || 0), 0), [analysisRows]);
  const analysisByCategory = useMemo(() => {
    const m = new Map<string, number>();
    analysisRows.forEach(e => { const k = (e.category || '').trim() || 'Sem categoria'; m.set(k, (m.get(k) || 0) + (Number(e.amount) || 0)); });
    return Array.from(m.entries()).map(([key, total]) => ({ key, total })).sort((a, b) => b.total - a.total);
  }, [analysisRows]);
  // Ordena pelo yyyy-mm cru ANTES de virar rótulo (ordem cronológica correta).
  const analysisByMonth = useMemo(() => {
    const m = new Map<string, number>();
    analysisRows.forEach(e => { const k = monthOf(e.date); m.set(k, (m.get(k) || 0) + (Number(e.amount) || 0)); });
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, total]) => ({ key: k ? monthShort(k) : 'S/data', total }));
  }, [analysisRows]);
  const catTotalAbs = useMemo(() => analysisByCategory.reduce((s, c) => s + Math.abs(c.total), 0), [analysisByCategory]);
  // Dados do gráfico de pizza (usa valor absoluto para dimensionar as fatias; tooltip mostra o valor real).
  const pieData = useMemo(() => analysisByCategory.map(c => ({ ...c, abs: Math.abs(c.total) })).filter(c => c.abs > 0), [analysisByCategory]);
  const [catChart, setCatChart] = useState<'pie' | 'bar'>('pie');

  const selCls = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none';
  const dateCls = `${selCls} [color-scheme:dark] cursor-pointer`;
  const addCls = 'w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none';
  const bulkCls = 'bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none';

  const SummaryCard = ({ icon: Icon, label, value, accent, sub }: { icon: any; label: string; value: string; accent: string; sub?: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p><p className="text-lg font-bold text-white font-mono truncate">{value}</p>{sub && <p className="text-[10px] text-slate-500">{sub}</p>}</div>
    </div>
  );
  return (
    <div className="space-y-6">
      {/* Datalists compartilhadas */}
      <datalist id="exp-cats">{categoryOptions.map(c => <option key={c} value={c} />)}</datalist>
      <datalist id="exp-banks">{bankOptions.map(b => <option key={b} value={b} />)}</datalist>
      <datalist id="exp-sources">{sourceOptions.map(s => <option key={s} value={s} />)}</datalist>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gastos / Despesas</h2>
          <p className="text-slate-400 text-sm mt-1">Livro de despesas mês a mês — a categoria <span className="text-indigo-300 font-medium">APOSTAS</span> é o custo da operação</p>
        </div>
        <ExpensesImport expenses={expenses} onSaveExpense={onSaveExpense} />
      </div>

      {/* Navegação de mês */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 ${allMonths || usingDateRange ? 'opacity-40 pointer-events-none' : ''}`}>
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Mês anterior"><ChevronLeft size={18} /></button>
          <div className="relative flex items-center gap-2 px-3 min-w-[150px] justify-center">
            <CalendarDays size={15} className="text-indigo-400 shrink-0" />
            <span className="text-sm font-semibold text-white">{monthLabelFull(month)}</span>
            <input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} onClick={openPicker} className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]" title="Escolher mês" />
          </div>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Próximo mês"><ChevronRight size={18} /></button>
        </div>
        <button onClick={() => setAllMonths(v => !v)} disabled={usingDateRange} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 ${allMonths ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
          {allMonths ? 'Vendo: todos os meses' : 'Ver todos os meses'}
        </button>
        {usingDateRange && <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">Filtrando por data — mês ignorado</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Wallet} label="Despesas (sem apostas)" value={fmtBRL(kpis.despesas)} accent="bg-rose-500/10 text-rose-400" />
        <SummaryCard icon={Dices} label="Apostas (custo)" value={fmtBRL(kpis.apostas)} accent="bg-indigo-500/10 text-indigo-400" />
        <SummaryCard icon={Sigma} label="Gasto total" value={fmtBRL(kpis.total)} accent="bg-amber-500/10 text-amber-400" />
        <SummaryCard icon={ListChecks} label="Lançamentos" value={String(kpis.count)} accent="bg-slate-500/10 text-slate-300" sub={usingDateRange ? 'período por data' : (allMonths ? 'todos os meses' : monthLabelFull(month))} />
      </div>

      {/* --- Painel de Análise / Gráficos (filtros próprios) --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <button onClick={() => setShowAnalysis(v => !v)} className="w-full flex items-center justify-between gap-3 px-5 py-3 bg-slate-950/50 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center gap-2"><BarChart3 size={18} className="text-emerald-400" /><h3 className="text-sm font-bold text-white">Análise por gráficos</h3><span className="text-xs text-slate-500 hidden sm:inline">filtros independentes dos lançamentos</span></div>
          {showAnalysis ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </button>
        {showAnalysis && (
          <div className="p-5 space-y-4 border-t border-slate-800">
            {/* filtros de análise em caixas organizadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FilterBox title="Categorias" options={categoryOptions} selected={aCats} onToggle={c => toggle(aCats, c, setACats)} onSetAll={list => setACats(new Set(list))} />
              <FilterBox title="Meses" options={monthsInData} selected={aMonths} onToggle={m => toggle(aMonths, m, setAMonths)} onSetAll={list => setAMonths(new Set(list))} labelFn={monthLabel} />
              <FilterBox title="Bancos" options={bankOptions} selected={aBanks} onToggle={b => toggle(aBanks, b, setABanks)} onSetAll={list => setABanks(new Set(list))} />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2"><span className="text-[11px] text-slate-500 uppercase mr-2">Total filtrado</span><span className="text-lg font-bold text-white font-mono">{fmtBRL(analysisTotal)}</span></div>
              <span className="text-xs text-slate-500">{analysisRows.length} lançamento(s) · {aCats.size || 'todas'} categoria(s) · {aMonths.size || 'todos'} mês(es) · {aBanks.size || 'todos'} banco(s)</span>
            </div>

            {/* gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800/70">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">Por categoria</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{analysisByCategory.length} cat.</span>
                    <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button onClick={() => setCatChart('pie')} title="Pizza" className={`p-1 rounded ${catChart === 'pie' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}><PieIcon size={13} /></button>
                      <button onClick={() => setCatChart('bar')} title="Barras" className={`p-1 rounded ${catChart === 'bar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}><BarChart2 size={13} /></button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  {analysisByCategory.length === 0 ? <p className="text-xs text-slate-600 py-10 text-center">Sem dados no recorte atual.</p> : catChart === 'pie' ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <ResponsiveContainer width="100%" height={240} className="max-w-[260px] shrink-0">
                        <PieChart>
                          <Pie data={pieData} dataKey="abs" nameKey="key" cx="50%" cy="50%" innerRadius={52} outerRadius={92} paddingAngle={1} stroke="#0f172a" strokeWidth={2}>
                            {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip {...TOOLTIP_STYLES} formatter={(_v: any, _n: any, p: any) => { const pct = catTotalAbs > 0 ? ` · ${(p.payload.abs / catTotalAbs * 100).toFixed(1)}%` : ''; return [`${fmtBRL(p.payload.total)}${pct}`, p.payload.key]; }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full sm:flex-1 max-h-[240px] overflow-y-auto space-y-1 pr-1">
                        {pieData.map((c, i) => (
                          <div key={c.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 min-w-0"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="truncate text-slate-300">{c.key}</span></span>
                            <span className="font-mono text-slate-400 shrink-0">{fmtBRL(c.total)} <span className="text-slate-600">· {catTotalAbs > 0 ? (c.abs / catTotalAbs * 100).toFixed(0) : 0}%</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(180, analysisByCategory.length * 34)}>
                      <BarChart data={analysisByCategory} layout="vertical" margin={{ left: 8, right: 76, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtAxis} stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="key" width={100} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                        <Tooltip
                          {...TOOLTIP_STYLES}
                          cursor={{ fill: '#33415533' }}
                          formatter={(v: any) => { const n = Number(v); const pct = catTotalAbs > 0 ? ` · ${(Math.abs(n) / catTotalAbs * 100).toFixed(1)}%` : ''; return [`${fmtBRL(n)}${pct}`, 'Total']; }}
                        />
                        <Bar dataKey="total" name="Total" radius={[0, 5, 5, 0]} maxBarSize={22}>
                          {analysisByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          <LabelList dataKey="total" position="right" formatter={(v: any) => fmtBRL(Number(v))} fill="#94a3b8" fontSize={10} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/70">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">Por mês</p>
                  <span className="text-xs font-mono text-slate-500">{analysisByMonth.length} mês(es)</span>
                </div>
                <div className="p-3">
                  {analysisByMonth.length === 0 ? <p className="text-xs text-slate-600 py-10 text-center">Sem dados no recorte atual.</p> : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analysisByMonth} margin={{ left: 8, right: 8, top: 16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="key" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} interval={0} />
                        <YAxis tickFormatter={fmtAxis} stroke="#475569" fontSize={11} width={58} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP_STYLES} cursor={{ fill: '#33415533' }} formatter={(v: any) => [fmtBRL(Number(v)), 'Total']} />
                        <Bar dataKey="total" name="Total" fill="#818cf8" radius={[5, 5, 0, 0]} maxBarSize={48}>
                          <LabelList dataKey="total" position="top" formatter={(v: any) => fmtBRL(Number(v))} fill="#94a3b8" fontSize={10} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Filtros dos lançamentos --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:flex-wrap">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium shrink-0"><Filter size={16} /> Filtros:</div>
        <div className="relative flex-1 lg:max-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selCls}><option value="ALL">Todas as categorias</option>{categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select value={filterBank} onChange={e => setFilterBank(e.target.value)} className={selCls}><option value="ALL">Todos os bancos</option>{bankOptions.map(b => <option key={b} value={b}>{b}</option>)}</select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} onClick={openPicker} title="De" className={dateCls} />
          <span className="text-slate-600 text-xs">até</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} onClick={openPicker} title="Até" className={dateCls} />
          {usingDateRange && <button onClick={clearRangeFilters} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg" title="Limpar datas"><X size={14} /></button>}
        </div>
      </div>

      {/* --- Barra de ferramentas: ordenar + limite --- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className={`${selCls} pl-9`}>{SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
          <select value={String(pageSize)} onChange={e => setPageSize(e.target.value === 'Infinity' ? Infinity : Number(e.target.value))} className={selCls} title="Linhas por página">
            {PAGE_SIZES.map(n => <option key={String(n)} value={String(n)}>{n === Infinity ? 'Todas as linhas' : `${n} linhas`}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-500 font-mono">{filtered.length === 0 ? 'nenhum lançamento' : `${rowStart}–${rowEnd} de ${filtered.length}`}</span>
      </div>

      {/* --- Barra de seleção (edição rápida / exclusão em massa) --- */}
      {selected.size > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-semibold text-indigo-200 flex items-center gap-2"><Pencil size={14} /> {selected.size} selecionado(s) — edição rápida</span>
            <div className="flex items-center gap-2">
              <button onClick={deleteBulk} className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"><Trash2 size={13} /> Excluir selecionados</button>
              <button onClick={() => { setSelected(new Set()); setBulk({}); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="Limpar seleção"><X size={15} /></button>
            </div>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div><label className="block text-[10px] text-slate-500 uppercase mb-0.5">Data</label><input type="date" value={bulk.date || ''} onChange={e => setBulk(b => ({ ...b, date: e.target.value }))} onClick={openPicker} className={`${bulkCls} [color-scheme:dark] cursor-pointer`} /></div>
            <div><label className="block text-[10px] text-slate-500 uppercase mb-0.5">Categoria</label><input type="text" list="exp-cats" value={bulk.category || ''} onChange={e => setBulk(b => ({ ...b, category: e.target.value }))} placeholder="—" className={`${bulkCls} w-32`} /></div>
            <div><label className="block text-[10px] text-slate-500 uppercase mb-0.5">Banco</label><input type="text" list="exp-banks" value={bulk.bank || ''} onChange={e => setBulk(b => ({ ...b, bank: e.target.value }))} placeholder="—" className={`${bulkCls} w-28`} /></div>
            <div><label className="block text-[10px] text-slate-500 uppercase mb-0.5">Razão social</label><input type="text" list="exp-sources" value={bulk.source || ''} onChange={e => setBulk(b => ({ ...b, source: e.target.value }))} placeholder="—" className={`${bulkCls} w-32`} /></div>
            <div><label className="block text-[10px] text-slate-500 uppercase mb-0.5">Pgto</label><select value={bulk.paymentMethod || ''} onChange={e => setBulk(b => ({ ...b, paymentMethod: (e.target.value || '') as PaymentMethod | '' }))} className={`${bulkCls} cursor-pointer`}><option value="">—</option>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
            <button onClick={applyBulk} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">Aplicar aos selecionados</button>
            <span className="text-[10px] text-slate-500 pb-1.5">só os campos preenchidos são alterados</span>
          </div>
        </div>
      )}

      {/* --- Tabela editável inline --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70 bg-slate-950/40">
              <tr>
                <th className="px-3 py-2 w-8"><input ref={headerChk} type="checkbox" checked={allSelected} onChange={toggleAll} title="Selecionar todos (do filtro atual)" className="accent-indigo-500 w-4 h-4 align-middle cursor-pointer" /></th>
                <th className="text-left font-semibold px-3 py-2">Data</th>
                <th className="text-left font-semibold px-3 py-2">Categoria</th>
                <th className="text-left font-semibold px-3 py-2">Item</th>
                <th className="text-right font-semibold px-3 py-2">Valor</th>
                <th className="text-left font-semibold px-3 py-2">Descrição</th>
                <th className="text-left font-semibold px-3 py-2">Banco</th>
                <th className="text-left font-semibold px-3 py-2">Razão social</th>
                <th className="text-left font-semibold px-3 py-2">Pgto</th>
                <th className="text-right font-semibold px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {/* Linha de adição rápida */}
              <tr className="bg-slate-950/40">
                <td className="px-3 py-1.5 text-center"><Plus size={13} className="text-slate-600 inline" /></td>
                <td className="px-2 py-1.5"><input type="date" value={draft.date || todayISO()} onClick={openPicker} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} className={`${addCls} [color-scheme:dark] cursor-pointer font-mono text-xs`} /></td>
                <td className="px-2 py-1.5"><input type="text" list="exp-cats" value={draft.category || ''} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} placeholder="Categoria" className={addCls} /></td>
                <td className="px-2 py-1.5"><input type="text" value={draft.item || ''} onChange={e => setDraft(d => ({ ...d, item: e.target.value }))} placeholder="Item" className={addCls} /></td>
                <td className="px-2 py-1.5"><input type="number" step="0.01" value={draft.amount ?? ''} onWheel={blurOnWheel} onKeyDown={e => { if (e.key === 'Enter') commitDraft(); }} onChange={e => setDraft(d => ({ ...d, amount: e.target.value === '' ? undefined : toNum(e.target.value) }))} placeholder="R$ 0,00" className={`${addCls} text-right font-mono`} /></td>
                <td className="px-2 py-1.5"><input type="text" value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Descrição" className={addCls} /></td>
                <td className="px-2 py-1.5"><input type="text" list="exp-banks" value={draft.bank || ''} onChange={e => setDraft(d => ({ ...d, bank: e.target.value }))} placeholder="Banco" className={addCls} /></td>
                <td className="px-2 py-1.5"><input type="text" list="exp-sources" value={draft.source || ''} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))} placeholder="Destino" className={addCls} /></td>
                <td className="px-2 py-1.5"><select value={draft.paymentMethod || ''} onChange={e => setDraft(d => ({ ...d, paymentMethod: (e.target.value || undefined) as PaymentMethod | undefined }))} className={`${addCls} cursor-pointer`}><option value="">—</option>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></td>
                <td className="px-2 py-1.5 text-center"><button onClick={commitDraft} title="Adicionar" className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors"><Plus size={16} /></button></td>
              </tr>

              {pageRows.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-500 text-sm">Nenhum gasto neste recorte. Use a linha acima para adicionar.</td></tr>
              ) : pageRows.map(e => (
                <tr key={e.id} className={`transition-colors align-middle ${selected.has(e.id) ? 'bg-indigo-500/5' : 'hover:bg-slate-800/20'}`}>
                  <td className="px-3 py-1 text-center"><input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSel(e.id)} className="accent-indigo-500 w-4 h-4 align-middle cursor-pointer" /></td>
                  <td className="px-2 py-1"><InlineDate value={e.date} onCommit={v => onSaveExpense({ ...e, date: v })} /></td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {isApostas(e.category) && <Dices size={11} className="text-indigo-400 shrink-0" />}
                      <InlineText value={e.category} listId="exp-cats" onCommit={v => onSaveExpense({ ...e, category: v })} className={`${cellCls} ${isApostas(e.category) ? 'text-indigo-300' : ''}`} />
                    </div>
                  </td>
                  <td className="px-2 py-1"><InlineText value={e.item} onCommit={v => onSaveExpense({ ...e, item: v || undefined })} /></td>
                  <td className="px-2 py-1 min-w-[110px]"><InlineMoney value={e.amount} onCommit={v => onSaveExpense({ ...e, amount: v })} /></td>
                  <td className="px-2 py-1 min-w-[160px]"><InlineText value={e.description} onCommit={v => onSaveExpense({ ...e, description: v || undefined })} /></td>
                  <td className="px-2 py-1"><InlineText value={e.bank} listId="exp-banks" onCommit={v => onSaveExpense({ ...e, bank: v || undefined })} /></td>
                  <td className="px-2 py-1"><InlineText value={e.source} listId="exp-sources" onCommit={v => onSaveExpense({ ...e, source: v || undefined })} /></td>
                  <td className="px-2 py-1">
                    <select value={e.paymentMethod || ''} onChange={ev => onSaveExpense({ ...e, paymentMethod: (ev.target.value || undefined) as PaymentMethod | undefined })} className={`${cellCls} cursor-pointer text-xs`}>
                      <option value="">—</option>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-center"><button onClick={() => { if (confirm('Excluir este gasto?')) onDeleteExpense(e.id); }} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Excluir"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Rodapé: total + paginação */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-950/40">
          <span className="text-sm text-slate-300">Total do recorte: <span className="font-mono font-bold text-white">{fmtBRL(kpis.total)}</span></span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={curPage === 0} className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800"><ChevronLeft size={16} /></button>
              <span className="text-xs text-slate-400 font-mono">{curPage + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={curPage >= totalPages - 1} className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">Edite qualquer célula direto na tabela — salva automaticamente. A primeira linha adiciona um novo gasto. Marque as caixas para edição rápida ou exclusão em massa.</p>
    </div>
  );
};
