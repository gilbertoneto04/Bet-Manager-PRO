import React, { useState, useMemo, useEffect } from 'react';
import { Holder, Account, Transaction } from '../types';
import { summarize, fmtBRL } from '../finance';
import {
  Contact, Plus, Pencil, Trash2, X, Save, Mail, Phone, Search, User as UserIcon,
  BarChart3, TrendingDown, Wallet, Landmark, FileText
} from 'lucide-react';

interface HolderListProps {
  holders: Holder[];
  accounts: Account[];
  transactions: Transaction[];
  availableHouses: string[];
  onSaveHolder: (holder: Holder) => void;
  onDeleteHolder: (holderId: string) => void;
}

const emptyHolder = (): Partial<Holder> => ({ name: '', email: '', phone: '', notes: '' });

export const HolderList: React.FC<HolderListProps> = ({
  holders, accounts, transactions, onSaveHolder, onDeleteHolder
}) => {
  const [editing, setEditing] = useState<Partial<Holder> | null>(null);
  const [profile, setProfile] = useState<Holder | null>(null);
  const [search, setSearch] = useState('');

  // Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
        setProfile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return holders
      .filter(h =>
        h.name.toLowerCase().includes(term) ||
        (h.email || '').toLowerCase().includes(term) ||
        (h.phone || '').includes(search)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [holders, search]);

  // Transactions belonging to a holder (by holderId or via its accounts)
  const holderTransactions = (holderId: string) => {
    const accIds = new Set(accounts.filter(a => a.holderId === holderId).map(a => a.id));
    return transactions.filter(t => t.holderId === holderId || accIds.has(t.accountId));
  };

  const holderAccounts = (holderId: string) => accounts.filter(a => a.holderId === holderId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name || !editing.name.trim()) {
      alert('O nome do titular é obrigatório.');
      return;
    }
    onSaveHolder({
      id: editing.id || '',
      name: editing.name.trim(),
      email: (editing.email || '').trim(),
      phone: (editing.phone || '').trim(),
      notes: editing.notes || '',
      createdAt: editing.createdAt || new Date().toISOString()
    } as Holder);
    setEditing(null);
  };

  // ---- Profile stats ----
  const profileStats = useMemo(() => {
    if (!profile) return null;
    const accs = holderAccounts(profile.id);
    const txs = holderTransactions(profile.id);
    const global = summarize(txs);

    const totalPaid = accs.reduce((s, a) => s + (a.paidValue || 0), 0);
    const totalDeposited = global.deposited; // soma de todos os depósitos (inclui o inicial)
    const pendente = accs.reduce((s, a) => s + (a.pendingBalance || 0), 0);
    // Saldo presente inclui o saldo pendente nas casas.
    const saldoPresente = accs.reduce((s, a) => s + (a.currentBalance || 0) + (a.pendingBalance || 0), 0);
    const plPresente = saldoPresente - totalDeposited; // P/L = (saldo + pendente) − total depositado

    // Saldo presente e P/L por casa (saldo já inclui o pendente)
    const houses = new Set<string>([...accs.map(a => a.house), ...txs.map(t => t.house)]);
    const perHouse = Array.from(houses).map(house => {
      const hAccs = accs.filter(a => a.house === house);
      const hTxs = txs.filter(t => t.house === house);
      const saldo = hAccs.reduce((s, a) => s + (a.currentBalance || 0) + (a.pendingBalance || 0), 0);
      const pend = hAccs.reduce((s, a) => s + (a.pendingBalance || 0), 0);
      const deposited = summarize(hTxs).deposited;
      return { house, saldo, pend, deposited, pl: saldo - deposited };
    }).sort((a, b) => b.saldo - a.saldo);

    return { accs, txs, global, totalPaid, totalDeposited, saldoPresente, pendente, plPresente, perHouse };
  }, [profile, accounts, transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Contact className="text-indigo-400" /> Titulares
          </h2>
          <p className="text-slate-400 text-sm mt-1">Cadastro de titulares das contas (nome, e-mail e telefone)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setEditing(emptyHolder())}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus size={18} /> Novo Titular
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar titular..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(holder => {
          const accs = holderAccounts(holder.id);
          const deposited = summarize(holderTransactions(holder.id)).deposited;
          const pendente = accs.reduce((s, a) => s + (a.pendingBalance || 0), 0);
          // Saldo presente inclui o pendente das casas.
          const saldoPresente = accs.reduce((s, a) => s + (a.currentBalance || 0) + (a.pendingBalance || 0), 0);
          const plPresente = saldoPresente - deposited;
          return (
            <div
              key={holder.id}
              onClick={() => setProfile(holder)}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-5 shadow-sm transition-all group relative cursor-pointer"
            >
              <div className="absolute top-4 right-4 flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing({ ...holder }); }}
                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                  title="Editar titular"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteHolder(holder.id); }}
                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                  title="Excluir titular"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-300 border border-indigo-500/20 shrink-0 font-bold uppercase">
                  {holder.name.substring(0, 2)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-100 truncate">{holder.name}</h3>
                  <span className="text-[11px] text-slate-500">{accs.length} conta(s)</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-slate-400 bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail size={14} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{holder.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                  <Phone size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{holder.phone || '—'}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/50 grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                    <span className="text-slate-500">Saldo presente</span>
                    <span className="font-mono font-bold text-emerald-300">
                        {fmtBRL(saldoPresente)}
                    </span>
                    {pendente !== 0 && <span className="text-[10px] text-amber-400/80 font-mono">inclui {fmtBRL(pendente)} pend.</span>}
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-slate-500">P/L (saldo+pend − dep.)</span>
                    <span className={`font-mono font-bold ${plPresente >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtBRL(plPresente)}
                    </span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            Nenhum titular cadastrado. Clique em "Novo Titular" para começar.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {editing.id ? <Pencil size={20} className="text-indigo-400" /> : <Plus size={20} className="text-indigo-400" />}
                {editing.id ? 'Editar Titular' : 'Novo Titular'}
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Nome do Titular *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="text" required autoFocus
                    value={editing.name || ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
                  <input
                    type="text"
                    value={editing.email || ''}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    placeholder="exemplo@email.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={14} />
                  <input
                    type="text"
                    value={editing.phone || ''}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1"><FileText size={12} /> Observações</label>
                <textarea
                  rows={2}
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Save size={18} /> Salvar
                </button>
                <button type="button" onClick={() => setEditing(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profile && profileStats && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setProfile(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-800 shrink-0 relative">
              <button onClick={() => setProfile(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800/50 rounded-full"><X size={20} /></button>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 pr-8">
                <UserIcon className="text-indigo-400" /> {profile.name}
              </h3>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Mail size={13} className="text-indigo-400" /> {profile.email || '—'}</span>
                <span className="flex items-center gap-1"><Phone size={13} className="text-emerald-400" /> {profile.phone || '—'}</span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Wallet size={12} /> Saldo presente</p>
                  <p className="text-lg font-bold font-mono text-emerald-300">{fmtBRL(profileStats.saldoPresente)}</p>
                  {profileStats.pendente !== 0 && <p className="text-[10px] text-amber-400/80 font-mono mt-0.5">inclui {fmtBRL(profileStats.pendente)} pendente</p>}
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><TrendingDown size={12} /> Total depositado</p>
                  <p className="text-lg font-bold font-mono text-amber-400">{fmtBRL(profileStats.totalDeposited)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><BarChart3 size={12} /> P/L (saldo+pend − dep.)</p>
                  <p className={`text-lg font-bold font-mono ${profileStats.plPresente >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(profileStats.plPresente)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Landmark size={12} /> Pago nas contas</p>
                  <p className="text-lg font-bold font-mono text-slate-200">{fmtBRL(profileStats.totalPaid)}</p>
                </div>
              </div>

              {/* P/L por casa */}
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2"><Landmark size={16} className="text-indigo-400" /> Saldo &amp; P/L por Casa</h4>
                {profileStats.perHouse.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem dados financeiros para este titular ainda.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Casa</th>
                          <th className="text-right px-3 py-2">Depositado</th>
                          <th className="text-right px-3 py-2">Saldo presente</th>
                          <th className="text-right px-3 py-2">P/L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {profileStats.perHouse.map(h => (
                          <tr key={h.house} className="hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-slate-200">{h.house}</td>
                            <td className="px-3 py-2 text-right font-mono text-amber-400">{fmtBRL(h.deposited)}</td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-300">{fmtBRL(h.saldo)}{h.pend !== 0 && <span className="block text-[10px] text-amber-400/80">pend. {fmtBRL(h.pend)}</span>}</td>
                            <td className={`px-3 py-2 text-right font-mono font-bold ${h.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(h.pl)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Contas vinculadas */}
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2"><UserIcon size={16} className="text-indigo-400" /> Contas vinculadas ({profileStats.accs.length})</h4>
                {profileStats.accs.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma conta vinculada a este titular.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileStats.accs.map(a => (
                      <span key={a.id} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg">
                        {a.house} • {a.username || a.email || a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
