import React, { useState, useMemo, useEffect } from 'react';
import { Account, Pack, PixKey, User, LogEntry } from '../types';
import { Ban, DollarSign, User as UserIcon, Mail, AlertTriangle, Search, Plus, Pencil, Save, X, CreditCard, RefreshCw, Package, Tag, Landmark, RotateCcw, Trash2, Info, Calendar } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  type: 'ACTIVE' | 'LIMITED' | 'REPLACEMENT' | 'DELETED';
  packs: Pack[];
  pixKeys: PixKey[];
  currentUser: User | null;
  onLimit?: (accountId: string, createWithdrawal: boolean, pixInfo?: string) => void;
  onReplacement?: (accountId: string, createWithdrawal: boolean, pixInfo?: string) => void;
  onWithdraw?: (accountId: string, pixInfo?: string) => void;
  onReactivate?: (accountId: string) => void;
  onDelete?: (accountId: string, reason: string) => void;
  onSave?: (account: Account, packIdToDeduct?: string) => void;
  availableHouses: string[];
  logs?: LogEntry[]; // Passed for history Modal
}

// Extracted Component to prevent re-render focus loss
const PixSelectionSection: React.FC<{
    mode: 'SAVED' | 'NEW' | 'NONE';
    setMode: (m: 'SAVED' | 'NEW' | 'NONE') => void;
    selectedId: string;
    setSelectedId: (id: string) => void;
    newString: string;
    setNewString: (s: string) => void;
    pixKeys: PixKey[];
}> = ({ mode, setMode, selectedId, setSelectedId, newString, setNewString, pixKeys }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4 animate-fadeIn">
        <label className="text-sm text-slate-400 block mb-2">Destino do Saque (Opcional)</label>
        <div className="flex gap-2 mb-3">
            <button 
                onClick={() => setMode('SAVED')}
                className={`flex-1 py-2 text-xs rounded-lg border ${mode === 'SAVED' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
            >
                Chave Salva
            </button>
            <button 
                onClick={() => setMode('NEW')}
                className={`flex-1 py-2 text-xs rounded-lg border ${mode === 'NEW' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
            >
                Nova / Manual
            </button>
        </div>

        {mode === 'SAVED' && (
            <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            >
                <option value="">Selecione uma chave...</option>
                {pixKeys.map(k => (
                    <option key={k.id} value={k.id}>{k.name} - {k.bank} ({k.key})</option>
                ))}
            </select>
        )}

        {mode === 'NEW' && (
            <input 
                type="text"
                value={newString}
                onChange={(e) => setNewString(e.target.value)}
                placeholder="Digite a chave Pix (CPF, Email, etc)..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            />
        )}
    </div>
);


export const AccountList: React.FC<AccountListProps> = ({ accounts, type, packs, pixKeys, currentUser, onLimit, onReplacement, onWithdraw, onReactivate, onDelete, onSave, availableHouses, logs }) => {
  const [selectedAccountForLimit, setSelectedAccountForLimit] = useState<Account | null>(null);
  const [selectedAccountForReplacement, setSelectedAccountForReplacement] = useState<Account | null>(null);
  const [selectedAccountForWithdrawal, setSelectedAccountForWithdrawal] = useState<Account | null>(null);
  const [selectedAccountForDeletion, setSelectedAccountForDeletion] = useState<Account | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null); // For history modal
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null); // For details modal
  
  // Withdrawal Logic (Pix Selection)
  const [pixSelectionMode, setPixSelectionMode] = useState<'SAVED' | 'NEW' | 'NONE'>('SAVED');
  const [selectedPixId, setSelectedPixId] = useState('');
  const [newPixString, setNewPixString] = useState('');

  // New Account Pack Logic
  const [usePack, setUsePack] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string>('');

  // Editing Tags Logic
  const [tagInput, setTagInput] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [houseFilter, setHouseFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE' | 'NAME' | 'BALANCE'>('DATE');

  // Auto-select default key when modal opens
  useEffect(() => {
    if (selectedAccountForLimit || selectedAccountForReplacement || selectedAccountForWithdrawal) {
        if (currentUser?.defaultPixKeyId) {
            setPixSelectionMode('SAVED');
            setSelectedPixId(currentUser.defaultPixKeyId);
        } else {
            setPixSelectionMode('SAVED');
            setSelectedPixId('');
        }
    }
  }, [selectedAccountForLimit, selectedAccountForReplacement, selectedAccountForWithdrawal, currentUser]);

  const getTitle = () => {
      if (type === 'ACTIVE') return 'Contas em Uso';
      if (type === 'LIMITED') return 'Contas Limitadas';
      if (type === 'DELETED') return 'Contas Excluídas';
      return 'Contas em Reposição';
  };

  const getSubtitle = () => {
      if (type === 'ACTIVE') return 'Gerencie as contas ativas na operação';
      if (type === 'LIMITED') return 'Histórico de contas limitadas';
      if (type === 'DELETED') return 'Contas removidas do sistema (Lixeira)';
      return 'Contas defeituosas aguardando reposição';
  };

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(acc => {
        const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (acc.owner && acc.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
                              (acc.tags && acc.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesHouse = houseFilter === 'ALL' || acc.house === houseFilter;
        return matchesSearch && matchesHouse;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        if (sortBy === 'BALANCE') return b.depositValue - a.depositValue;
        // Prioritize updatedAt for sorting if available to show recently modified on top
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
        return timeB - timeA;
      });
  }, [accounts, searchTerm, houseFilter, sortBy]);

  const resetModals = () => {
      setSelectedAccountForLimit(null);
      setSelectedAccountForReplacement(null);
      setSelectedAccountForWithdrawal(null);
      setSelectedAccountForDeletion(null);
      setDeletionReason('');
      setPixSelectionMode('SAVED');
      setSelectedPixId('');
      setNewPixString('');
  };

  const getPixInfoString = () => {
      if (pixSelectionMode === 'NONE') return undefined;
      if (pixSelectionMode === 'NEW') return `Chave Pix (Manual): ${newPixString}`;
      if (pixSelectionMode === 'SAVED') {
          const key = pixKeys.find(k => k.id === selectedPixId);
          return key ? `Chave Pix (${key.name} - ${key.bank}): ${key.key}` : undefined;
      }
      return undefined;
  };

  const handleLimitClick = (e: React.MouseEvent, account: Account) => { e.stopPropagation(); setSelectedAccountForLimit(account); };
  const handleReplacementClick = (e: React.MouseEvent, account: Account) => { e.stopPropagation(); setSelectedAccountForReplacement(account); };
  const handleWithdrawalClick = (e: React.MouseEvent, account: Account) => { e.stopPropagation(); setSelectedAccountForWithdrawal(account); };
  const handleDeleteClick = (e: React.MouseEvent, account: Account) => { e.stopPropagation(); setSelectedAccountForDeletion(account); setDeletionReason(''); };
  const handleEditClick = (e: React.MouseEvent, account: Account) => { e.stopPropagation(); setEditingAccount({ ...account, tags: account.tags || [] }); };
  const handleHistoryClick = (e: React.MouseEvent, account: Account) => { e.stopPropagation(); setHistoryAccount(account); };
  const handleReactivateClick = (e: React.MouseEvent, account: Account) => {
      e.stopPropagation();
      const msg = type === 'DELETED' 
        ? `Deseja restaurar a conta ${account.name} (será movida para ATIVAS)?`
        : `Deseja mover a conta ${account.name} de volta para as ATIVAS?`;
        
      if(confirm(msg) && onReactivate) {
          onReactivate(account.id);
      }
  };

  const confirmLimit = (createWithdrawal: boolean) => {
    if (selectedAccountForLimit && onLimit) {
      onLimit(selectedAccountForLimit.id, createWithdrawal, createWithdrawal ? getPixInfoString() : undefined);
      resetModals();
    }
  };

  const confirmReplacement = (createWithdrawal: boolean) => {
     if (selectedAccountForReplacement && onReplacement) {
        onReplacement(selectedAccountForReplacement.id, createWithdrawal, createWithdrawal ? getPixInfoString() : undefined);
        resetModals();
     }
  };
  
  const confirmWithdrawal = () => {
      if (selectedAccountForWithdrawal && onWithdraw) {
          onWithdraw(selectedAccountForWithdrawal.id, getPixInfoString());
          resetModals();
      }
  };

  const confirmDeletion = () => {
      if (selectedAccountForDeletion && onDelete) {
          onDelete(selectedAccountForDeletion.id, deletionReason);
          resetModals();
      }
  };
  
  const handleNew = () => {
    setEditingAccount({
      name: '',
      email: '',
      house: availableHouses[0] || '',
      depositValue: 0,
      password: '',
      card: '',
      status: type !== 'DELETED' ? type : 'ACTIVE', // Default status is current tab type (unless deleted)
      tags: [],
      owner: currentUser?.name || '' // Default owner is current user
    });
    setUsePack(false); 
    setSelectedPackId('');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim() && editingAccount) {
          e.preventDefault();
          const newTags = [...(editingAccount.tags || []), tagInput.trim()];
          setEditingAccount({ ...editingAccount, tags: newTags });
          setTagInput('');
      }
  };

  const removeTag = (idx: number) => {
      if (editingAccount && editingAccount.tags) {
          const newTags = editingAccount.tags.filter((_, i) => i !== idx);
          setEditingAccount({ ...editingAccount, tags: newTags });
      }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount && onSave) {
      if (!editingAccount.name || !editingAccount.house) {
        alert("Nome e Casa são obrigatórios.");
        return;
      }
      onSave(
          editingAccount as Account, 
          (!editingAccount.id && usePack && selectedPackId) ? selectedPackId : undefined
      );
      setEditingAccount(null);
    }
  };

  // UPDATED: Show 'updatedAt' if available as the primary timestamp
  const getDateLabel = (acc: Account) => {
      if (acc.updatedAt) return `Atualizado: ${new Date(acc.updatedAt).toLocaleDateString()} ${new Date(acc.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      if (type === 'ACTIVE') return `Registro: ${new Date(acc.createdAt).toLocaleDateString()}`;
      if (type === 'LIMITED' && acc.limitedAt) return `Limitada: ${new Date(acc.limitedAt).toLocaleDateString()}`;
      if (type === 'REPLACEMENT' && acc.replacementAt) return `Reposição: ${new Date(acc.replacementAt).toLocaleDateString()}`;
      if (type === 'DELETED') return `Excluída: ${new Date(acc.createdAt).toLocaleDateString()}`;
      return `Registro: ${new Date(acc.createdAt).toLocaleDateString()}`;
  };

  const getFilteredLogs = (accId: string, accName: string) => {
      if (!logs) return [];
      return logs.filter(l => 
          (l.taskDescription && l.taskDescription.includes(accName)) || 
          (l.taskId === accId) 
      ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
          <p className="text-slate-400 text-sm mt-1">{getSubtitle()}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {(type === 'ACTIVE' || type === 'LIMITED') && (
             <button onClick={handleNew} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
                <Plus size={18} />
                {type === 'ACTIVE' ? 'Nova Conta' : 'Add Limitada'}
             </button>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Buscar por nome, dono, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>

          <select 
            value={houseFilter} 
            onChange={(e) => setHouseFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todas as Casas</option>
            {availableHouses.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="DATE">Recentes</option>
            <option value="NAME">Nome (A-Z)</option>
            <option value="BALANCE">Maior Saldo</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAccounts.map(account => (
          <div 
            key={account.id} 
            onClick={() => setViewingAccount(account)}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-indigo-500/30 transition-all group relative cursor-pointer"
          >
             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                    onClick={(e) => handleHistoryClick(e, account)} 
                    className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                    title="Ver Histórico"
                >
                    <Info size={14} />
                </button>

                {type !== 'DELETED' && onDelete && (
                    <button 
                        onClick={(e) => handleDeleteClick(e, account)} 
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700"
                        title="Excluir Conta"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
                
                {/* DELETED TAB ACTIONS */}
                {type === 'DELETED' && (
                    <>
                        {onReactivate && (
                            <button 
                                onClick={(e) => handleReactivateClick(e, account)}
                                className="p-1.5 bg-slate-800 text-blue-500 hover:text-blue-400 rounded-lg border border-slate-700"
                                title="Restaurar Conta"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(account.id, ""); // Permanent delete trigger
                                }} 
                                className="p-1.5 bg-slate-800 text-red-500 hover:text-red-400 rounded-lg border border-slate-700"
                                title="Excluir Permanentemente"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </>
                )}

                {onSave && type !== 'DELETED' && (
                   <button onClick={(e) => handleEditClick(e, account)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700" title="Editar">
                     <Pencil size={14} />
                   </button>
                )}
                
                {/* Actions for LIMITED tab */}
                {type === 'LIMITED' && (
                    <>
                        {onWithdraw && (
                            <button 
                                onClick={(e) => handleWithdrawalClick(e, account)} 
                                className="p-1.5 bg-slate-800 text-emerald-500 hover:text-emerald-400 rounded-lg border border-slate-700"
                                title="Solicitar Saque"
                            >
                                <DollarSign size={14} />
                            </button>
                        )}
                        {onReactivate && (
                            <button 
                                onClick={(e) => handleReactivateClick(e, account)} 
                                className="p-1.5 bg-slate-800 text-blue-500 hover:text-blue-400 rounded-lg border border-slate-700"
                                title="Reativar Conta (Mover para Ativas)"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </>
                )}
                {/* Actions for REPLACEMENT tab */}
                {type === 'REPLACEMENT' && onReactivate && (
                    <button 
                        onClick={(e) => handleReactivateClick(e, account)} 
                        className="p-1.5 bg-slate-800 text-blue-500 hover:text-blue-400 rounded-lg border border-slate-700"
                        title="Reativar Conta (Mover para Ativas)"
                    >
                        <RotateCcw size={14} />
                    </button>
                )}
                
                {onReplacement && account.status !== 'REPLACEMENT' && type !== 'DELETED' && (
                  <button 
                    onClick={(e) => handleReplacementClick(e, account)}
                    className="p-1.5 bg-slate-800 text-rose-500 hover:text-rose-400 rounded-lg border border-slate-700"
                    title="Marcar para Reposição"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                {type === 'ACTIVE' && (
                  <button 
                    onClick={(e) => handleLimitClick(e, account)}
                    className="p-1.5 bg-slate-800 text-amber-500 hover:text-amber-400 rounded-lg border border-slate-700"
                    title="Marcar como Limitada"
                  >
                    <Ban size={14} />
                  </button>
                )}
             </div>

            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3">
                 <span className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                    <UserIcon size={18} />
                 </span>
                 <div className="max-w-[150px]">
                   <h3 className="font-semibold text-slate-200 truncate">{account.name}</h3>
                   <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
                     {account.house}
                   </span>
                 </div>
               </div>
            </div>

            {/* Tags & Owner */}
            <div className="mb-3 flex flex-wrap gap-2">
                {account.owner && (
                    <span className="text-[10px] flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-md font-medium">
                        <UserIcon size={10} />
                        {account.owner}
                    </span>
                )}
                {account.tags?.map((tag, i) => (
                    <span key={i} className="text-[10px] flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md">
                        <Tag size={10} />
                        {tag}
                    </span>
                ))}
            </div>

            <div className="space-y-3 text-sm text-slate-400 bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-indigo-400" />
                <span className="truncate">{account.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-emerald-400" />
                <span>Depósito: <span className="text-slate-200 font-mono">R$ {account.depositValue.toFixed(2)}</span></span>
              </div>
              {account.password && (
                 <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-500">Senha:</span>
                   <span className="font-mono text-xs">•••••••</span>
                 </div>
              )}
            </div>
            
            {/* Deleted Reason Display */}
            {type === 'DELETED' && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-300">
                    <strong>Excluída:</strong> {account.deletionReason || 'Sem justificativa'}
                </div>
            )}

             {/* Card Preview */}
            {account.card && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <CreditCard size={12} />
                  <span className="uppercase tracking-wider">Card / Info</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 italic">
                  {account.card}
                </p>
              </div>
            )}
            
            <div className="mt-3 text-[10px] text-slate-600 text-right font-mono flex items-center justify-end gap-1">
               <Calendar size={10} />
               {getDateLabel(account)}
            </div>
          </div>
        ))}
        
        {filteredAccounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            Nenhuma conta encontrada nesta categoria.
          </div>
        )}
      </div>

      {/* Account Details Modal */}
      {viewingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
             <button onClick={() => setViewingAccount(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
             
             <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <UserIcon className="text-indigo-400" />
                {viewingAccount.name}
             </h3>
             <p className="text-sm text-slate-400 mb-6">{viewingAccount.house} • {viewingAccount.status}</p>

             <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Credenciais</p>
                    <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between"><span>Email:</span> <span className="text-white select-all">{viewingAccount.email}</span></div>
                        <div className="flex justify-between"><span>Senha:</span> <span className="text-white font-mono select-all">{viewingAccount.password || 'N/A'}</span></div>
                    </div>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Financeiro</p>
                    <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between"><span>Depósito Inicial:</span> <span className="text-emerald-400 font-mono">R$ {viewingAccount.depositValue.toFixed(2)}</span></div>
                    </div>
                </div>

                {viewingAccount.card && (
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">Dados do Card</p>
                        <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{viewingAccount.card}</p>
                    </div>
                )}
                
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                    ID: {viewingAccount.id} <br/>
                    Criada em: {new Date(viewingAccount.createdAt).toLocaleString()}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
                <button onClick={() => setHistoryAccount(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <RotateCcw size={20} className="text-indigo-400" />
                    Histórico da Conta: {historyAccount.name}
                </h3>
                
                <div className="overflow-y-auto pr-2 flex-1 space-y-3">
                    {getFilteredLogs(historyAccount.id, historyAccount.name).length > 0 ? (
                        getFilteredLogs(historyAccount.id, historyAccount.name).map(log => (
                            <div key={log.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-slate-200">{log.action}</span>
                                    <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-slate-400 text-xs mb-1">{log.taskDescription}</p>
                                <div className="text-[10px] text-indigo-400 flex items-center gap-1">
                                    <UserIcon size={10} /> {log.user}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-10">Nenhum histórico encontrado para esta conta.</p>
                    )}
                </div>
            </div>
          </div>
      )}

      {/* Edit/Create Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-4">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 {editingAccount.id ? <Pencil size={20} className="text-indigo-400" /> : <Plus size={20} className="text-indigo-400" />}
                 {editingAccount.id ? 'Editar Conta' : 'Nova Conta Manual'}
               </h3>
               <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-white"><X /></button>
             </div>

             <form onSubmit={handleSaveForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Casa</label>
                      <select 
                        value={editingAccount.house}
                        onChange={(e) => setEditingAccount({...editingAccount, house: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                         {availableHouses.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Valor Depósito</label>
                      <input 
                         type="number"
                         step="0.01"
                         value={editingAccount.depositValue}
                         onChange={(e) => setEditingAccount({...editingAccount, depositValue: parseFloat(e.target.value) || 0})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                   </div>
                </div>

                {/* Owner Field */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Dono da Conta</label>
                    <input 
                       type="text"
                       value={editingAccount.owner || ''}
                       onChange={(e) => setEditingAccount({...editingAccount, owner: e.target.value})}
                       placeholder="Nome do responsável"
                       className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Nome do Titular</label>
                    <input 
                       type="text"
                       required
                       value={editingAccount.name}
                       onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})}
                       className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Email de Acesso</label>
                    <input 
                       type="text"
                       value={editingAccount.email}
                       onChange={(e) => setEditingAccount({...editingAccount, email: e.target.value})}
                       className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Tags Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Tags (Pressione Enter para adicionar)</label>
                    <input 
                       type="text"
                       value={tagInput}
                       onChange={(e) => setTagInput(e.target.value)}
                       onKeyDown={handleAddTag}
                       placeholder="Ex: Projeto Alpha, VIP..."
                       className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex flex-wrap gap-2">
                        {editingAccount.tags?.map((tag, idx) => (
                            <span key={idx} className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                {tag}
                                <button type="button" onClick={() => removeTag(idx)} className="hover:text-white"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                       <CreditCard size={12} />
                       Card (Dados Avulsos)
                    </label>
                    <textarea 
                       rows={2}
                       value={editingAccount.card || ''}
                       onChange={(e) => setEditingAccount({...editingAccount, card: e.target.value})}
                       placeholder="CPF, Data de Nascimento, etc..."
                       className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                </div>

                {/* Pack Deduction Option (Only for new accounts and if status is ACTIVE) */}
                {!editingAccount.id && editingAccount.status === 'ACTIVE' && (
                     <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl mt-2">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                                 <Package size={16} className="text-slate-400" />
                                 <span className="text-xs font-medium text-slate-300">Reduzir do Pack</span>
                             </div>
                             <input 
                                 type="checkbox" 
                                 checked={usePack}
                                 onChange={(e) => setUsePack(e.target.checked)}
                             />
                        </div>
                        {usePack && (
                             <select 
                                 value={selectedPackId}
                                 onChange={(e) => setSelectedPackId(e.target.value)}
                                 className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white"
                             >
                                 <option value="">Selecione...</option>
                                 {packs
                                   .filter(p => p.house === editingAccount.house && p.status === 'ACTIVE')
                                   .map(p => (
                                     <option key={p.id} value={p.id}>
                                         Pack {p.house} ({p.delivered}/{p.quantity})
                                     </option>
                                 ))}
                             </select>
                        )}
                     </div>
                )}
                
                {/* Status Indicator (Read-only) */}
                <div className="text-xs text-center text-slate-500 pt-2 border-t border-slate-800 mt-4">
                    Criando conta como: <span className="font-bold text-white">{editingAccount.status}</span>
                </div>

                <div className="pt-2 flex gap-3">
                   <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                     <Save size={18} />
                     Salvar Conta
                   </button>
                   <button type="button" onClick={() => setEditingAccount(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                     Cancelar
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Limit Confirmation Modal */}
      {selectedAccountForLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold text-white">Limitar Conta</h3>
            </div>
            
            <p className="text-slate-300 mb-4">
              Você está marcando a conta <strong>{selectedAccountForLimit.name}</strong> como limitada. 
              Deseja registrar automaticamente uma pendência de saque?
            </p>
            
            <PixSelectionSection 
                mode={pixSelectionMode} setMode={setPixSelectionMode}
                selectedId={selectedPixId} setSelectedId={setSelectedPixId}
                newString={newPixString} setNewString={setNewPixString}
                pixKeys={pixKeys}
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={() => confirmLimit(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
              >
                Sim, registrar saque e limitar
              </button>
              <button
                onClick={() => confirmLimit(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
              >
                Não, apenas limitar
              </button>
              <button
                onClick={resetModals}
                className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replacement Confirmation Modal */}
      {selectedAccountForReplacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <RefreshCw size={24} />
              <h3 className="text-xl font-bold text-white">Conta em Reposição</h3>
            </div>
            
            <p className="text-slate-300 mb-4">
              Você está marcando a conta <strong>{selectedAccountForReplacement.name}</strong> como defeituosa/reposição. 
              Deseja registrar automaticamente uma pendência de saque?
            </p>

            <PixSelectionSection 
                mode={pixSelectionMode} setMode={setPixSelectionMode}
                selectedId={selectedPixId} setSelectedId={setSelectedPixId}
                newString={newPixString} setNewString={setNewPixString}
                pixKeys={pixKeys}
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={() => confirmReplacement(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
              >
                Sim, registrar saque e marcar
              </button>
              <button
                onClick={() => confirmReplacement(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
              >
                Não, apenas marcar
              </button>
              <button
                onClick={resetModals}
                className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Withdrawal Confirmation Modal (From Limited Tab) */}
      {selectedAccountForWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-500 mb-4">
              <DollarSign size={24} />
              <h3 className="text-xl font-bold text-white">Solicitar Saque</h3>
            </div>
            
            <p className="text-slate-300 mb-4">
              Registrar pendência de saque para a conta limitada <strong>{selectedAccountForWithdrawal.name}</strong>?
            </p>

            <PixSelectionSection 
                mode={pixSelectionMode} setMode={setPixSelectionMode}
                selectedId={selectedPixId} setSelectedId={setSelectedPixId}
                newString={newPixString} setNewString={setNewPixString}
                pixKeys={pixKeys}
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmWithdrawal}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Confirmar Solicitação
              </button>
              <button
                onClick={resetModals}
                className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Deletion Modal */}
      {selectedAccountForDeletion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                    <Trash2 size={24} />
                    <h3 className="text-xl font-bold text-white">Excluir Conta</h3>
                </div>
                
                <p className="text-slate-300 mb-4">
                    Tem certeza que deseja excluir a conta <strong>{selectedAccountForDeletion.name}</strong>? 
                    Ela será movida para a aba de "Contas Excluídas".
                </p>

                <div className="mb-6">
                    <label className="text-xs font-medium text-slate-400 mb-2 block">Justificativa (Opcional)</label>
                    <textarea
                        rows={3}
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        placeholder="Ex: Conta banida, duplicada..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500/50 outline-none resize-none"
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={confirmDeletion}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Confirmar Exclusão
                    </button>
                    <button
                        onClick={resetModals}
                        className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};