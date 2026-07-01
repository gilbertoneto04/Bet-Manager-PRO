import React, { useMemo, useState } from 'react';
import { Expense, Bank, PaymentMethod } from '../types';
import { fmtBRL } from '../finance';
import { EXPENSE_APOSTAS_CATEGORY, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, MONTH_NAMES } from '../constants';
import { ExpensesImport } from './ExpensesImport'; // TEMP: importador do Sheets — remover na versão final
import {
  Receipt, Wallet, Dices, Sigma, ListChecks, Search, Filter, Plus, Pencil, Trash2, X, Save,
  ChevronLeft, ChevronRight, CalendarDays, Tag, PieChart, Landmark, CreditCard
} from 'lucide-react';

interface ExpensesProps {
  expenses: Expense[];
  banks: Bank[];
  onSaveExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const toNum = (s: string | number) => {
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthOf = (d?: string) => (d || '').slice(0, 7);           // yyyy-mm
const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${MONTH_NAMES[idx]} ${y}` : ym;
};
const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const fmtDate = (d?: string) => {
  const iso = (d || '').slice(0, 10);
  const [y, m, day] = iso.split('-');
  return (day && m && y) ? `${day}/${m}/${y}` : (d || '—');
};
const isApostas = (cat?: string) => (cat || '').trim().toUpperCase() === EXPENSE_APOSTAS_CATEGORY;
// Evita que o scroll do mouse altere o valor de campos numéricos.
const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
const selClass = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none';

const emptyExpense = (): Partial<Expense> => ({ date: todayISO(), category: '', item: '', amount: undefined, description: '', source: '', bank: '', paymentMethod: 'PIX' });

export const Expenses: React.FC<ExpensesProps> = ({ expenses, banks, onSaveExpense, onDeleteExpense }) => {
  // Mês inicial: o mês do lançamento mais recente; se não houver, o mês atual.
  const latestMonth = useMemo(() => {
    const months = expenses.map(e => monthOf(e.date)).filter(Boolean).sort();
    return months.length ? months[months.length - 1] : monthOf(todayISO());
  }, [expenses]);

  const [month, setMonth] = useState<string>(latestMonth);
  const [allMonths, setAllMonths] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [modal, setModal] = useState<Partial<Expense> | null>(null);

  // Se o mês selecionado ficou "para trás" após carregar os dados, acompanha o mais recente uma vez.
  React.useEffect(() => { setMonth(latestMonth); }, [latestMonth]);

  // Categorias e fontes aparecem só conforme forem sendo preenchidas (derivadas dos dados).
  const categoryOptions = useMemo(
    () => Array.from(new Set(expenses.map(e => (e.category || '').trim()).filter(Boolean))).sort(),
    [expenses]
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(expenses.map(e => (e.source || '').trim()).filter(Boolean))).sort(),
    [expenses]
  );
  // Bancos: os cadastrados em Bancos & Investimentos + os já usados em gastos.
  const bankOptions = useMemo(
    () => Array.from(new Set([...banks.map(b => b.name), ...expenses.map(e => (e.bank || '').trim())].filter(Boolean))).sort(),
    [banks, expenses]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses
      .filter(e => {
        if (!allMonths && monthOf(e.date) !== month) return false;
        if (filterCategory !== 'ALL' && (e.category || '').trim() !== filterCategory) return false;
        if (filterSource !== 'ALL' && (e.source || '').trim() !== filterSource) return false;
        if (term) {
          const hay = [e.category, e.item, e.description, e.source, e.bank].join(' ').toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, month, allMonths, search, filterCategory, filterSource]);

  // KPIs: mesmo split do Resumo (Despesas = tudo que NÃO é APOSTAS; Apostas = categoria APOSTAS).
  const kpis = useMemo(() => {
    let despesas = 0, apostas = 0;
    filtered.forEach(e => {
      const v = Number(e.amount) || 0;
      if (isApostas(e.category)) apostas += v; else despesas += v;
    });
    return { despesas, apostas, total: despesas + apostas, count: filtered.length };
  }, [filtered]);

  // Pivô "Gasto por categoria" (soma por categoria no recorte atual, ordenado por maior gasto).
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = (e.category || '').trim() || '—';
      map.set(key, (map.get(key) || 0) + (Number(e.amount) || 0));
    });
    return Array.from(map.entries()).map(([key, total]) => ({ key, total })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const saveFromModal = () => {
    if (!modal) return;
    const category = (modal.category || '').trim();
    if (!category) { alert('Informe a categoria.'); return; }
    if (modal.amount === undefined || modal.amount === null || Number.isNaN(Number(modal.amount))) { alert('Informe o valor.'); return; }
    onSaveExpense({
      id: modal.id || '',
      date: modal.date || todayISO(),
      category,
      item: (modal.item || '').trim() || undefined,
      amount: Number(modal.amount) || 0,
      description: (modal.description || '').trim() || undefined,
      source: (modal.source || '').trim() || undefined,
      bank: (modal.bank || '').trim() || undefined,
      paymentMethod: modal.paymentMethod || undefined,
      createdAt: modal.createdAt || new Date().toISOString(),
    } as Expense);
    setModal(null);
  };

  const openPicker = (e: React.SyntheticEvent<HTMLInputElement>) => { try { (e.currentTarget as any).showPicker?.(); } catch {} };

  const SummaryCard = ({ icon: Icon, label, value, accent, sub }: { icon: any; label: string; value: string; accent: string; sub?: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
        <p className="text-lg font-bold text-white font-mono truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gastos / Despesas</h2>
          <p className="text-slate-400 text-sm mt-1">Livro de despesas mês a mês — a categoria <span className="text-indigo-300 font-medium">APOSTAS</span> é o custo da operação</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TEMP: importador do Sheets — remover na versão final (apague só esta linha) */}
          <ExpensesImport expenses={expenses} onSaveExpense={onSaveExpense} />
          <button
            onClick={() => setModal(emptyExpense())}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Novo gasto
          </button>
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 ${allMonths ? 'opacity-40 pointer-events-none' : ''}`}>
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Mês anterior"><ChevronLeft size={18} /></button>
          <div className="relative flex items-center gap-2 px-3 min-w-[150px] justify-center">
            <CalendarDays size={15} className="text-indigo-400 shrink-0" />
            <span className="text-sm font-semibold text-white">{monthLabel(month)}</span>
            <input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} onClick={openPicker}
              className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]" title="Escolher mês" />
          </div>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Próximo mês"><ChevronRight size={18} /></button>
        </div>
        <button
          onClick={() => setAllMonths(v => !v)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${allMonths ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          {allMonths ? 'Vendo: todos os meses' : 'Ver todos os meses'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Wallet} label="Despesas (sem apostas)" value={fmtBRL(kpis.despesas)} accent="bg-rose-500/10 text-rose-400" />
        <SummaryCard icon={Dices} label="Apostas (custo)" value={fmtBRL(kpis.apostas)} accent="bg-indigo-500/10 text-indigo-400" />
        <SummaryCard icon={Sigma} label="Gasto total" value={fmtBRL(kpis.total)} accent="bg-amber-500/10 text-amber-400" />
        <SummaryCard icon={ListChecks} label="Lançamentos" value={String(kpis.count)} accent="bg-slate-500/10 text-slate-300" sub={allMonths ? 'todos os meses' : monthLabel(month)} />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium shrink-0"><Filter size={16} /> Filtros:</div>
        <div className="relative flex-1 lg:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar item, descrição, razão, banco..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selClass}>
          <option value="ALL">Todas as categorias</option>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={selClass}>
          <option value="ALL">Todas as razões sociais</option>
          {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-6 items-start">
        {/* Tabela de lançamentos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt size={18} className="text-indigo-400 shrink-0" />
              <h3 className="text-sm font-bold text-white">Lançamentos</h3>
              <span className="text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
            </div>
            <span className="text-sm font-bold text-white font-mono">{fmtBRL(kpis.total)}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 mb-3 text-slate-500"><Receipt size={26} /></div>
              <h3 className="text-slate-300 font-medium">Nenhum gasto neste recorte</h3>
              <p className="text-slate-500 text-sm">Use “Novo gasto” para lançar ou ajuste o mês/filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70">
                  <tr>
                    <th className="text-left font-semibold px-5 py-2">Data</th>
                    <th className="text-left font-semibold px-3 py-2">Categoria</th>
                    <th className="text-left font-semibold px-3 py-2">Item</th>
                    <th className="text-right font-semibold px-3 py-2">Valor</th>
                    <th className="text-left font-semibold px-3 py-2">Descrição</th>
                    <th className="text-left font-semibold px-3 py-2">Razão social</th>
                    <th className="text-left font-semibold px-3 py-2">Banco / Pgto</th>
                    <th className="text-right font-semibold px-5 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-2.5 text-slate-300 whitespace-nowrap font-mono text-xs">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${isApostas(e.category) ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-slate-300 bg-slate-700/30 border-slate-600/30'}`}>
                          {isApostas(e.category) && <Dices size={10} />}{e.category || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap">{e.item || '—'}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap ${(Number(e.amount) || 0) < 0 ? 'text-emerald-400' : 'text-slate-100'}`}>{fmtBRL(Number(e.amount) || 0)}</td>
                      <td className="px-3 py-2.5 text-slate-400 max-w-[220px] truncate" title={e.description || ''}>{e.description || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{e.source || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {(e.bank || e.paymentMethod) ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            {e.bank && <span className="inline-flex items-center gap-1"><Landmark size={11} className="text-slate-500" />{e.bank}</span>}
                            {e.paymentMethod && <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-full">{PAYMENT_METHOD_LABELS[e.paymentMethod]}</span>}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setModal({ ...e })} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm('Excluir este gasto?')) onDeleteExpense(e.id); }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pivô: Gasto por categoria */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800 bg-slate-950/50">
            <PieChart size={18} className="text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold text-white">Gasto por categoria</h3>
          </div>
          {byCategory.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Sem dados no recorte atual.</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {byCategory.map(c => (
                <div key={c.key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isApostas(c.key) ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {isApostas(c.key) ? <Dices size={12} /> : <Tag size={12} className="text-slate-500" />}{c.key}
                  </span>
                  <span className={`text-sm font-mono font-semibold ${c.total < 0 ? 'text-emerald-400' : 'text-slate-100'}`}>{fmtBRL(c.total)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950/40">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Total geral</span>
                <span className="text-sm font-mono font-bold text-white">{fmtBRL(kpis.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal novo/editar gasto */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Receipt size={20} className="text-indigo-400" />
                {modal.id ? 'Editar gasto' : 'Novo gasto'}
              </h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Data *</label>
                  <input type="date" value={(modal.date || '').slice(0, 10)} onChange={e => setModal({ ...modal, date: e.target.value })} onClick={openPicker}
                    className={`${inputClass} [color-scheme:dark] cursor-pointer`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Valor (R$) *</label>
                  <input type="number" step="0.01" autoFocus value={modal.amount ?? ''} placeholder="0,00 (negativo = estorno)" onWheel={blurOnWheel}
                    onChange={e => setModal({ ...modal, amount: e.target.value === '' ? undefined : toNum(e.target.value) })}
                    className={`${inputClass} font-mono`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Categoria *</label>
                  <input type="text" list="expense-categories" value={modal.category || ''} onChange={e => setModal({ ...modal, category: e.target.value })}
                    placeholder="Ex.: MERCADO, APOSTAS..." className={inputClass} />
                  <datalist id="expense-categories">{categoryOptions.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Item</label>
                  <input type="text" value={modal.item || ''} onChange={e => setModal({ ...modal, item: e.target.value })}
                    placeholder="Ex.: GASOLINA, CONTAS..." className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Descrição</label>
                <input type="text" value={modal.description || ''} onChange={e => setModal({ ...modal, description: e.target.value })}
                  placeholder="Detalhe do gasto" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Razão social <span className="text-slate-500 font-normal">(destino do pagamento)</span></label>
                <input type="text" list="expense-sources" value={modal.source || ''} onChange={e => setModal({ ...modal, source: e.target.value })}
                  placeholder="Para quem/onde foi o pagamento" className={inputClass} />
                <datalist id="expense-sources">{sourceOptions.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1"><Landmark size={12} /> Banco</label>
                  <input type="text" list="expense-banks" value={modal.bank || ''} onChange={e => setModal({ ...modal, bank: e.target.value })}
                    placeholder="Escolha ou digite o banco" className={inputClass} />
                  <datalist id="expense-banks">{bankOptions.map(b => <option key={b} value={b} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1"><CreditCard size={12} /> Forma de pagamento</label>
                  <select value={modal.paymentMethod || ''} onChange={e => setModal({ ...modal, paymentMethod: (e.target.value || undefined) as PaymentMethod | undefined })}
                    className={`${inputClass} cursor-pointer`}>
                    <option value="">—</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button onClick={saveFromModal} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Save size={18} /> Salvar
                </button>
                <button onClick={() => setModal(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
