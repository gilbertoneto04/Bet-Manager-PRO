import React, { useMemo, useState } from 'react';
import { Account, Holder, Bank } from '../types';
import { fmtBRL } from '../finance';
import {
  Wallet, Landmark, Clock, PiggyBank, Search, Filter, Ban, RefreshCw, Building2,
  Contact, ArrowDownUp, Plus, Pencil, Trash2, X, Save, TrendingUp, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Eraser, AlertTriangle
} from 'lucide-react';
import { IMPORTED_ACCOUNT_TAG } from '../constants';
import { SaldosImport } from './SaldosImport'; // TEMP: importador do Sheets — remover na versão final

interface BalancesProps {
  accounts: Account[];
  holders: Holder[];
  banks: Bank[];
  onSaveAccount: (account: Account) => void;
  onSaveBank: (bank: Bank) => void;
  onDeleteBank: (bankId: string) => void;
  onDeleteAccount: (accountId: string, reason: string) => void;
  onPermanentDeleteAccount: (accountId: string) => void;
  onPurgeImportedAccounts: (accountIds: string[]) => void;
}

// Uma conta é "importada da planilha" (não cadastrada de verdade) quando tem a tag do
// importador OU quando não tem NENHum vestígio de cadastro real (sem login/senha/e-mail,
// sem depósito/pagamento, sem vínculo com pack ou tarefa). Só saldo/pendente = linha da planilha.
const isImportedAccount = (a: Account) =>
  (a.tags || []).includes(IMPORTED_ACCOUNT_TAG) ||
  !(a.packId || a.taskIdSource || a.username || a.password || (a.email && a.email.trim()) || a.depositValue || a.paidValue);

const ACCOUNT_STATUS_OPTIONS: { value: Account['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativa' },
  { value: 'LIMITED', label: 'Limitada' },
  { value: 'REPLACEMENT', label: 'Reposição' },
  { value: 'DELETED', label: 'Excluída' },
];

type StatusFilter = 'VISIBLE' | 'ACTIVE' | 'LIMITED' | 'REPLACEMENT' | 'DELETED' | 'ALL';
type SortKey = 'BALANCE_DESC' | 'BALANCE_ASC' | 'NAME' | 'HOUSE' | 'HOLDER' | 'UPDATED';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'VISIBLE', label: 'Todas (exceto excluídas)' },
  { value: 'ACTIVE', label: 'Apenas ativas' },
  { value: 'LIMITED', label: 'Apenas limitadas' },
  { value: 'REPLACEMENT', label: 'Apenas reposição' },
  { value: 'DELETED', label: 'Apenas excluídas' },
  { value: 'ALL', label: 'Todas (inclui excluídas)' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'BALANCE_DESC', label: 'Maior saldo' },
  { value: 'BALANCE_ASC', label: 'Menor saldo' },
  { value: 'NAME', label: 'Nome (A–Z)' },
  { value: 'HOUSE', label: 'Casa (A–Z)' },
  { value: 'HOLDER', label: 'Titular (A–Z)' },
  { value: 'UPDATED', label: 'Atualização recente' },
];

// Mesma identidade visual das casas usada no Quadro de Pendências
const getHouseStyles = (houseName: string) => {
  const normalized = (houseName || '').toLowerCase().replace(/\s/g, '');
  if (normalized.includes('betano')) return 'bg-orange-600 text-white border-orange-500/50';
  if (normalized.includes('bet365')) return 'bg-emerald-700 text-white border-emerald-600/50';
  if (normalized.includes('estrela')) return 'bg-yellow-400 text-blue-900 border-yellow-300/50 font-bold';
  if (normalized.includes('kto')) return 'bg-red-600 text-white border-red-500/50';
  if (normalized.includes('novibet')) return 'bg-cyan-900 text-white border-cyan-700/50';
  if (normalized.includes('stake')) return 'bg-slate-700 text-white border-slate-600/50';
  if (normalized.includes('sporting')) return 'bg-blue-600 text-white border-blue-500/50';
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

const toNum = (s: string | number) => {
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// Campo numérico com edição inline (estilo planilha): grava ao sair (blur) ou Enter
const InlineNumber: React.FC<{
  value: number | undefined;
  onCommit: (v: number) => void;
  className?: string;
}> = ({ value, onCommit, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value != null ? String(value) : '');
  return (
    <input
      type="number"
      step="0.01"
      value={display}
      placeholder="0,00"
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const v = toNum(draft);
          if (v !== (value ?? 0)) onCommit(v);
          setDraft(null);
        }
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className}
    />
  );
};

// Campo de texto com edição inline
const InlineText: React.FC<{
  value: string | undefined;
  onCommit: (v: string) => void;
  className?: string;
}> = ({ value, onCommit, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value ?? '');
  return (
    <input
      type="text"
      value={display}
      placeholder="—"
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const v = draft.trim();
          if (v !== (value ?? '')) onCommit(v);
          setDraft(null);
        }
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className}
    />
  );
};

const numInputClass =
  'w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-right font-mono text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none';
const noteInputClass =
  'w-36 bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-950 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

const emptyBank = (): Partial<Bank> => ({ name: '', kind: 'BANK', balance: 0, pendingBalance: 0, note: '', holderId: '', owner: '' });

export const Balances: React.FC<BalancesProps> = ({ accounts, holders, banks, onSaveAccount, onSaveBank, onDeleteBank, onDeleteAccount, onPermanentDeleteAccount, onPurgeImportedAccounts }) => {
  const [search, setSearch] = useState('');
  const [filterHouse, setFilterHouse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ACTIVE');
  const [sortBy, setSortBy] = useState<SortKey>('BALANCE_DESC');
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [groupBy, setGroupBy] = useState<'HOUSE' | 'HOLDER'>('HOUSE');
  const [bankModal, setBankModal] = useState<Partial<Bank> | null>(null);
  const [accountModal, setAccountModal] = useState<Account | null>(null);
  const [banksCollapsed, setBanksCollapsed] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Chave única por grupo (inclui o modo de agrupamento p/ não colidir Casa×Titular)
  const groupId = (key: string) => `${groupBy}:${key}`;
  const toggleGroup = (key: string) => setCollapsed(prev => { const n = new Set(prev); const id = groupId(key); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const holderName = (a: Account) =>
    a.owner || holders.find(h => h.id === a.holderId)?.name || '—';
  const bankHolderName = (b: Bank) =>
    b.owner || holders.find(h => h.id === b.holderId)?.name || '—';

  const houseOptions = useMemo(
    () => Array.from(new Set(accounts.filter(a => a.status !== 'DELETED').map(a => a.house))).sort(),
    [accounts]
  );

  // KPIs globais de patrimônio (contas não excluídas + bancos), independentes dos filtros
  const totals = useMemo(() => {
    const live = accounts.filter(a => a.status !== 'DELETED');
    const casasSaldo = live.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const casasPend = live.reduce((s, a) => s + (a.pendingBalance || 0), 0);
    const banksSaldo = banks.reduce((s, b) => s + (b.balance || 0), 0);
    const banksPend = banks.reduce((s, b) => s + (b.pendingBalance || 0), 0);
    return {
      casas: casasSaldo + casasPend,
      bancos: banksSaldo + banksPend,
      pendente: casasPend + banksPend,
      patrimonio: casasSaldo + casasPend + banksSaldo + banksPend,
    };
  }, [accounts, banks]);

  // Lista de contas exibida: status -> busca -> casa -> ordenação
  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = accounts.filter(a => {
      if (filterStatus === 'VISIBLE') { if (a.status === 'DELETED') return false; }
      else if (filterStatus !== 'ALL') { if (a.status !== filterStatus) return false; }
      if (filterHouse !== 'ALL' && a.house !== filterHouse) return false;
      if (onlyWithBalance && ((a.currentBalance || 0) + (a.pendingBalance || 0)) <= 0) return false;
      if (term) {
        return a.name.toLowerCase().includes(term) ||
          a.house.toLowerCase().includes(term) ||
          holderName(a).toLowerCase().includes(term);
      }
      return true;
    });
    const bal = (a: Account) => (a.currentBalance || 0) + (a.pendingBalance || 0);
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'BALANCE_DESC': return bal(b) - bal(a);
        case 'BALANCE_ASC': return bal(a) - bal(b);
        case 'NAME': return a.name.localeCompare(b.name);
        case 'HOUSE': return a.house.localeCompare(b.house);
        case 'HOLDER': return holderName(a).localeCompare(holderName(b));
        case 'UPDATED': return new Date(b.balanceUpdatedAt || 0).getTime() - new Date(a.balanceUpdatedAt || 0).getTime();
        default: return 0;
      }
    });
    return list;
  }, [accounts, search, filterHouse, filterStatus, sortBy, onlyWithBalance, holders]);

  // Agrupamento por Casa ou Titular, com subtotal por grupo
  const groups = useMemo(() => {
    const map = new Map<string, Account[]>();
    filteredAccounts.forEach(a => {
      const key = groupBy === 'HOUSE' ? a.house : holderName(a);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries())
      .map(([key, list]) => {
        const saldo = list.reduce((s, a) => s + (a.currentBalance || 0), 0);
        const pendente = list.reduce((s, a) => s + (a.pendingBalance || 0), 0);
        return { key, list, saldo, pendente, total: saldo + pendente };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredAccounts, groupBy, holders]);

  // Bancos & investimentos (respeita apenas a busca)
  const filteredBanks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = banks.filter(b =>
      !term ||
      b.name.toLowerCase().includes(term) ||
      bankHolderName(b).toLowerCase().includes(term) ||
      (b.note || '').toLowerCase().includes(term)
    );
    return [...list].sort((a, b) => (b.balance + (b.pendingBalance || 0)) - (a.balance + (a.pendingBalance || 0)));
  }, [banks, search, holders]);

  const banksTotal = useMemo(
    () => filteredBanks.reduce((s, b) => s + (b.balance || 0) + (b.pendingBalance || 0), 0),
    [filteredBanks]
  );

  // Contas que vieram da planilha e não são cadastros reais — alvo do "Limpar importados".
  const importedAccounts = useMemo(() => accounts.filter(isImportedAccount), [accounts]);

  const saveBankFromModal = () => {
    if (!bankModal) return;
    if (!bankModal.name || !bankModal.name.trim()) { alert('Informe o nome do banco/investimento.'); return; }
    const linkedHolder = holders.find(h => h.id === bankModal.holderId);
    onSaveBank({
      id: bankModal.id || '',
      name: bankModal.name.trim(),
      kind: (bankModal.kind as Bank['kind']) || 'BANK',
      holderId: bankModal.holderId || undefined,
      owner: linkedHolder?.name || undefined,
      balance: Number(bankModal.balance) || 0,
      pendingBalance: Number(bankModal.pendingBalance) || 0,
      note: (bankModal.note || '').trim() || undefined,
      createdAt: bankModal.createdAt || new Date().toISOString(),
    } as Bank);
    setBankModal(null);
  };

  const saveAccountFromModal = () => {
    if (!accountModal) return;
    if (!accountModal.name || !accountModal.name.trim()) { alert('Informe o nome da conta.'); return; }
    if (!accountModal.house || !accountModal.house.trim()) { alert('Informe a casa.'); return; }
    onSaveAccount({
      ...accountModal,
      name: accountModal.name.trim(),
      house: accountModal.house.trim(),
      owner: accountModal.owner?.trim() || undefined,
      status: accountModal.status || 'ACTIVE',
      currentBalance: Number(accountModal.currentBalance) || 0,
      pendingBalance: Number(accountModal.pendingBalance) || 0,
      balanceNote: accountModal.balanceNote?.trim() || undefined,
      balanceUpdatedAt: new Date().toISOString(),
    });
    setAccountModal(null);
  };

  const deleteAccount = (a: Account) => {
    // Conta importada da planilha (não cadastrada) -> apaga de vez, NÃO vai para "Excluídas".
    if (isImportedAccount(a)) {
      onPermanentDeleteAccount(a.id); // já pede confirmação
      return;
    }
    // Conta cadastrada de verdade -> soft delete (vai para "Excluídas" com motivo).
    const reason = prompt(`Excluir a conta "${a.name}" (${a.house})?\n\nA conta vai para "Excluídas" (não é apagada de vez). Informe o motivo:`, '');
    if (reason === null) return; // cancelou
    onDeleteAccount(a.id, reason.trim());
  };

  const purgeImported = () => {
    if (!importedAccounts.length) return;
    onPurgeImportedAccounts(importedAccounts.map(a => a.id));
    setPurgeOpen(false);
  };

  const SummaryCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
        <p className="text-lg font-bold text-white font-mono truncate">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Saldos / Patrimônio</h2>
          <p className="text-slate-400 text-sm mt-1">Controle do saldo atual em cada casa e banco</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TEMP: importador do Sheets — remover na versão final (apague só esta linha) */}
          <SaldosImport accounts={accounts} banks={banks} holders={holders} onSaveAccount={onSaveAccount} onSaveBank={onSaveBank} />
          {importedAccounts.length > 0 && (
            <button
              onClick={() => setPurgeOpen(true)}
              title="Remover as contas que vieram da planilha e não são cadastradas na plataforma"
              className="flex items-center gap-1.5 bg-red-950/40 border border-red-900/50 hover:bg-red-900/40 text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              <Eraser size={14} /> Limpar importados ({importedAccounts.length})
            </button>
          )}
          <button
            onClick={() => { const allCollapsed = groups.length > 0 && groups.every(g => collapsed.has(groupId(g.key))); setCollapsed(allCollapsed ? new Set() : new Set(groups.map(g => groupId(g.key)))); }}
            title="Expandir / minimizar todos"
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            {groups.length > 0 && groups.every(g => collapsed.has(groupId(g.key))) ? <><ChevronsUpDown size={14} /> Expandir tudo</> : <><ChevronsDownUp size={14} /> Minimizar tudo</>}
          </button>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setGroupBy('HOUSE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${groupBy === 'HOUSE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Building2 size={14} /> Por Casa
            </button>
            <button
              onClick={() => setGroupBy('HOLDER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${groupBy === 'HOLDER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Contact size={14} /> Por Titular
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Wallet} label="Patrimônio Total" value={fmtBRL(totals.patrimonio)} accent="bg-indigo-500/10 text-indigo-400" />
        <SummaryCard icon={Landmark} label="Em Casas de Aposta" value={fmtBRL(totals.casas)} accent="bg-emerald-500/10 text-emerald-400" />
        <SummaryCard icon={PiggyBank} label="Bancos & Investimentos" value={fmtBRL(totals.bancos)} accent="bg-sky-500/10 text-sky-400" />
        <SummaryCard icon={Clock} label="Pendente" value={fmtBRL(totals.pendente)} accent="bg-amber-500/10 text-amber-400" />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium shrink-0">
          <Filter size={16} /> Filtros:
        </div>
        <div className="relative flex-1 lg:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conta, casa ou titular..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as StatusFilter)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterHouse}
          onChange={e => setFilterHouse(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="ALL">Todas as Casas</option>
          {houseOptions.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <div className="relative">
          <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => setOnlyWithBalance(v => !v)}
          title="Mostrar apenas contas com saldo maior que zero"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${onlyWithBalance ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'}`}
        >
          <Wallet size={14} /> Apenas com saldo
        </button>
      </div>

      {/* Bancos & Investimentos (primeiro da lista) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className={`flex items-center justify-between gap-3 px-5 py-3 ${banksCollapsed ? '' : 'border-b border-slate-800'} bg-slate-950/50`}>
          <button onClick={() => setBanksCollapsed(v => !v)} className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity" title={banksCollapsed ? 'Expandir' : 'Minimizar'}>
            {banksCollapsed ? <ChevronRight size={16} className="text-slate-500 shrink-0" /> : <ChevronDown size={16} className="text-slate-500 shrink-0" />}
            <PiggyBank size={18} className="text-sky-400 shrink-0" />
            <h3 className="text-sm font-bold text-white">Bancos &amp; Investimentos</h3>
            <span className="text-xs text-slate-500">{filteredBanks.length} {filteredBanks.length === 1 ? 'registro' : 'registros'}</span>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-bold text-white font-mono">{fmtBRL(banksTotal)}</span>
            <button
              onClick={() => setBankModal(emptyBank())}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {!banksCollapsed && (filteredBanks.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">
            Nenhum banco ou investimento cadastrado. Use “Adicionar” para registrar (apenas controle — não entra no P/L).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70">
                <tr>
                  <th className="text-left font-semibold px-5 py-2">Banco / Investimento</th>
                  <th className="text-left font-semibold px-3 py-2">Titular</th>
                  <th className="text-left font-semibold px-3 py-2">Tipo</th>
                  <th className="text-right font-semibold px-3 py-2">Saldo (R$)</th>
                  <th className="text-right font-semibold px-3 py-2">Pendente (R$)</th>
                  <th className="text-left font-semibold px-3 py-2">Observação</th>
                  <th className="text-right font-semibold px-5 py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredBanks.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-2.5 text-slate-100 font-medium whitespace-nowrap">{b.name}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{bankHolderName(b)}</td>
                    <td className="px-3 py-2.5">
                      {b.kind === 'INVESTMENT' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full"><TrendingUp size={10} /> Investimento</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full"><Landmark size={10} /> Banco</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <InlineNumber
                        value={b.balance}
                        onCommit={(v) => onSaveBank({ ...b, balance: v })}
                        className={numInputClass}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <InlineNumber
                        value={b.pendingBalance}
                        onCommit={(v) => onSaveBank({ ...b, pendingBalance: v })}
                        className={`${numInputClass} text-amber-300`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{b.note || '—'}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setBankModal({ ...b })} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => onDeleteBank(b.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Grupos de contas */}
      {groups.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 text-slate-500">
            <Wallet size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-300">Nenhuma conta encontrada</h3>
          <p className="text-slate-500 text-sm">Cadastre contas ou ajuste os filtros para ver os saldos.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => {
            const isCollapsed = collapsed.has(groupId(group.key));
            return (
            <div key={group.key} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleGroup(group.key)} className={`w-full flex items-center justify-between gap-3 px-5 py-3 ${isCollapsed ? '' : 'border-b border-slate-800'} bg-slate-950/50 hover:bg-slate-900/80 transition-colors text-left`}>
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? <ChevronRight size={16} className="text-slate-500 shrink-0" /> : <ChevronDown size={16} className="text-slate-500 shrink-0" />}
                  {groupBy === 'HOUSE' ? (
                    <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide border font-bold ${getHouseStyles(group.key)}`}>
                      {group.key}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-200 font-semibold text-sm">
                      <Contact size={15} className="text-indigo-400" /> {group.key}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{group.list.length} {group.list.length === 1 ? 'conta' : 'contas'}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white font-mono">{fmtBRL(group.total)}</p>
                  {group.pendente !== 0 && (
                    <p className="text-[10px] text-amber-400 font-mono">pendente {fmtBRL(group.pendente)}</p>
                  )}
                </div>
              </button>

              {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/70">
                    <tr>
                      <th className="text-left font-semibold px-5 py-2">Conta</th>
                      {groupBy === 'HOUSE'
                        ? <th className="text-left font-semibold px-3 py-2">Titular</th>
                        : <th className="text-left font-semibold px-3 py-2">Casa</th>}
                      <th className="text-left font-semibold px-3 py-2">Status</th>
                      <th className="text-right font-semibold px-3 py-2">Saldo (R$)</th>
                      <th className="text-right font-semibold px-3 py-2">Pendente (R$)</th>
                      <th className="text-left font-semibold px-3 py-2">Observação</th>
                      <th className="text-right font-semibold px-3 py-2">Atualizado</th>
                      <th className="text-right font-semibold px-5 py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {group.list.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-2.5 text-slate-100 font-medium whitespace-nowrap">{a.name}</td>
                        {groupBy === 'HOUSE'
                          ? <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{holderName(a)}</td>
                          : <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border font-bold ${getHouseStyles(a.house)}`}>{a.house}</span>
                            </td>}
                        <td className="px-3 py-2.5">
                          {a.status === 'LIMITED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full"><Ban size={10} /> Limitada</span>
                          ) : a.status === 'REPLACEMENT' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><RefreshCw size={10} /> Reposição</span>
                          ) : a.status === 'DELETED' ? (
                            <span className="text-[10px] text-slate-500">Excluída</span>
                          ) : (
                            <span className="text-[10px] text-emerald-400/80">Ativa</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <InlineNumber
                            value={a.currentBalance}
                            onCommit={(v) => onSaveAccount({ ...a, currentBalance: v, balanceUpdatedAt: new Date().toISOString() })}
                            className={numInputClass}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <InlineNumber
                            value={a.pendingBalance}
                            onCommit={(v) => onSaveAccount({ ...a, pendingBalance: v, balanceUpdatedAt: new Date().toISOString() })}
                            className={`${numInputClass} text-amber-300`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <InlineText
                            value={a.balanceNote}
                            onCommit={(v) => onSaveAccount({ ...a, balanceNote: v || undefined, balanceUpdatedAt: new Date().toISOString() })}
                            className={noteInputClass}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right text-[10px] text-slate-500 whitespace-nowrap">
                          {a.balanceUpdatedAt ? new Date(a.balanceUpdatedAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setAccountModal({ ...a })} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Editar conta"><Pencil size={14} /></button>
                            {a.status !== 'DELETED' && (
                              <button onClick={() => deleteAccount(a)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Excluir conta"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-600 text-center pt-1">
        Edite <span className="text-slate-400">Saldo</span> e <span className="text-slate-400">Pendente</span> direto na tabela — salva automaticamente. Bancos &amp; investimentos são só para controle e não entram no P/L.
      </p>

      {/* Modal Banco / Investimento */}
      {bankModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setBankModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PiggyBank size={20} className="text-sky-400" />
                {bankModal.id ? 'Editar Banco / Investimento' : 'Novo Banco / Investimento'}
              </h3>
              <button onClick={() => setBankModal(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Nome *</label>
                <input
                  type="text" autoFocus
                  value={bankModal.name || ''}
                  onChange={e => setBankModal({ ...bankModal, name: e.target.value })}
                  placeholder="Ex: Nubank, Sicredi, Broker"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Titular (opcional)</label>
                <select
                  value={bankModal.holderId || ''}
                  onChange={e => setBankModal({ ...bankModal, holderId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="">Sem titular</option>
                  {holders.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Saldo (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={bankModal.balance ?? 0}
                    onChange={e => setBankModal({ ...bankModal, balance: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Pendente (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={bankModal.pendingBalance ?? 0}
                    onChange={e => setBankModal({ ...bankModal, pendingBalance: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Observação</label>
                <input
                  type="text"
                  value={bankModal.note || ''}
                  onChange={e => setBankModal({ ...bankModal, note: e.target.value })}
                  placeholder="Ex.: PF, PJ, CAIXINHA..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button onClick={saveBankFromModal} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Save size={18} /> Salvar
                </button>
                <button onClick={() => setBankModal(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conta */}
      {accountModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setAccountModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet size={20} className="text-indigo-400" /> Editar Conta
              </h3>
              <button onClick={() => setAccountModal(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Nome da conta *</label>
                <input
                  type="text" autoFocus
                  value={accountModal.name || ''}
                  onChange={e => setAccountModal({ ...accountModal, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Casa *</label>
                  <input
                    type="text" list="balances-house-options"
                    value={accountModal.house || ''}
                    onChange={e => setAccountModal({ ...accountModal, house: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <datalist id="balances-house-options">
                    {houseOptions.map(h => <option key={h} value={h} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Titular</label>
                  <input
                    type="text"
                    value={accountModal.owner || ''}
                    onChange={e => setAccountModal({ ...accountModal, owner: e.target.value })}
                    placeholder="—"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Status</label>
                <select
                  value={accountModal.status || 'ACTIVE'}
                  onChange={e => setAccountModal({ ...accountModal, status: e.target.value as Account['status'] })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {ACCOUNT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Saldo (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={accountModal.currentBalance ?? 0}
                    onChange={e => setAccountModal({ ...accountModal, currentBalance: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Pendente (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={accountModal.pendingBalance ?? 0}
                    onChange={e => setAccountModal({ ...accountModal, pendingBalance: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Observação</label>
                <input
                  type="text"
                  value={accountModal.balanceNote || ''}
                  onChange={e => setAccountModal({ ...accountModal, balanceNote: e.target.value })}
                  placeholder="Ex.: Sacar, Depositar, Conta bloqueada..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button onClick={saveAccountFromModal} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Save size={18} /> Salvar
                </button>
                <button onClick={() => setAccountModal(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Limpar importados */}
      {purgeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setPurgeOpen(false)}>
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" /> Limpar contas importadas
              </h3>
              <button onClick={() => setPurgeOpen(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <p className="text-sm text-slate-300">
                Isso vai <span className="text-red-300 font-semibold">apagar de vez</span> as{' '}
                <span className="text-white font-semibold">{importedAccounts.length}</span>{' '}
                {importedAccounts.length === 1 ? 'conta' : 'contas'} abaixo — as que vieram da planilha e{' '}
                <span className="text-slate-100">não são cadastradas na plataforma</span>. Elas{' '}
                <span className="text-slate-100">não vão para "Excluídas"</span>. Bancos &amp; investimentos e contas cadastradas <span className="text-slate-100">não são afetados</span>.
              </p>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/70">
                  {importedAccounts.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="text-slate-100 font-medium">{a.name}</span>
                        <span className="text-slate-500"> · {a.house}{holderName(a) !== '—' ? ` · ${holderName(a)}` : ''}</span>
                      </div>
                      <span className="font-mono text-slate-300 shrink-0">{fmtBRL((a.currentBalance || 0) + (a.pendingBalance || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Essa ação não pode ser desfeita.</p>
            </div>
            <div className="p-6 border-t border-slate-800 flex gap-3 shrink-0">
              <button onClick={purgeImported} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Eraser size={18} /> Apagar {importedAccounts.length} {importedAccounts.length === 1 ? 'conta' : 'contas'}
              </button>
              <button onClick={() => setPurgeOpen(false)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
