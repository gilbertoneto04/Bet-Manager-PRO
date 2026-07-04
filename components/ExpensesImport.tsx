// ⚠️ COMPONENTE TEMPORÁRIO — importador dos gastos a partir de um link do Google Sheets.
// A versão final do app NÃO terá importador. Para remover por completo:
//   1) apague este arquivo (ExpensesImport.tsx);
//   2) no Expenses.tsx, remova o import e a linha <ExpensesImport ... /> (marcados com "TEMP").
// Busca ao vivo cada aba "Gastos - <Mês>". Layout fixo das colunas:
//   0=DATA (dd/mm, sem ano) · 1=CATEGORIA · 2=ITEM · 3=VALOR · 4=DESCRIÇÃO · 5=BANCO/conta (MP/NU/...) · 6=RAZÃO SOCIAL (destino)
import React, { useMemo, useState } from 'react';
import { Expense } from '../types';
import { fmtBRL } from '../finance';
import { EXPENSE_APOSTAS_CATEGORY, MONTH_NAMES } from '../constants';
import { Upload, X, Check, Link2, Loader2, AlertTriangle, ClipboardPaste, Calendar } from 'lucide-react';

interface ExpensesImportProps {
  expenses: Expense[];
  onSaveExpense: (e: Expense) => void;
}

const isApostas = (cat?: string) => (cat || '').trim().toUpperCase() === EXPENSE_APOSTAS_CATEGORY;

const parseNum = (raw: string | number): number => {
  if (typeof raw === 'number') return raw;
  let t = String(raw).replace(/[^0-9,.\-]/g, '').trim();
  if (!t || t === '-' || t === '.' || t === ',') return NaN;
  if (t.includes(',') && t.includes('.')) {
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  const n = parseFloat(t);
  return isNaN(n) ? NaN : n;
};

// Aceita dd/mm/aaaa, aaaa-mm-dd, Date(a,m,d) e dd/mm (sem ano → usa `year`).
const toISODate = (raw: string, year: number): string => {
  const s = String(raw || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);      // dd/mm/aaaa
  if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);            // aaaa-mm-dd
  if (m) { const [, y, mo, d] = m; return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  m = s.match(/Date\((\d+),(\d+),(\d+)/);                            // Date(a,m,d)
  if (m) { const y = +m[1], mo = +m[2] + 1, d = +m[3]; return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);                        // dd/mm (sem ano)
  if (m) { const [, d, mo] = m; return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  return '';
};

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [], field = '', i = 0, inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
};

const parseTabular = (text: string): string[][] => {
  const firstLine = text.split(/\r?\n/)[0] || '';
  if (firstLine.includes('\t')) return text.split(/\r?\n/).map(l => l.split('\t'));
  return parseCSV(text);
};

const parseSheetId = (url: string): string =>
  (url.match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/) || [])[1] || '';

interface ParsedExpense {
  date: string; category: string; item?: string; amount: number; description?: string; source?: string; bank?: string; month: string;
}

// Converte linhas cruas (layout fixo) em gastos. Basta ter VALOR numérico;
// linhas sem DATA ou sem CATEGORIA também entram (data/categoria ficam em branco).
const rowsToExpenses = (rows: string[][], year: number): ParsedExpense[] => {
  const out: ParsedExpense[] = [];
  rows.forEach((r) => {
    if (/^data$/i.test((r[0] || '').trim())) return;   // cabeçalho
    const amount = parseNum((r[3] || '').trim());
    if (Number.isNaN(amount)) return;                  // precisa de valor numérico
    const date = toISODate((r[0] || '').trim(), year); // pode ficar vazio (sem data)
    out.push({
      date,
      category: (r[1] || '').trim(),
      item: (r[2] || '').trim() || undefined,
      amount,
      description: (r[4] || '').trim() || undefined,
      bank: (r[5] || '').trim() || undefined,          // conta que pagou (MP/NU/NUPJ/SC)
      source: (r[6] || '').trim() || undefined,        // RAZÃO SOCIAL = destino do pagamento
      month: date.slice(0, 7),
    });
  });
  return out;
};

const sigOf = (p: { date: string; category: string; item?: string; amount: number; source?: string; bank?: string }) =>
  `${p.date}|${(p.category || '').toLowerCase()}|${(p.item || '').toLowerCase()}|${Math.round(p.amount * 100)}|${(p.source || '').toLowerCase()}|${(p.bank || '').toLowerCase()}`;

export const ExpensesImport: React.FC<ExpensesImportProps> = ({ expenses, onSaveExpense }) => {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedExpense[] | null>(null);
  const [foundMonths, setFoundMonths] = useState<string[]>([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  const reset = () => { setParsed(null); setError(''); setFoundMonths([]); setProgress(''); };

  // Devolve o CSV cru da aba (para permitir detectar o fallback do gviz por conteúdo).
  const fetchTabText = async (id: string, sheetName: string): Promise<string | null> => {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      if (/^\s*<!DOCTYPE|<html|google\.visualization\.Query\.setResponse|Sorry, unable|Invalid query/i.test(text.slice(0, 300))) return null;
      return text;
    } catch { return null; }
  };

  const fetchFromLink = async () => {
    const id = parseSheetId(link);
    if (!id) { setError('Link inválido. Cole o link completo do Google Sheets (com /spreadsheets/d/...).'); return; }
    setLoading(true); setError(''); setParsed(null); setFoundMonths([]);
    try {
      const all: ParsedExpense[] = [];
      const found: string[] = [];
      // ARMADILHA do gviz: pedir uma aba que NÃO existe não dá erro — o Google devolve
      // a primeira aba silenciosamente. Sem esta checagem, "Gastos - Agosto…Dezembro"
      // inexistentes viravam cópias fantasma de Janeiro. Detectamos pelo conteúdo repetido.
      const seenPayloads = new Set<string>();
      for (const mes of MONTH_NAMES) {
        setProgress(`Buscando “Gastos - ${mes}”...`);
        const text = await fetchTabText(id, `Gastos - ${mes}`);
        if (!text) continue;
        if (seenPayloads.has(text)) continue; // fallback do gviz (aba inexistente) — ignora
        seenPayloads.add(text);
        const rows = parseCSV(text);
        if (rows.length) {
          const p = rowsToExpenses(rows, year);
          if (p.length) { all.push(...p); found.push(mes); }
        }
      }
      setProgress('');
      if (all.length === 0) {
        setError('Não encontrei abas “Gastos - <Mês>” com linhas válidas. Confirme que a planilha está pública ("Qualquer pessoa com o link pode ver") e o ano selecionado, ou use a opção de colar abaixo.');
        setShowPaste(true);
        return;
      }
      setFoundMonths(found);
      setParsed(all);
    } catch (e: any) {
      setError(`Não consegui baixar pelo link (${e.message}). Confirme que a planilha está pública ou use a opção de colar.`);
      setShowPaste(true);
    } finally {
      setLoading(false);
    }
  };

  const applyPasted = () => {
    const rows = parseTabular(pasted);
    const p = rowsToExpenses(rows, year);
    if (p.length === 0) { setError('Conteúdo colado sem linhas válidas (precisa de VALOR numérico na 4ª coluna).'); return; }
    setError(''); setFoundMonths([]); setParsed(p);
  };

  const existingSig = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach(e => s.add(sigOf({ date: (e.date || '').slice(0, 10), category: e.category, item: e.item, amount: Number(e.amount) || 0, source: e.source, bank: e.bank })));
    return s;
  }, [expenses]);

  const plan = useMemo(() => {
    if (!parsed) return { toImport: [] as ParsedExpense[], skippedDb: 0, skippedFile: 0, despesas: 0, apostas: 0 };
    const seen = new Set<string>();
    const toImport: ParsedExpense[] = [];
    let skippedDb = 0, skippedFile = 0; // separados: "já está no app" ≠ "linha repetida na planilha"
    parsed.forEach(p => {
      if (!allowDuplicates) {
        const sig = sigOf(p);
        if (existingSig.has(sig)) { skippedDb++; return; }
        if (seen.has(sig)) { skippedFile++; return; }
        seen.add(sig);
      }
      toImport.push(p);
    });
    let despesas = 0, apostas = 0;
    toImport.forEach(p => { if (isApostas(p.category)) apostas += p.amount; else despesas += p.amount; });
    return { toImport, skippedDb, skippedFile, despesas, apostas };
  }, [parsed, existingSig, allowDuplicates]);

  const apply = () => {
    if (plan.toImport.length === 0) { alert('Nada para importar (tudo já existente).'); return; }
    if (!confirm(`Importar ${plan.toImport.length} gasto(s)?`)) return;
    const now = new Date().toISOString();
    plan.toImport.forEach(p => {
      onSaveExpense({
        id: '', date: p.date, category: p.category, item: p.item, amount: p.amount,
        description: p.description, source: p.source, bank: p.bank, createdAt: now,
      } as Expense);
    });
    const pulados = plan.skippedDb + plan.skippedFile;
    alert(`Importados ${plan.toImport.length} gasto(s).${pulados ? ` (${plan.skippedDb} já existiam no app e ${plan.skippedFile} repetidos na planilha foram pulados.)` : ''}`);
    setOpen(false); reset(); setLink('');
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Upload size={16} /> Importar do Sheets
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Upload size={20} className="text-indigo-400" /> Importar gastos do Sheets</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[240px] space-y-1">
                    <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Link2 size={13} /> Link da planilha CONTROLE</label>
                    <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Calendar size={13} /> Ano</label>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value) || new Date().getFullYear())} onWheel={e => e.currentTarget.blur()}
                      className={`${inputCls} w-24 font-mono`} />
                  </div>
                  <button onClick={fetchFromLink} disabled={loading || !link.trim()} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Buscar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">Lê as abas <span className="text-slate-300">“Gastos - Janeiro”…“Gastos - Dezembro”</span>. As datas na planilha são dd/mm (sem ano) — por isso o campo <span className="text-slate-300">Ano</span>. A planilha precisa estar como <span className="text-slate-300">"Qualquer pessoa com o link pode ver"</span>.</p>
                {loading && progress && <p className="text-[11px] text-indigo-300 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> {progress}</p>}
                <button onClick={() => setShowPaste(s => !s)} className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1"><ClipboardPaste size={12} /> {showPaste ? 'Esconder' : 'Ou colar uma aba manualmente'}</button>
                {showPaste && (
                  <div className="space-y-2">
                    <textarea value={pasted} onChange={e => setPasted(e.target.value)} rows={4} placeholder="Cole as linhas de uma aba Gastos (DATA, CATEGORIA, ITEM, VALOR, DESCRIÇÃO, BANCO, RAZÃO SOCIAL)..." className={`${inputCls} font-mono text-xs`} />
                    <button onClick={applyPasted} disabled={!pasted.trim()} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Usar conteúdo colado (ano {year})</button>
                  </div>
                )}
                {error && <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
              </div>

              {parsed && (
                <>
                  {foundMonths.length > 0 && (
                    <p className="text-[11px] text-slate-400">Meses encontrados: <span className="text-slate-200">{foundMonths.join(', ')}</span></p>
                  )}
                  <label className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 cursor-pointer">
                    <input type="checkbox" checked={allowDuplicates} onChange={e => setAllowDuplicates(e.target.checked)} className="accent-indigo-500 w-4 h-4 mt-0.5" />
                    <span>Importar duplicados <span className="text-slate-500">— traz todas as linhas mesmo que iguais a outra (útil quando linhas idênticas não são de fato duplicatas). Desmarcado, pula gastos já existentes/repetidos.</span></span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">A importar</p>
                      <p className="text-lg font-bold text-white font-mono">{plan.toImport.length}</p>
                      {plan.skippedDb > 0 && <p className="text-[10px] text-slate-500">{plan.skippedDb} já existem no app</p>}
                      {plan.skippedFile > 0 && <p className="text-[10px] text-slate-500">{plan.skippedFile} repetidos na planilha</p>}
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">Despesas</p>
                      <p className="text-lg font-bold text-rose-300 font-mono">{fmtBRL(plan.despesas)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">Apostas (custo)</p>
                      <p className="text-lg font-bold text-indigo-300 font-mono">{fmtBRL(plan.apostas)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <h4 className="text-sm font-bold text-slate-200 mb-2">Pré-visualização ({Math.min(plan.toImport.length, 6)} de {plan.toImport.length})</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-950 text-slate-500 uppercase">
                          <tr><th className="px-2 py-1.5 text-left">Data</th><th className="px-2 py-1.5 text-left">Categoria</th><th className="px-2 py-1.5 text-left">Item</th><th className="px-2 py-1.5 text-right">Valor</th><th className="px-2 py-1.5 text-left">Banco</th><th className="px-2 py-1.5 text-left">Razão (destino)</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {plan.toImport.slice(0, 6).map((p, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1.5 text-slate-300 font-mono whitespace-nowrap">{p.date || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-200 whitespace-nowrap">{p.category || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-400 max-w-[130px] truncate" title={p.item}>{p.item || '—'}</td>
                              <td className={`px-2 py-1.5 text-right font-mono ${p.amount < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>{fmtBRL(p.amount)}</td>
                              <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{p.bank || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{p.source || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">Rodar de novo é seguro: gastos idênticos (data + categoria + item + valor + destino + banco) já importados são pulados.</p>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">
              <button onClick={apply} disabled={!parsed || plan.toImport.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Check size={18} /> Importar {plan.toImport.length} gasto(s)
              </button>
              <button onClick={() => { setOpen(false); reset(); }} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
