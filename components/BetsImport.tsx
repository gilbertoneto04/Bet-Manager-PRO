// ⚠️ COMPONENTE TEMPORÁRIO — importador das apostas a partir de um link do Google Sheets.
// A versão final do app NÃO terá importador. Para remover por completo:
//   1) apague este arquivo (BetsImport.tsx) e o betsSeed.ts (não é mais usado);
//   2) no Bets.tsx, remova o import e a linha <BetsImport ... /> (marcados com "TEMP").
// É autocontido: renderiza o próprio botão e o modal. Busca o CSV ao vivo (sempre a última versão).
import React, { useMemo, useState } from 'react';
import { Bet, Tipster, BetResult } from '../types';
import { computeBet, fmtBRL } from '../finance';
import { Upload, X, Check, Link2, Loader2, AlertTriangle, ClipboardPaste } from 'lucide-react';

interface BetsImportProps {
  bets: Bet[];
  tipsters: Tipster[];
  onSaveBet: (b: Bet) => void;
  onSaveTipster: (t: Tipster) => void;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// --- Parsing de números no padrão BR (1.164,96) ou US (1164.96), com "R$" etc. ---
const parseNum = (raw: string | number): number => {
  if (typeof raw === 'number') return raw;
  let t = String(raw).replace(/[^0-9,.\-]/g, '').trim();
  if (!t) return 0;
  if (t.includes(',') && t.includes('.')) {
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
};

// --- Datas: aceita dd/mm/aaaa, aaaa-mm-dd e o formato Date(a,m,d) do gviz ---
const toISODate = (raw: string): string => {
  const s = String(raw || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) { const [, y, mo, d] = m; return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  m = s.match(/Date\((\d+),(\d+),(\d+)/);
  if (m) { const y = +m[1], mo = +m[2] + 1, d = +m[3]; return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  return s.slice(0, 10);
};

const parseResult = (raw: string): BetResult => {
  const n = norm(raw);
  if (!n) return 'TBD';
  if (/(meio|meia|1\/2|½).*green|green.*(parcial)/.test(n)) return 'HW';
  if (/(meio|meia|1\/2|½).*red|red.*(parcial)/.test(n)) return 'HL';
  if (n.includes('cash')) return 'CASHED';
  if (n.includes('green') || n === 'w' || n.includes('ganh') || n.includes('win') || n.includes('vitor')) return 'W';
  if (n.includes('red') || n === 'l' || n.includes('perd') || n.includes('loss') || n.includes('derrot')) return 'L';
  if (n.includes('void') || n.includes('reemb') || n.includes('anul') || n.includes('devolv') || n === 'r' || n.includes('push')) return 'R';
  return 'TBD';
};

const parseMoment = (raw: string): 'PRE' | 'LIVE' | undefined => {
  const n = norm(raw);
  if (!n) return undefined;
  if (n.includes('live') || n.includes('vivo')) return 'LIVE';
  if (n.includes('pre') || n.includes('pré')) return 'PRE';
  return undefined;
};

// --- CSV parser (lida com aspas, vírgulas e quebras de linha dentro de campos) ---
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
  return rows.filter(r => r.some(c => (c || '').trim() !== ''));
};

// Suporta colar TSV (copiado direto do Sheets) ou CSV
const parseTabular = (text: string): string[][] => {
  const firstLine = text.split(/\r?\n/)[0] || '';
  if (firstLine.includes('\t') && !firstLine.includes(',')) {
    return text.split(/\r?\n/).map(l => l.split('\t')).filter(r => r.some(c => (c || '').trim() !== ''));
  }
  return parseCSV(text);
};

const parseSheetUrl = (url: string): { id: string; gid: string } => {
  const id = (url.match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/) || [])[1] || '';
  const gid = (url.match(/[#?&]gid=(\d+)/) || [])[1] || '';
  return { id, gid };
};

type FieldKey = 'date' | 'time' | 'tipster' | 'sport' | 'house' | 'provider' | 'team1' | 'team2' | 'market' | 'selection' | 'moment' | 'stake' | 'odds' | 'result' | 'cashout';
const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: 'date', label: 'Data', required: true },
  { key: 'time', label: 'Hora' },
  { key: 'tipster', label: 'Tipster', required: true },
  { key: 'sport', label: 'Esporte' },
  { key: 'house', label: 'Casa' },
  { key: 'provider', label: 'Provedor' },
  { key: 'team1', label: 'Time 1 / Evento' },
  { key: 'team2', label: 'Time 2' },
  { key: 'market', label: 'Mercado' },
  { key: 'selection', label: 'Aposta / Seleção' },
  { key: 'moment', label: 'Momento (Pré/Live)' },
  { key: 'stake', label: 'Stake (R$)', required: true },
  { key: 'odds', label: 'Odd', required: true },
  { key: 'result', label: 'Resultado' },
  { key: 'cashout', label: 'Retorno cashout (R$)' },
];
const ALIASES: Record<FieldKey, string[]> = {
  date: ['data', 'date', 'dia'],
  time: ['hora', 'horario', 'hr', 'time'],
  tipster: ['tipster', 'tip', 'analista'],
  sport: ['esporte', 'sport', 'modalidade'],
  house: ['casa', 'house', 'bookmaker', 'book', 'bookie'],
  provider: ['provedor', 'provider'],
  team1: ['time1', 'time 1', 'mandante', 'evento', 'jogo', 'partida', 'home', 'casa1'],
  team2: ['time2', 'time 2', 'visitante', 'fora', 'away'],
  market: ['mercado', 'market'],
  selection: ['aposta', 'selecao', 'selection', 'pick', 'entrada'],
  moment: ['momento', 'prelive', 'pre/live', 'moment', 'tempo'],
  stake: ['stake', 'valor', 'investido', 'apostado', 'valor apostado', 'stake r$', 'entrada r$'],
  odds: ['odd', 'odds', 'cotacao'],
  result: ['resultado', 'result', 'status'],
  cashout: ['cashout', 'cash out', 'retorno'],
};

const guessMapping = (headerRow: string[]): Record<FieldKey, number> => {
  const map = {} as Record<FieldKey, number>;
  FIELDS.forEach(f => { map[f.key] = -1; });
  const used = new Set<number>();
  FIELDS.forEach(f => {
    const idx = headerRow.findIndex((h, i) => !used.has(i) && ALIASES[f.key].some(a => norm(h) === a || norm(h).includes(a)));
    if (idx >= 0) { map[f.key] = idx; used.add(idx); }
  });
  return map;
};

const looksLikeHeader = (row: string[]): boolean => {
  const hits = FIELDS.reduce((n, f) => n + (row.some(c => ALIASES[f.key].some(a => norm(c) === a || norm(c).includes(a))) ? 1 : 0), 0);
  return hits >= 3;
};

const sigOf = (date: string, tipster: string, stakeReais: number, odds: number, selection: string) =>
  `${(date || '').slice(0, 10)}|${norm(tipster)}|${Math.round(stakeReais * 100)}|${odds}|${norm(selection || '')}`;

interface ParsedRow {
  date: string; time?: string; tipster: string; sport?: string; house?: string; provider?: string;
  team1?: string; team2?: string; market?: string; selection?: string; moment?: 'PRE' | 'LIVE';
  stakeReais: number; odds: number; result: BetResult; cashoutValue?: number;
}

export const BetsImport: React.FC<BetsImportProps> = ({ bets, tipsters, onSaveBet, onSaveTipster }) => {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({} as Record<FieldKey, number>);
  const [excludedTipsters, setExcludedTipsters] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState<Record<string, string>>({});

  const reset = () => { setRawRows(null); setError(''); setExcludedTipsters(new Set()); setEdited({}); };

  const ingest = (rows: string[][]) => {
    if (rows.length === 0) { setError('Nenhuma linha encontrada.'); return; }
    const header = looksLikeHeader(rows[0]);
    setHasHeader(header);
    setMapping(header ? guessMapping(rows[0]) : (() => { const m = {} as Record<FieldKey, number>; FIELDS.forEach((f, i) => { m[f.key] = i; }); return m; })());
    setRawRows(rows);
    setError('');
  };

  const fetchFromLink = async () => {
    const { id, gid } = parseSheetUrl(link);
    if (!id) { setError('Link inválido. Cole o link completo do Google Sheets (com /spreadsheets/d/...).'); return; }
    setLoading(true); setError('');
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (/<html|google.visualization|Sorry, unable/i.test(text.slice(0, 200))) {
        throw new Error('A planilha não está pública.');
      }
      ingest(parseCSV(text));
    } catch (e: any) {
      setError(`Não consegui baixar pelo link (${e.message}). Confirme que a planilha está como "Qualquer pessoa com o link pode ver", ou use a opção de colar o conteúdo abaixo.`);
      setShowPaste(true);
    } finally {
      setLoading(false);
    }
  };

  const applyPasted = () => {
    const rows = parseTabular(pasted);
    if (rows.length === 0) { setError('Conteúdo colado vazio ou inválido.'); return; }
    ingest(rows);
  };

  const dataRows = useMemo(() => rawRows ? (hasHeader ? rawRows.slice(1) : rawRows) : [], [rawRows, hasHeader]);
  const colCount = useMemo(() => rawRows ? rawRows.reduce((m, r) => Math.max(m, r.length), 0) : 0, [rawRows]);

  const cell = (row: string[], key: FieldKey) => { const i = mapping[key]; return i != null && i >= 0 ? (row[i] || '').trim() : ''; };

  const parsed = useMemo<ParsedRow[]>(() => {
    if (!rawRows) return [];
    return dataRows.map(row => ({
      date: toISODate(cell(row, 'date')),
      time: cell(row, 'time') || undefined,
      tipster: cell(row, 'tipster'),
      sport: cell(row, 'sport') || undefined,
      house: cell(row, 'house') || undefined,
      provider: cell(row, 'provider') || undefined,
      team1: cell(row, 'team1') || undefined,
      team2: cell(row, 'team2') || undefined,
      market: cell(row, 'market') || undefined,
      selection: cell(row, 'selection') || undefined,
      moment: parseMoment(cell(row, 'moment')),
      stakeReais: parseNum(cell(row, 'stake')),
      odds: parseNum(cell(row, 'odds')),
      result: parseResult(cell(row, 'result')),
      cashoutValue: cell(row, 'cashout') ? parseNum(cell(row, 'cashout')) : undefined,
    })).filter(r => r.tipster && r.date && (r.stakeReais > 0 || r.odds > 0));
  }, [rawRows, dataRows, mapping]);

  const distinctTipsters = useMemo(() => Array.from(new Set(parsed.map(p => p.tipster))).sort(), [parsed]);
  const countByTipster = useMemo(() => { const m: Record<string, number> = {}; parsed.forEach(p => { m[p.tipster] = (m[p.tipster] || 0) + 1; }); return m; }, [parsed]);

  const unitStr = (t: string) => edited[t] ?? String(tipsters.find(x => x.name === t)?.unitValue ?? 1000);
  const unitNum = (t: string) => parseNum(unitStr(t));

  const existingSig = useMemo(() => {
    const s = new Set<string>();
    bets.forEach(b => s.add(sigOf(b.date, b.tipster, (b.stakeUnits || 0) * (b.unitValue || 0), b.odds, b.selection || '')));
    return s;
  }, [bets]);

  const plan = useMemo(() => {
    const seen = new Set<string>();
    const toImport: ParsedRow[] = [];
    let skipped = 0;
    parsed.forEach(p => {
      if (excludedTipsters.has(p.tipster)) return;
      const sig = sigOf(p.date, p.tipster, p.stakeReais, p.odds, p.selection || '');
      if (existingSig.has(sig) || seen.has(sig)) { skipped++; return; } // dedupe contra o banco E dentro do próprio arquivo
      seen.add(sig);
      toImport.push(p);
    });
    let invested = 0, pl = 0;
    toImport.forEach(p => {
      const u = unitNum(p.tipster);
      const c = computeBet({ result: p.result, stakeUnits: u > 0 ? p.stakeReais / u : 0, unitValue: u, odds: p.odds, cashoutValue: p.cashoutValue });
      if (!c.pending) { invested += c.stake; pl += c.pl; }
    });
    return { toImport, skipped, invested, pl };
  }, [parsed, excludedTipsters, existingSig, edited, tipsters]);

  const toggleTipster = (t: string) => setExcludedTipsters(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const apply = () => {
    if (plan.toImport.length === 0) { alert('Nada para importar (tudo desmarcado ou já existente).'); return; }
    if (!confirm(`Importar ${plan.toImport.length} apostas?\n\nTambém vou criar/atualizar os tipsters selecionados com o valor de unidade definido.`)) return;
    const now = new Date().toISOString();

    distinctTipsters.filter(t => !excludedTipsters.has(t)).forEach(t => {
      const unit = unitNum(t);
      const existing = tipsters.find(x => x.name === t);
      if (existing) { if (existing.unitValue !== unit) onSaveTipster({ ...existing, unitValue: unit }); }
      else onSaveTipster({ id: '', name: t, unitValue: unit, createdAt: now } as Tipster);
    });

    plan.toImport.forEach(p => {
      const u = unitNum(p.tipster);
      onSaveBet({
        id: '', date: p.date, time: p.time, tipster: p.tipster,
        unitValue: u, stakeUnits: u > 0 ? round6(p.stakeReais / u) : 0,
        odds: p.odds, result: p.result, cashoutValue: p.cashoutValue,
        sport: p.sport, house: p.house, provider: p.provider,
        team1: p.team1, team2: p.team2, market: p.market, selection: p.selection,
        moment: p.moment, createdAt: now,
      } as Bet);
    });

    alert(`Importadas ${plan.toImport.length} apostas.${plan.skipped ? ` (${plan.skipped} já existiam/duplicadas e foram puladas.)` : ''}`);
    setOpen(false); reset(); setLink('');
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none';
  const selCls = 'bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        <Upload size={16} /> Importar do Sheets
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Upload size={20} className="text-indigo-400" /> Importar apostas do Sheets</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Passo 1 — link */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Link2 size={13} /> Link da planilha (Google Sheets)</label>
                <div className="flex gap-2">
                  <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0" className={inputCls} />
                  <button onClick={fetchFromLink} disabled={loading || !link.trim()} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Buscar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">A planilha precisa estar compartilhada como <span className="text-slate-300">"Qualquer pessoa com o link pode ver"</span>. Sempre busca a versão mais recente.</p>
                <button onClick={() => setShowPaste(s => !s)} className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1"><ClipboardPaste size={12} /> {showPaste ? 'Esconder' : 'Ou colar o conteúdo manualmente'}</button>
                {showPaste && (
                  <div className="space-y-2">
                    <textarea value={pasted} onChange={e => setPasted(e.target.value)} rows={4} placeholder="Cole aqui as linhas copiadas da planilha (CSV ou direto do Sheets)..." className={`${inputCls} font-mono text-xs`} />
                    <button onClick={applyPasted} disabled={!pasted.trim()} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Usar conteúdo colado</button>
                  </div>
                )}
                {error && <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
              </div>

              {/* Passo 2 — mapeamento + preview + tipsters */}
              {rawRows && (
                <>
                  <div className="border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-200">Mapeamento de colunas</h4>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} className="accent-indigo-500" /> 1ª linha é cabeçalho
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">{dataRows.length} linha(s) de dados · {colCount} coluna(s) detectada(s). Ajuste qual coluna corresponde a cada campo.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {FIELDS.map(f => (
                        <label key={f.key} className="flex items-center justify-between gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5">
                          <span className="text-xs text-slate-300">{f.label}{f.required && <span className="text-red-400">*</span>}</span>
                          <select value={mapping[f.key] ?? -1} onChange={e => setMapping(m => ({ ...m, [f.key]: Number(e.target.value) }))} className={selCls}>
                            <option value={-1}>—</option>
                            {Array.from({ length: colCount }).map((_, i) => (
                              <option key={i} value={i}>{hasHeader && rawRows[0][i] ? `${rawRows[0][i].slice(0, 18)}` : `Col ${i + 1}`}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-bold text-slate-200 mb-2">Pré-visualização ({Math.min(parsed.length, 5)} de {parsed.length})</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-950 text-slate-500 uppercase">
                          <tr><th className="px-2 py-1.5 text-left">Data</th><th className="px-2 py-1.5 text-left">Tipster</th><th className="px-2 py-1.5 text-left">Casa</th><th className="px-2 py-1.5 text-left">Seleção</th><th className="px-2 py-1.5 text-right">Stake</th><th className="px-2 py-1.5 text-right">Odd</th><th className="px-2 py-1.5 text-left">Result.</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {parsed.slice(0, 5).map((p, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1.5 text-slate-300 font-mono whitespace-nowrap">{p.date || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-200 whitespace-nowrap">{p.tipster || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{p.house || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-400 max-w-[160px] truncate" title={p.selection}>{p.selection || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-slate-200">{fmtBRL(p.stakeReais)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-slate-200">{p.odds.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-slate-400">{p.result}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tipsters / unidade */}
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-bold text-slate-200 mb-1">Tipsters &amp; valor da unidade</h4>
                    <p className="text-[11px] text-slate-500 mb-2">Confirme a unidade de cada tipster (cada aposta guarda esse valor). Desmarque para não importar.</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase tracking-wide">
                          <tr><th className="px-3 py-2 text-left w-8"></th><th className="px-3 py-2 text-left font-semibold">Tipster</th><th className="px-3 py-2 text-right font-semibold">Apostas</th><th className="px-3 py-2 text-right font-semibold">Valor da unidade (R$)</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {distinctTipsters.map(t => {
                            const on = !excludedTipsters.has(t);
                            const known = tipsters.some(x => x.name === t);
                            return (
                              <tr key={t} className={on ? '' : 'opacity-40'}>
                                <td className="px-3 py-2"><input type="checkbox" checked={on} onChange={() => toggleTipster(t)} className="accent-indigo-500 w-4 h-4" /></td>
                                <td className="px-3 py-2 text-slate-100 font-medium whitespace-nowrap">{t} {known && <span className="text-[9px] text-emerald-500/70 uppercase ml-1">existe</span>}</td>
                                <td className="px-3 py-2 text-right text-slate-400 font-mono">{countByTipster[t]}</td>
                                <td className="px-3 py-2 text-right"><input type="number" step="0.01" value={unitStr(t)} onChange={e => setEdited(prev => ({ ...prev, [t]: e.target.value }))} className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-right font-mono text-white focus:ring-1 focus:ring-indigo-500 outline-none" /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">A importar</p>
                      <p className="text-lg font-bold text-white font-mono">{plan.toImport.length}</p>
                      {plan.skipped > 0 && <p className="text-[10px] text-slate-500">{plan.skipped} puladas</p>}
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">Investido (resolvidas)</p>
                      <p className="text-lg font-bold text-slate-200 font-mono">{fmtBRL(plan.invested)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">P/L</p>
                      <p className={`text-lg font-bold font-mono ${plan.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(plan.pl)}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">Rodar de novo é seguro: apostas idênticas (data + tipster + stake em centavos + odd + seleção) já importadas — ou repetidas no arquivo — são puladas.</p>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">
              <button onClick={apply} disabled={!rawRows || plan.toImport.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Check size={18} /> Importar {plan.toImport.length} apostas
              </button>
              <button onClick={() => { setOpen(false); reset(); }} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
