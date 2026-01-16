import React, { useState, useEffect } from 'react';
import { Pack, Account, User, LogEntry } from '../types';
import { Package, Plus, ChevronDown, ChevronUp, CheckCircle2, DollarSign, RefreshCw, Pencil, X, Tag, CreditCard, Ban, Trash2, User as UserIcon } from 'lucide-react';
import { ACCOUNT_STATUS_LABELS } from '../constants';

interface PackListProps {
  packs: Pack[];
  accounts: Account[];
  availableHouses: string[];
  currentUser: User | null;
  onCreatePack: (packData: { house: string; quantity: number; price: number }) => void;
  onEditPack?: (packId: string, updates: Partial<Pack>) => void;
  availableTypes?: any[];
  logs?: LogEntry[];
}

export const PackList: React.FC<PackListProps> = ({ packs, accounts, availableHouses, currentUser, onCreatePack, onEditPack, logs }) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  
  // Edit State
  const [editingPack, setEditingPack] = useState<Pack | null>(null);

  // Form State
  const [house, setHouse] = useState(availableHouses[0] || '');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(0);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreating(false);
        setEditingPack(null);
        setViewingAccount(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (availableHouses.length > 0 && !house) {
        setHouse(availableHouses[0]);
    }
  }, [availableHouses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (house && quantity > 0) {
      onCreatePack({ house, quantity, price });
      setIsCreating(false);
      resetForm();
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPack && onEditPack && house && quantity > 0) {
          onEditPack(editingPack.id, { house, quantity, price });
          setEditingPack(null);
          resetForm();
      }
  };

  const startEdit = (e: React.MouseEvent, pack: Pack) => {
      e.stopPropagation();
      setEditingPack(pack);
      setHouse(pack.house);
      setQuantity(pack.quantity);
      setPrice(pack.price);
  };

  const resetForm = () => {
      setHouse(availableHouses[0] || '');
      setQuantity(10);
      setPrice(0);
  };

  const filteredPacks = packs.filter(p => p.status === activeTab).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getPackAccounts = (packId: string) => {
    return accounts.filter(a => a.packId === packId);
  };

  const calculateProgress = (pack: Pack) => {
    return Math.min(100, Math.round((pack.delivered / pack.quantity) * 100));
  };
  
  const getStatusColor = (status: string) => {
      switch(status) {
          case 'ACTIVE': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
          case 'LIMITED': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
          case 'REPLACEMENT': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
          case 'DELETED': return 'text-red-400 border-red-500/30 bg-red-500/10';
          default: return 'text-slate-400 border-slate-700 bg-slate-800';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Packs</h2>
          <p className="text-slate-400 text-sm mt-1">Gerencie a compra e entrega de lotes de contas</p>
        </div>
        <button 
          onClick={() => { setIsCreating(true); resetForm(); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus size={18} />
          Novo Pack
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'ACTIVE' 
              ? 'border-indigo-500 text-white' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Ativos
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'COMPLETED' 
              ? 'border-indigo-500 text-white' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Finalizados
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPacks.length === 0 ? (
           <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
             Nenhum pack {activeTab === 'ACTIVE' ? 'ativo' : 'finalizado'} encontrado.
           </div>
        ) : (
          filteredPacks.map(pack => {
            const progress = calculateProgress(pack);
            const isExpanded = expandedPack === pack.id;
            const packAccounts = getPackAccounts(pack.id);

            return (
              <div key={pack.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-indigo-500/30 transition-all">
                <div 
                   className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer relative"
                   onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                >
                   {currentUser?.role === 'ADMIN' && onEditPack && (
                       <button 
                          onClick={(e) => startEdit(e, pack)}
                          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 z-10"
                          title="Editar Pack"
                       >
                           <Pencil size={16} />
                       </button>
                   )}

                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
                        <Package size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-200">{pack.house}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                           <span className="flex items-center gap-1">
                             <DollarSign size={14} />
                             {pack.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </span>
                           <span>•</span>
                           <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                   </div>

                   <div className="flex-1 max-w-md mx-4">
                      <div className="flex justify-between text-sm mb-1">
                         <span className="text-slate-400">Progresso</span>
                         <span className="text-white font-medium">{pack.delivered} / {pack.quantity}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-500 ${
                              progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                           }`} 
                           style={{ width: `${progress}%` }} 
                         />
                      </div>
                   </div>

                   <div className="text-slate-500">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                   </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/30 p-5 animate-fadeIn">
                     <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        Histórico de Contas ({packAccounts.length})
                     </h4>
                     {packAccounts.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {packAccounts.map(acc => (
                             <div 
                                key={acc.id} 
                                onClick={() => setViewingAccount(acc)}
                                className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm hover:border-slate-700 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-white truncate max-w-[120px]">{acc.name}</div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(acc.status)}`}>
                                        {ACCOUNT_STATUS_LABELS[acc.status] || acc.status}
                                    </span>
                                </div>
                                
                                <div className="space-y-1.5 mb-2">
                                    <div className="text-slate-400 text-xs flex items-center gap-1.5 truncate" title={acc.email}>
                                        <span className="opacity-50">@</span> {acc.email}
                                    </div>
                                    {acc.password && (
                                        <div className="text-slate-500 text-xs flex items-center gap-1.5">
                                            <span className="opacity-50">Pw:</span> ••••••••
                                        </div>
                                    )}
                                    <div className="text-emerald-400 text-xs flex items-center gap-1.5">
                                        <DollarSign size={10} /> 
                                        {acc.depositValue.toFixed(2)}
                                    </div>
                                </div>

                                {/* Tags & Info */}
                                {(acc.tags.length > 0 || acc.card) && (
                                    <div className="pt-2 border-t border-slate-800/50 flex flex-col gap-2">
                                        {acc.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {acc.tags.map(t => (
                                                    <span key={t} className="text-[9px] bg-indigo-500/10 text-indigo-300 px-1 rounded flex items-center gap-0.5">
                                                        <Tag size={8} /> {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {acc.card && (
                                            <div className="text-[10px] text-slate-500 italic bg-slate-800/50 p-1.5 rounded flex items-start gap-1">
                                                <CreditCard size={10} className="mt-0.5 shrink-0" />
                                                <span className="truncate">{acc.card}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="mt-2 text-[9px] text-slate-600 text-right">
                                    Criada: {new Date(acc.createdAt).toLocaleDateString()}
                                </div>
                             </div>
                          ))}
                       </div>
                     ) : (
                       <p className="text-sm text-slate-500 italic">Nenhuma conta entregue neste pack ainda.</p>
                     )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Account Details Modal (Reused) */}
      {viewingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
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

      {/* Create / Edit Modal */}
      {(isCreating || editingPack) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">
                {editingPack ? 'Editar Pack' : 'Novo Pack de Contas'}
            </h3>
            <form onSubmit={editingPack ? handleEditSubmit : handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Casa de Aposta</label>
                <select
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {availableHouses.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Quantidade de Contas</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Valor Pago (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors">
                  {editingPack ? 'Salvar Alterações' : 'Criar Pack'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsCreating(false); setEditingPack(null); }} 
                  className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};