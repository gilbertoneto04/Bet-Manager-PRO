import React, { useState, useMemo, useEffect } from 'react';
import { Account, Pack, PixKey, User, LogEntry, Task } from '../types';
import { Ban, DollarSign, User as UserIcon, Mail, AlertTriangle, Search, Plus, Pencil, Save, X, CreditCard, RefreshCw, Package, Tag, Landmark, RotateCcw, Trash2, Info, Calendar, Key, AtSign, Copy, UserCheck, Phone, Eye, EyeOff } from 'lucide-react';
import { ACCOUNT_STATUS_LABELS } from '../constants';

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
  tasks?: Task[]; // Passed to check for pending tasks
  availableTypes?: { label: string, value: string }[];
  onLogActivity?: (context: string, action: string) => void;
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
                type="button"
                onClick={() => setMode('SAVED')}
                className={`flex-1 py-2 text-xs rounded-lg border ${mode === 'SAVED' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
            >
                Chave Salva
            </button>
            <button 
                type="button"
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


export const AccountList: React.FC<AccountListProps> = ({ accounts, type, packs, pixKeys, currentUser, onLimit, onReplacement, onWithdraw, onReactivate, onDelete, onSave, availableHouses, logs, tasks, availableTypes, onLogActivity }) => {
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

  // Password Visibility State (Set of Account IDs)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

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

  // Auto-select active Pack for New Accounts
  useEffect(() => {
    // Only run if creating a NEW account (no ID) and status is ACTIVE
    if (editingAccount && !editingAccount.id && editingAccount.status === 'ACTIVE' && editingAccount.house) {
        const activePacks = packs.filter(p => p.house === editingAccount.house && p.status === 'ACTIVE');
        if (activePacks.length > 0) {
            setUsePack(true);
            setSelectedPackId(activePacks[0].id);
        } else {
            setUsePack(false);
            setSelectedPackId('');
        }
    }
  }, [editingAccount?.house, editingAccount?.id, editingAccount?.status, packs]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);

      if (e.key === 'Escape') {
        resetModals();
        setEditingAccount(null);
        setHistoryAccount(null);
        setViewingAccount(null);
        return;
      }

      // Confirm actions with Enter (only if not typing in an input)
      if (e.key === 'Enter' && !isInput) {
         if (selectedAccountForLimit) confirmLimit(true);
         else if (selectedAccountForReplacement) confirmReplacement(true);
         else if (selectedAccountForWithdrawal) confirmWithdrawal();
         else if (selectedAccountForDeletion) confirmDeletion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedAccountForLimit, 
    selectedAccountForReplacement, 
    selectedAccountForWithdrawal, 
    selectedAccountForDeletion
  ]);

  const togglePassword = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(visiblePasswords);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setVisiblePasswords(newSet);
  };

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
                              (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                              (acc.owner && acc.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
                              (acc.phone && acc.phone.includes(searchTerm)) ||
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
  
  const handleHistoryClick = (e: React.MouseEvent, account: Account) => { 
      e.stopPropagation(); 
      setHistoryAccount(account); 
      if (onLogActivity) onLogActivity('Interação', `Visualizou histórico da conta: ${account.name}`);
  };
  
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
    const defaultHouse = availableHouses[0] || '';
    setEditingAccount({
      name: '',
      username: '',
      email: '',
      phone: '',
      house: defaultHouse,
      depositValue: 0,
      password: '',
      card: '',
      status: type !== 'DELETED' ? type : 'ACTIVE', // Default status is current tab type (unless deleted)
      tags: [],
      owner: currentUser?.name || '' // Default owner is current user
    });
    // Pack selection will be handled by useEffect
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
      
      // New Account Pack Rule
      if (!editingAccount.id && editingAccount.status === 'ACTIVE') {
          if (currentUser?.role !== 'ADMIN' && (!usePack || !selectedPackId)) {
              alert("Você deve selecionar um Pack para criar uma nova conta.");
              return;
          }
      }

      onSave(
          {
            ...editingAccount,
            // Ensure we save 0 if the field is empty (undefined)
            depositValue: editingAccount.depositValue ?? 0
          } as Account, 
          (!editingAccount.id && usePack && selectedPackId) ? selectedPackId : undefined
      );
      setEditingAccount(null);
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      // Optional: show toast
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

  const getFilteredLogs = (account: Account) => {
      if (!logs) return [];
      
      // 1. Direct Account Logs (by ID or exact name match in description)
      const directLogs = logs.filter(l => 
          l.taskId === account.id || 
          (l.taskDescription && l.taskDescription.includes(account.name))
      );

      // 2. Logs from linked Tasks
      // Find tasks that belong to this account
      let taskLogs: LogEntry[] = [];
      if (tasks && tasks.length > 0) {
          const linkedTaskIds = tasks
              .filter(t => t.accountName === account.name && t.house === account.house)
              .map(t => t.id);
          
          if (linkedTaskIds.length > 0) {
              taskLogs = logs.filter(l => l.taskId && linkedTaskIds.includes(l.taskId));
          }
      }

      // Combine and Remove Duplicates
      const combined = [...directLogs, ...taskLogs];
      const uniqueMap = new Map();
      combined.forEach(item => {
          if(!uniqueMap.has(item.id)){
              uniqueMap.set(item.id, item);
          }
      });
      
      return Array.from(uniqueMap.values()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Get specific pending task name
  const getPendingTaskName = (account: Account) => {
      if (!tasks) return null;
      const task = tasks.find(t => t.accountName === account.name && t.house === account.house && t.status !== 'FINALIZADA' && t.status !== 'EXCLUIDA');
      if (task) {
          const typeLabel = availableTypes?.find(at => at.value === task.type)?.label || task.type;
          return typeLabel;
      }
      return null;
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
        {filteredAccounts.map(account => {
            const pendingTaskName = getPendingTaskName(account);
            const isPasswordVisible = visiblePasswords.has(account.id);
            
            return (
          <div 
            key={account.id} 
            onClick={() => setViewingAccount(account)}
            className={`bg-slate-900 border rounded-xl p-5 shadow-sm transition-all group relative cursor-pointer ${
                pendingTaskName ? 'border-amber-500/50 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]' : 'border-slate-800 hover:border-indigo-500/30'
            }`}
          >
             {/* Pending Status Badge */}
             {pendingTaskName && (
                 <div className="absolute top-0 left-0 bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-br-lg font-bold flex items-center gap-1 z-10 shadow-sm">
                     <AlertTriangle size={10} />
                     {pendingTaskName}
                 </div>
             )}

             {/* Action Buttons - Visible on Mobile, Hover on Desktop, Z-Index boosted */}
             <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                <button 
                    onClick={(e) => handleHistoryClick(e, account)} 
                    className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                    title="Ver Histórico"
                >
                    <Info size={14} />
                </button>

                {type !== 'DELETED' && onDelete && (
                    <button 
                        onClick={(e) => handleDeleteClick(e, account)} 
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
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
                                className="p-1.5 bg-slate-800 text-blue-500 hover:text-blue-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
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
                                className="p-1.5 bg-slate-800 text-red-500 hover:text-red-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                                title="Excluir Permanentemente"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </>
                )}

                {onSave && type !== 'DELETED' && (
                   <button onClick={(e) => handleEditClick(e, account)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors" title="Editar">
                     <Pencil size={14} />
                   </button>
                )}
                
                {/* Actions for LIMITED tab */}
                {type === 'LIMITED' && (
                    <>
                        {onWithdraw && (
                            <button 
                                onClick={(e) => handleWithdrawalClick(e, account)} 
                                className="p-1.5 bg-slate-800 text-emerald-500 hover:text-emerald-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                                title="Solicitar Saque"
                            >
                                <DollarSign size={14} />
                            </button>
                        )}
                        {onReactivate && (
                            <button 
                                onClick={(e) => handleReactivateClick(e, account)} 
                                className="p-1.5 bg-slate-800 text-blue-500 hover:text-blue-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                                title="Reativar Conta (Mover para Ativas)"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </>
                )}
                {/* Actions for REPLACEMENT tab */}
                {type === 'REPLACEMENT' && (
                    <>
                        {onWithdraw && (
                            <button 
                                onClick={(e) => handleWithdrawalClick(e, account)} 
                                className="p-1.5 bg-slate-800 text-emerald-500 hover:text-emerald-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                                title="Solicitar Saque"
                            >
                                <DollarSign size={14} />
                            </button>
                        )}
                        {onReactivate && (
                            <button 
                                onClick={(e) => handleReactivateClick(e, account)} 
                                className="p-1.5 bg-slate-800 text-blue-500 hover:text-blue-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                                title="Reativar Conta (Mover para Ativas)"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </>
                )}
                
                {onReplacement && account.status !== 'REPLACEMENT' && type !== 'DELETED' && (
                  <button 
                    onClick={(e) => handleReplacementClick(e, account)}
                    className="p-1.5 bg-slate-800 text-rose-500 hover:text-rose-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                    title="Marcar para Reposição"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                {type === 'ACTIVE' && (
                  <button 
                    onClick={(e) => handleLimitClick(e, account)}
                    className="p-1.5 bg-slate-800 text-amber-500 hover:text-amber-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                    title="Marcar como Limitada"
                  >
                    <Ban size={14} />
                  </button>
                )}
             </div>

            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3">
                 <span className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 shrink-0">
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
            <div className="mb-3 flex flex-wrap gap-2 min-h-[24px]">
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

            {/* Account Details Card Body - Reordered */}
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
              
              {/* 1. Email */}
              <div className="col-span-2 flex items-center justify-between group/field">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <Mail size={14} className="text-indigo-400 shrink-0" />
                    <span className="truncate text-slate-300">{account.email}</span>
                 </div>
                 <button onClick={(e) => handleCopy(e, account.email)} className="opacity-0 group-hover/field:opacity-100 text-slate-500 hover:text-white p-1"><Copy size={12} /></button>
              </div>

              {/* 2. Username */}
              {account.username && (
                 <div className="col-span-2 flex items-center justify-between group/field mt-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <UserIcon size={14} className="text-blue-400 shrink-0" />
                        <span className="truncate text-slate-300">{account.username}</span>
                     </div>
                    <button onClick={(e) => handleCopy(e, account.username!)} className="opacity-0 group-hover/field:opacity-100 text-slate-500 hover:text-white p-1"><Copy size={12} /></button>
                 </div>
              )}
              
              {/* 3. Password (with Toggle) */}
              {account.password && (
                 <div className="col-span-2 flex items-center justify-between group/field mt-1">
                   <div className="flex items-center gap-2 overflow-hidden">
                        <Key size={14} className="text-amber-400 shrink-0" />
                        <span className={`font-mono text-xs ${isPasswordVisible ? 'text-white' : 'text-slate-500'}`}>
                            {isPasswordVisible ? account.password : '••••••••'}
                        </span>
                   </div>
                   <div className="flex items-center gap-1">
                        <button 
                            onClick={(e) => togglePassword(e, account.id)} 
                            className="text-slate-500 hover:text-white p-1"
                            title={isPasswordVisible ? "Ocultar Senha" : "Ver Senha"}
                        >
                            {isPasswordVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={(e) => handleCopy(e, account.password!)} className="opacity-0 group-hover/field:opacity-100 text-slate-500 hover:text-white p-1"><Copy size={12} /></button>
                   </div>
                 </div>
              )}
              
              {/* 4. Phone */}
              {account.phone && (
                  <div className="col-span-2 flex items-center justify-between group/field mt-1">
                     <div className="flex items-center gap-2 overflow-hidden">
                        <Phone size={14} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{account.phone}</span>
                     </div>
                     <button onClick={(e) => handleCopy(e, account.phone!)} className="opacity-0 group-hover/field:opacity-100 text-slate-500 hover:text-white p-1"><Copy size={12} /></button>
                  </div>
              )}

              {/* 5. Balance */}
              <div className="col-span-2 flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                <DollarSign size={14} className="text-emerald-400 shrink-0" />
                <span className="text-white font-mono font-bold">R$ {account.depositValue.toFixed(2)}</span>
              </div>
              
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
                <p className="text-xs text-slate-400 line-clamp-2 italic break-all">
                  {account.card}
                </p>
              </div>
            )}
            
            <div className="mt-3 text-[10px] text-slate-600 text-right font-mono flex items-center justify-end gap-1">
               <Calendar size={10} />
               {getDateLabel(account)}
            </div>
          </div>
        )})}
        
        {filteredAccounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            Nenhuma conta encontrada nesta categoria.
          </div>
        )}
      </div>

      {/* Account Details Modal */}
      {viewingAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
             {/* Fixed Header */}
             <div className="p-6 pb-2 shrink-0 border-b border-slate-800/50">
                 <button onClick={() => setViewingAccount(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800/50 rounded-full"><X size={20}/></button>
                 <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2 pr-8">
                    <UserIcon className="text-indigo-400" />
                    <span className="truncate">{viewingAccount.name}</span>
                 </h3>
                 <p className="text-sm text-slate-400">{viewingAccount.house} • {ACCOUNT_STATUS_LABELS[viewingAccount.status] || viewingAccount.status}</p>
             </div>

             {/* Scrollable Content */}
             <div className="p-6 pt-4 overflow-y-auto space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Credenciais</p>
                    <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between items-center group/item">
                            <span>Email:</span> 
                            <div className="flex items-center gap-2">
                                <span className="text-white select-all">{viewingAccount.email}</span>
                                <button onClick={() => navigator.clipboard.writeText(viewingAccount.email)} className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-white"><Copy size={12}/></button>
                            </div>
                        </div>
                        {viewingAccount.phone && (
                            <div className="flex justify-between items-center group/item">
                                <span>Telefone:</span> 
                                <div className="flex items-center gap-2">
                                    <span className="text-white select-all">{viewingAccount.phone}</span>
                                    <button onClick={() => navigator.clipboard.writeText(viewingAccount.phone!)} className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-white"><Copy size={12}/></button>
                                </div>
                            </div>
                        )}
                        {viewingAccount.username && (
                            <div className="flex justify-between items-center group/item">
                                <span>Usuário:</span> 
                                <div className="flex items-center gap-2">
                                    <span className="text-white select-all">{viewingAccount.username}</span>
                                    <button onClick={() => navigator.clipboard.writeText(viewingAccount.username!)} className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-white"><Copy size={12}/></button>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center group/item">
                            <span>Senha:</span> 
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono select-all">{viewingAccount.password || 'N/A'}</span>
                                {viewingAccount.password && <button onClick={() => navigator.clipboard.writeText(viewingAccount.password!)} className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-white"><Copy size={12}/></button>}
                            </div>
                        </div>
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
                        <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">{viewingAccount.card}</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
                <button onClick={() => setHistoryAccount(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <RotateCcw size={20} className="text-indigo-400" />
                    Histórico da Conta: {historyAccount.name}
                </h3>
                
                <div className="overflow-y-auto pr-2 flex-1 space-y-3">
                    {getFilteredLogs(historyAccount).length > 0 ? (
                        getFilteredLogs(historyAccount).map(log => (
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
             
             {/* Fixed Header */}
             <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0 bg-slate-900 rounded-t-2xl">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 {editingAccount.id ? <Pencil size={20} className="text-indigo-400" /> : <Plus size={20} className="text-indigo-400" />}
                 {editingAccount.id ? 'Editar Conta' : 'Nova Conta Manual'}
               </h3>
               <button 
                  onClick={() => setEditingAccount(null)} 
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
             </div>

             {/* Scrollable Content */}
             <div className="p-6 overflow-y-auto">
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
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                            <input 
                                type="number"
                                step="0.01"
                                // Use '' if undefined so the field can be empty for user convenience
                                value={editingAccount.depositValue === undefined ? '' : editingAccount.depositValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingAccount({
                                        ...editingAccount, 
                                        // If empty string, set to undefined. Otherwise parse.
                                        depositValue: val === '' ? undefined : parseFloat(val)
                                    });
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    </div>

                    {/* Owner Field */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400">Dono da Conta</label>
                        <div className="relative">
                            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={14} />
                            <input 
                            type="text"
                            value={editingAccount.owner || ''}
                            onChange={(e) => setEditingAccount({...editingAccount, owner: e.target.value})}
                            placeholder="Nome do responsável"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400">Nome do Titular</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                            type="text"
                            required
                            value={editingAccount.name}
                            onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Usuário (Login)</label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                                <input 
                                type="text"
                                value={editingAccount.username || ''}
                                onChange={(e) => setEditingAccount({...editingAccount, username: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Senha</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={14} />
                                <input 
                                    type="text"
                                    value={editingAccount.password || ''}
                                    onChange={(e) => setEditingAccount({...editingAccount, password: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email and Phone Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Email de Acesso</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
                                <input 
                                type="text"
                                value={editingAccount.email}
                                onChange={(e) => setEditingAccount({...editingAccount, email: e.target.value})}
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
                                value={editingAccount.phone || ''}
                                onChange={(e) => setEditingAccount({...editingAccount, phone: e.target.value})}
                                placeholder="(00) 00000-0000"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
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
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={usePack}
                                        disabled={currentUser?.role !== 'ADMIN'} // Only admin can uncheck
                                        onChange={(e) => setUsePack(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${currentUser?.role !== 'ADMIN' ? 'opacity-50 cursor-not-allowed bg-indigo-600 after:translate-x-full after:border-white' : 'bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-indigo-600'}`}></div>
                                </label>
                            </div>
                            {(usePack || currentUser?.role !== 'ADMIN') && (
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
                            {usePack && packs.filter(p => p.house === editingAccount.house && p.status === 'ACTIVE').length === 0 && (
                                <p className="text-[10px] text-red-400 mt-1">Nenhum pack ativo disponível para {editingAccount.house}.</p>
                            )}
                        </div>
                    )}
                    
                    {/* Status Indicator (Read-only) */}
                    <div className="text-xs text-center text-slate-500 pt-2 border-t border-slate-800 mt-4">
                        Criando conta como: <span className="font-bold text-white">{ACCOUNT_STATUS_LABELS[editingAccount.status!] || editingAccount.status}</span>
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
        </div>
      )}
    </div>
  );
};