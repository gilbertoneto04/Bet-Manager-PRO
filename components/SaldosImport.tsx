// ⚠️ COMPONENTE TEMPORÁRIO — importador único dos saldos do Google Sheets.
// A versão final do app NÃO terá importador. Para remover por completo:
//   1) apague este arquivo (SaldosImport.tsx) e o saldosSeed.ts;
//   2) no Balances.tsx, remova o import e a linha <SaldosImport ... /> (marcados com "TEMP").
// É autocontido: renderiza o próprio botão e o modal.
import React, { useMemo, useState } from 'react';
import { Account, Bank, Holder } from '../types';
import { fmtBRL } from '../finance';
import { SALDOS_SEED, SaldoSeedRow } from './saldosSeed';
import { X, Upload, Plus, RefreshCw, Landmark, PiggyBank, Check } from 'lucide-react';

interface SaldosImportProps {
  accounts: Account[];
  banks: Bank[];
  holders: Holder[];
  onSaveAccount: (a: Account) => void;
  onSaveBank: (b: Bank) => void;
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

interface PlanItem {
  idx: number;
  row: SaldoSeedRow;
  mappedTitular: string;
  targetAccount?: Account;
  targetBank?: Bank;
  action: 'UPDATE' | 'CREATE';
}

export const SaldosImport: React.FC<SaldosImportProps> = ({ accounts, banks, holders, onSaveAccount, onSaveBank }) => {
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const holderName = (a: Account) => a.owner || holders.find(h => h.id === a.holderId)?.name || '';

  const plan = useMemo<PlanItem[]>(() => SALDOS_SEED.map((row, idx) => {
    const mappedTitular = row.titular;
    if (row.kind === 'ACCOUNT') {
      const targetAccount = accounts.find(a => norm(a.house) === norm(row.casa) && norm(holderName(a)) === norm(mappedTitular));
      return { idx, row, mappedTitular, targetAccount, action: targetAccount ? 'UPDATE' : 'CREATE' };
    }
    const targetBank = banks.find(b => norm(b.name) === norm(row.casa) && norm(b.note || '') === norm(row.titular || ''));
    return { idx, row, mappedTitular, targetBank, action: targetBank ? 'UPDATE' : 'CREATE' };
  }), [accounts, banks, holders]);

  const accountItems = plan.filter(p => p.row.kind === 'ACCOUNT');
  const bankItems = plan.filter(p => p.row.kind === 'BANK');
  const included = plan.filter(p => !excluded.has(p.idx));
  const counts = {
    accUpdate: included.filter(p => p.row.kind === 'ACCOUNT' && p.action === 'UPDATE').length,
    accCreate: included.filter(p => p.row.kind === 'ACCOUNT' && p.action === 'CREATE').length,
    bankUpdate: included.filter(p => p.row.kind === 'BANK' && p.action === 'UPDATE').length,
    bankCreate: included.filter(p => p.row.kind === 'BANK' && p.action === 'CREATE').length,
  };

  const toggle = (idx: number) => setExcluded(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  const apply = () => {
    if (included.length === 0) { alert('Selecione ao menos um item para importar.'); return; }
    if (!confirm(`Aplicar importação?\n\nContas: ${counts.accUpdate} atualizar, ${counts.accCreate} criar\nBancos: ${counts.bankUpdate} atualizar, ${counts.bankCreate} criar`)) return;
    const now = new Date().toISOString();
    included.forEach(({ row, mappedTitular, targetAccount, targetBank }) => {
      if (row.kind === 'ACCOUNT') {
        if (targetAccount) {
          onSaveAccount({ ...targetAccount, currentBalance: row.saldo, pendingBalance: row.pendente, balanceNote: row.nota || undefined, balanceUpdatedAt: now });
        } else {
          const holder = holders.find(h => norm(h.name) === norm(mappedTitular));
          onSaveAccount({
            id: '', name: mappedTitular || row.casa, email: '', house: row.casa,
            depositValue: 0, status: row.limitada ? 'LIMITED' : 'ACTIVE',
            owner: mappedTitular || undefined, holderId: holder?.id, tags: [],
            currentBalance: row.saldo, pendingBalance: row.pendente,
            balanceNote: row.nota || undefined, balanceUpdatedAt: now, createdAt: now,
          } as Account);
        }
      } else {
        if (targetBank) {
          onSaveBank({ ...targetBank, balance: row.saldo, pendingBalance: row.pendente, note: row.titular || targetBank.note });
        } else {
          onSaveBank({
            id: '', name: row.casa, kind: row.investment ? 'INVESTMENT' : 'BANK',
            note: row.titular || undefined, balance: row.saldo, pendingBalance: row.pendente, createdAt: now,
          } as Bank);
        }
      }
    });
    alert(`Importação aplicada: ${included.length} itens. Os saldos já aparecem na tela.`);
    setOpen(false);
  };

  const ActionBadge = ({ p }: { p: PlanItem }) => p.action === 'UPDATE' ? (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
      <RefreshCw size={10} /> Atualizar {p.targetAccount?.name || p.targetBank?.name}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
      <Plus size={10} /> Criar {p.row.kind === 'BANK' ? (p.row.investment ? 'investimento' : 'banco') : 'conta'}
    </span>
  );

  const Row = ({ p }: { p: PlanItem }) => {
    const on = !excluded.has(p.idx);
    return (
      <tr className={`border-t border-slate-800/70 ${on ? '' : 'opacity-40'}`}>
        <td className="px-3 py-2"><input type="checkbox" checked={on} onChange={() => toggle(p.idx)} className="accent-indigo-500 w-4 h-4" /></td>
        <td className="px-3 py-2 text-slate-100 font-medium whitespace-nowrap">{p.row.casa}</td>
        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
          {p.mappedTitular || (p.row.kind === 'BANK' ? (p.row.titular || '—') : '—')}
        </td>
        <td className="px-3 py-2 text-right font-mono text-slate-200 whitespace-nowrap">{fmtBRL(p.row.saldo)}</td>
        <td className="px-3 py-2 text-right font-mono text-amber-300 whitespace-nowrap">{p.row.pendente ? fmtBRL(p.row.pendente) : '—'}</td>
        <td className="px-3 py-2"><ActionBadge p={p} /></td>
      </tr>
    );
  };

  const Table = ({ items, icon: Icon, title }: { items: PlanItem[]; icon: any; title: string }) => (
    <div>
      <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2"><Icon size={15} className="text-indigo-400" /> {title} <span className="text-xs text-slate-500 font-normal">({items.length})</span></h4>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left w-8"></th>
              <th className="px-3 py-2 text-left font-semibold">{title === 'Bancos & Investimentos' ? 'Banco' : 'Casa'}</th>
              <th className="px-3 py-2 text-left font-semibold">{title === 'Bancos & Investimentos' ? 'Conta (PF/PJ)' : 'Titular'}</th>
              <th className="px-3 py-2 text-right font-semibold">Saldo</th>
              <th className="px-3 py-2 text-right font-semibold">Pendente</th>
              <th className="px-3 py-2 text-left font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>{items.map(p => <Row key={p.idx} p={p} />)}</tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        <Upload size={14} /> Importar do Sheets
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Upload size={20} className="text-indigo-400" /> Importar saldos do Sheets</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>

            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Contas: <span className="text-emerald-400">{counts.accUpdate} atualizar</span> · <span className="text-sky-400">{counts.accCreate} criar</span></span>
              <span>Bancos: <span className="text-emerald-400">{counts.bankUpdate} atualizar</span> · <span className="text-sky-400">{counts.bankCreate} criar</span></span>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              <Table items={accountItems} icon={Landmark} title="Casas de Aposta" />
              <Table items={bankItems} icon={PiggyBank} title="Bancos & Investimentos" />
              <p className="text-[11px] text-slate-500">
                "Atualizar" grava o saldo na conta/banco já existente. "Criar" cadastra um novo registro. Bancos não entram em Contas nem no P/L.
                Desmarque o que não quiser importar. Rodar de novo é seguro (atualiza em vez de duplicar).
              </p>
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">
              <button onClick={apply} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Check size={18} /> Aplicar importação ({included.length})
              </button>
              <button onClick={() => setOpen(false)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
