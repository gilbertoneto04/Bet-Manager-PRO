// ⚠️ COMPONENTE TEMPORÁRIO — importador único das apostas do mês (Google Sheets).
// A versão final do app NÃO terá importador. Para remover por completo:
//   1) apague este arquivo (BetsImport.tsx) e o betsSeed.ts;
//   2) no Bets.tsx, remova o import e a linha <BetsImport ... /> (marcados com "TEMP").
// É autocontido: renderiza o próprio botão e o modal.
import React, { useMemo, useState } from 'react';
import { Bet, Tipster } from '../types';
import { computeBet, fmtBRL } from '../finance';
import { BET_SEED, TIPSTER_UNIT_SUGGESTIONS } from './betsSeed';
import { Upload, X, Check } from 'lucide-react';

interface BetsImportProps {
  bets: Bet[];
  tipsters: Tipster[];
  onSaveBet: (b: Bet) => void;
  onSaveTipster: (t: Tipster) => void;
}

const toNum = (s: string | number) => { const n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; };
const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const round2 = (v: number) => Math.round(v * 100) / 100;
const sigOf = (date: string, tipster: string, stakeReais: number, odds: number, selection: string) =>
  `${(date || '').slice(0, 10)}|${norm(tipster)}|${Math.round(stakeReais)}|${odds}|${norm(selection || '')}`;

export const BetsImport: React.FC<BetsImportProps> = ({ bets, tipsters, onSaveBet, onSaveTipster }) => {
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [excludedTipsters, setExcludedTipsters] = useState<Set<string>>(new Set());

  const distinctTipsters = useMemo(() => Array.from(new Set(BET_SEED.map(b => b.tipster))).sort(), []);
  const countByTipster = useMemo(() => {
    const m: Record<string, number> = {};
    BET_SEED.forEach(b => { m[b.tipster] = (m[b.tipster] || 0) + 1; });
    return m;
  }, []);

  // Unidade exibida: edição do usuário > tipster já existente > sugestão da planilha > 1000
  const unitStr = (t: string) =>
    edited[t] ?? String(tipsters.find(x => x.name === t)?.unitValue ?? TIPSTER_UNIT_SUGGESTIONS[t] ?? 1000);
  const unitNum = (t: string) => toNum(unitStr(t));

  // Assinaturas das apostas já existentes (dedupe)
  const existingSig = useMemo(() => {
    const s = new Set<string>();
    bets.forEach(b => s.add(sigOf(b.date, b.tipster, (b.stakeUnits || 0) * (b.unitValue || 0), b.odds, b.selection || '')));
    return s;
  }, [bets]);

  const plan = useMemo(() => {
    const toImport = BET_SEED.filter(b =>
      !excludedTipsters.has(b.tipster) &&
      !existingSig.has(sigOf(b.date, b.tipster, b.stakeReais, b.odds, b.selection || ''))
    );
    const skipped = BET_SEED.filter(b => !excludedTipsters.has(b.tipster)).length - toImport.length;
    let invested = 0, pl = 0;
    toImport.forEach(b => {
      const u = unitNum(b.tipster);
      const c = computeBet({ result: b.result, stakeUnits: u > 0 ? b.stakeReais / u : 0, unitValue: u, odds: b.odds, cashoutValue: b.cashoutValue });
      if (!c.pending) { invested += c.stake; pl += c.pl; }
    });
    return { toImport, skipped, invested, pl };
  }, [excludedTipsters, existingSig, edited, tipsters]);

  const toggleTipster = (t: string) => setExcludedTipsters(prev => {
    const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n;
  });

  const apply = () => {
    if (plan.toImport.length === 0) { alert('Nada para importar (tudo desmarcado ou já existente).'); return; }
    if (!confirm(`Importar ${plan.toImport.length} apostas?\n\nTambém vou criar/atualizar os tipsters selecionados com o valor de unidade definido.`)) return;
    const now = new Date().toISOString();

    // 1) upsert dos tipsters incluídos (com a unidade definida)
    distinctTipsters.filter(t => !excludedTipsters.has(t)).forEach(t => {
      const unit = unitNum(t);
      const existing = tipsters.find(x => x.name === t);
      if (existing) {
        if (existing.unitValue !== unit) onSaveTipster({ ...existing, unitValue: unit });
      } else {
        onSaveTipster({ id: '', name: t, unitValue: unit, createdAt: now } as Tipster);
      }
    });

    // 2) cria as apostas
    plan.toImport.forEach(b => {
      const u = unitNum(b.tipster);
      onSaveBet({
        id: '', date: b.date, time: b.time, tipster: b.tipster,
        unitValue: u, stakeUnits: u > 0 ? round2(b.stakeReais / u) : 0,
        odds: b.odds, result: b.result, cashoutValue: b.cashoutValue,
        sport: b.sport, house: b.house, provider: b.provider,
        team1: b.team1, team2: b.team2, market: b.market, selection: b.selection,
        moment: b.moment, createdAt: now,
      } as Bet);
    });

    alert(`Importadas ${plan.toImport.length} apostas.${plan.skipped ? ` (${plan.skipped} já existiam e foram puladas.)` : ''}`);
    setOpen(false);
  };

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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Upload size={20} className="text-indigo-400" /> Importar apostas do Sheets</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-sm text-slate-400">
                Confirme o <span className="text-slate-200">valor da unidade</span> de cada tipster antes de importar — cada aposta guarda esse valor (snapshot).
                Desmarque um tipster para não importar as apostas dele.
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left w-8"></th>
                      <th className="px-3 py-2 text-left font-semibold">Tipster</th>
                      <th className="px-3 py-2 text-right font-semibold">Apostas</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor da unidade (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {distinctTipsters.map(t => {
                      const on = !excludedTipsters.has(t);
                      const known = tipsters.some(x => x.name === t);
                      return (
                        <tr key={t} className={on ? '' : 'opacity-40'}>
                          <td className="px-3 py-2"><input type="checkbox" checked={on} onChange={() => toggleTipster(t)} className="accent-indigo-500 w-4 h-4" /></td>
                          <td className="px-3 py-2 text-slate-100 font-medium whitespace-nowrap">
                            {t} {known && <span className="text-[9px] text-emerald-500/70 uppercase ml-1">existe</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-400 font-mono">{countByTipster[t]}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number" step="0.01"
                              value={unitStr(t)}
                              onChange={e => setEdited(prev => ({ ...prev, [t]: e.target.value }))}
                              className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-right font-mono text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                  <p className="text-[11px] text-slate-500">A importar</p>
                  <p className="text-lg font-bold text-white font-mono">{plan.toImport.length}</p>
                  {plan.skipped > 0 && <p className="text-[10px] text-slate-500">{plan.skipped} já existem</p>}
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
              <p className="text-[11px] text-slate-500">Rodar de novo é seguro: apostas idênticas (data + tipster + stake + odd + seleção) já importadas são puladas.</p>
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">
              <button onClick={apply} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Check size={18} /> Importar {plan.toImport.length} apostas
              </button>
              <button onClick={() => setOpen(false)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
