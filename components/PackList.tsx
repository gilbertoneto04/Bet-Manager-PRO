import React, { useState } from 'react';
import { Pack, Account } from '../types';
import { Package, Plus, ChevronDown, ChevronUp, CheckCircle2, DollarSign, RefreshCw } from 'lucide-react';

interface PackListProps {
  packs: Pack[];
  accounts: Account[];
  availableHouses: string[];
  onCreatePack: (packData: { house: string; quantity: number; price: number }) => void;
}

export const PackList: React.FC<PackListProps> = ({ packs, accounts, availableHouses, onCreatePack }) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  // Form State
  const [house, setHouse] = useState(availableHouses[0] || '');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (house && quantity > 0) {
      onCreatePack({ house, quantity, price });
      setIsCreating(false);
      setQuantity(10);
      setPrice(0);
    }
  };

  const filteredPacks = packs.filter(p => p.status === activeTab).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getPackAccounts = (packId: string) => {
    return accounts.filter(a => a.packId === packId);
  };

  const calculateProgress = (pack: Pack) => {
    return Math.min(100, Math.round((pack.delivered / pack.quantity) * 100));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Packs</h2>
          <p className="text-slate-400 text-sm mt-1">Gerencie a compra e entrega de lotes de contas</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
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
                   className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                   onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                >
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
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {packAccounts.map(acc => (
                             <div key={acc.id} className={`border p-3 rounded-lg text-sm relative ${acc.status === 'REPLACEMENT' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900 border-slate-800'}`}>
                                {acc.status === 'REPLACEMENT' && (
                                    <div className="absolute top-2 right-2 text-rose-500" title="Conta em Reposição">
                                        <RefreshCw size={14} />
                                    </div>
                                )}
                                <div className={`font-medium ${acc.status === 'REPLACEMENT' ? 'text-rose-200' : 'text-white'}`}>{acc.name}</div>
                                <div className="text-slate-500 text-xs">{acc.email}</div>
                                <div className="text-slate-600 text-[10px] mt-1">
                                  {new Date(acc.createdAt).toLocaleString('pt-BR')}
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

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Novo Pack de Contas</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  Criar Pack
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)} 
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