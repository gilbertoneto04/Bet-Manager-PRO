import React, { useState, useMemo, useEffect } from 'react';
import { Account, Pack, PixKey, User } from '../types';
import { Ban, DollarSign, User as UserIcon, Mail, AlertTriangle, Search, Plus, Pencil, Save, X, CreditCard, RefreshCw, Package, Tag, Landmark } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  type: 'ACTIVE' | 'LIMITED' | 'REPLACEMENT';
  packs: Pack[];
  pixKeys: PixKey[];
  currentUser: User | null;
  onLimit?: (accountId: string, createWithdrawal: boolean, pixInfo?: string) => void;
  onReplacement?: (accountId: string, createWithdrawal: boolean, pixInfo?: string) => void;
  onSave?: (account: Account, packIdToDeduct?: string) => void;
  availableHouses: string[];
}

export const AccountList: React.FC<AccountListProps> = ({ accounts, type, packs, pixKeys, currentUser, onLimit, onReplacement, onSave, availableHouses }) => {
  const [selectedAccountForLimit, setSelectedAccountForLimit] = useState<Account | null>(null);
  const [selectedAccountForReplacement, setSelectedAccountForReplacement] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  
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
    if (selectedAccountForLimit || selectedAccountForReplacement) {
        if (currentUser?.defaultPixKeyId) {
            setPixSelectionMode('SAVED');
            setSelectedPixId(currentUser.defaultPixKeyId);
        } else {
            setPixSelectionMode('SAVED');
            setSelectedPixId('');
        }
    }
  }, [selectedAccountForLimit, selectedAccountForReplacement, currentUser]);

  const getTitle = () => {
      if (type === 'ACTIVE') return 'Contas em Uso';
      if (type === 'LIMITED') return 'Contas Limitadas';
      return 'Contas em Reposição';
  };

  const getSubtitle = () => {
      if (type === 'ACTIVE') return 'Gerencie as contas ativas na operação';
      if (type === 'LIMITED') return 'Histórico de contas limitadas';
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Default DATE
      });
  }, [accounts, searchTerm, houseFilter, sortBy]);

  const resetModals = () => {
      setSelectedAccountForLimit(null);
      setSelectedAccountForReplacement(null);
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

  const handleLimitClick = (account: Account) => {
    setSelectedAccountForLimit(account);
  };

  const confirmLimit = (createWithdrawal: boolean) => {
    if (selectedAccountForLimit && onLimit) {
      onLimit(selectedAccountForLimit.id, createWithdrawal, createWithdrawal ? getPixInfoString() : undefined);
      resetModals();
    }
  };

  const handleReplacementClick = (account: Account) => {
    setSelectedAccountForReplacement(account);
  };

  const confirmReplacement = (createWithdrawal: boolean) => {
     if (selectedAccountForReplacement && onReplacement) {
        onReplacement(selectedAccountForReplacement.id, createWithdrawal, createWithdrawal ? getPixInfoString() : undefined);
        resetModals();
     }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount({ ...account, tags: account.tags || [] });
  };

  const handleNew = () => {
    setEditingAccount({
      name: '',
      email: '',
      house: availableHouses[0] || '',
      depositValue: 0,
      password: '',
      card: '',
      status: 'ACTIVE',
      tags: [],
      owner: ''
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

  // Sub-component for Pix Selection in Modals
  const PixSelectionSection = () => (
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4 animate-fadeIn">
          <label className="text-sm text-slate-400 block mb-2">Destino do Saque (Opcional)</label>
          <div className="flex gap-2 mb-3">
              <button 
                onClick={() => setPixSelectionMode('SAVED')}
                className={`flex-1 py-2 text-xs rounded-lg border ${pixSelectionMode === 'SAVED' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
              >
                  Chave Salva
              </button>
              <button 
                onClick={() => setPixSelectionMode('NEW')}
                className={`flex-1 py-2 text-xs rounded-lg border ${pixSelectionMode === 'NEW' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
              >
                  Nova / Manual
              </button>
          </div>

          {pixSelectionMode === 'SAVED' && (
              <select
                  value={selectedPixId}
                  onChange={(e) => setSelectedPixId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              >
                  <option value="">Selecione uma chave...</option>
                  {pixKeys.map(k => (
                      <option key={k.id} value={k.id}>{k.name} - {k.bank} ({k.key})</option>
                  ))}
              </select>
          )}

          {pixSelectionMode === 'NEW' && (
              <input 
                  type="text"
                  value={newPixString}
                  onChange={(e) => setNewPixString(e.target.value)}
                  placeholder="Digite a chave Pix (CPF, Email, etc)..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
          )}
      </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
          <p className="text-slate-400 text-sm mt-1">{getSubtitle()}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {type === 'ACTIVE' && (
             <button onClick={handleNew} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
                <Plus size={18} />
                Nova Conta
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
          <div key={account.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-indigo-500/30 transition-all group relative">
             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {onSave && (
                   <button onClick={() => handleEdit(account)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700" title="Editar">
                     <Pencil size={14} />
                   </button>
                )}
                {onReplacement && account.status !== 'REPLACEMENT' && (
                  <button 
                    onClick={() => handleReplacementClick(account)}
                    className="p-1.5 bg-slate-800 text-rose-500 hover:text-rose-400 rounded-lg border border-slate-700"
                    title="Marcar para Reposição"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                {type === 'ACTIVE' && (
                  <button 
                    onClick={() => handleLimitClick(account)}
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
            
            <div className="mt-3 text-[10px] text-slate-600 text-right">
               {new Date(account.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
        
        {filteredAccounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            Nenhuma conta encontrada nesta categoria.
          </div>
        )}
      </div>

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
                    <label className="text-xs font-medium text-slate-400">Dono da Conta (Opcional)</label>
                    <input 
                       type="text"
                       value={editingAccount.owner || ''}
                       onChange={(e) => setEditingAccount({...editingAccount, owner: e.target.value})}
                       placeholder="Ex: Cliente X, Sócio Y..."
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

                {/* Pack Deduction Option (Only for new accounts) */}
                {!editingAccount.id && (
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

                <div className="pt-4 flex gap-3">
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
            
            <PixSelectionSection />

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

            <PixSelectionSection />

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
    </div>
  );
};