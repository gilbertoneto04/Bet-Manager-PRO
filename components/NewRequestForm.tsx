import React, { useState, useEffect } from 'react';
import { TaskStatus, Task, Account, PixKey, User } from '../types';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NewRequestFormProps {
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  availableHouses: string[];
  availableTypes: { label: string, value: string }[];
  accounts: Account[];
  pixKeys: PixKey[];
  currentUser: User | null;
}

export const NewRequestForm: React.FC<NewRequestFormProps> = ({ onSave, availableHouses, availableTypes, accounts, pixKeys, currentUser }) => {
  const [type, setType] = useState<string>('');
  const [house, setHouse] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pix Selection
  const [pixSelectionMode, setPixSelectionMode] = useState<'SAVED' | 'NEW' | 'NONE'>('NONE');
  const [selectedPixId, setSelectedPixId] = useState('');
  const [newPixString, setNewPixString] = useState('');

  // Filter Active Accounts
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');

  // Set defaults when lists load
  useEffect(() => {
    if (availableTypes.length > 0 && !type) setType(availableTypes[0].value);
    if (availableHouses.length > 0 && !house) setHouse(availableHouses[0]);
  }, [availableTypes, availableHouses]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-set house when account is selected, but allow change
  useEffect(() => {
    if (selectedAccountId) {
        const acc = activeAccounts.find(a => a.id === selectedAccountId);
        if (acc) {
            setHouse(acc.house);
        }
    }
  }, [selectedAccountId, activeAccounts]);

  // Auto-select default pix key
  useEffect(() => {
    if (type === 'SAQUE' && currentUser?.defaultPixKeyId) {
        setPixSelectionMode('SAVED');
        setSelectedPixId(currentUser.defaultPixKeyId);
    } else {
        setPixSelectionMode('NONE');
        setSelectedPixId('');
    }
  }, [type, currentUser]);

  const getPixInfoString = () => {
    if (pixSelectionMode === 'NONE') return undefined;
    if (pixSelectionMode === 'NEW') return newPixString ? `Chave Pix (Manual): ${newPixString}` : undefined;
    if (pixSelectionMode === 'SAVED') {
        const key = pixKeys.find(k => k.id === selectedPixId);
        return key ? `Chave Pix (${key.name} - ${key.bank}): ${key.key}` : undefined;
    }
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!type) return;

    // Validation
    const isContaNova = type === 'CONTA_NOVA';
    const isOutro = type === 'OUTRO';

    if (!isContaNova && !selectedAccountId) {
      setError('Selecione uma conta para esta pendência.');
      return;
    }
    
    // For Conta Nova, house is mandatory (from dropdown). For others, house is auto-set but check anyway.
    if (!house) {
        setError('A casa de aposta é obrigatória.');
        return;
    }

    if (isOutro && !description.trim()) {
      setError('Por favor, descreva a pendência.');
      return;
    }

    // Auto-Solicitada Logic
    const autoSolicitadaTypes = ['SMS', 'REMOVER_2FA', 'DEPOSITO', 'CONTA_NOVA'];
    const initialStatus = autoSolicitadaTypes.includes(type) ? TaskStatus.SOLICITADA : TaskStatus.PENDENTE;
    
    // Get Account Name
    let finalAccountName = 'N/A';
    if (!isContaNova && selectedAccountId) {
        const acc = activeAccounts.find(a => a.id === selectedAccountId);
        finalAccountName = acc ? acc.name : 'Desconhecida';
    }

    onSave({
      type,
      house,
      accountName: finalAccountName,
      quantity: isContaNova ? quantity : undefined,
      description: isOutro ? description : undefined,
      pixKeyInfo: getPixInfoString(),
      status: initialStatus
    });

    // Reset Form (Partial)
    setSelectedAccountId('');
    setQuantity(1);
    setDescription('');
    // Reset pix to default
    if (type === 'SAQUE' && currentUser?.defaultPixKeyId) {
        setPixSelectionMode('SAVED');
        setSelectedPixId(currentUser.defaultPixKeyId);
    } else {
        setPixSelectionMode('NONE');
        setSelectedPixId('');
    }
    setNewPixString('');
    setSuccess('Solicitação registrada com sucesso!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <span className="w-2 h-8 bg-indigo-500 rounded-full inline-block"></span>
          Nova Solicitação
        </h2>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 size={20} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Tipo de Pendência</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
              >
                {availableTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* House Selection - Always enabled now */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Casa de Aposta</label>
              <select
                value={house}
                onChange={(e) => setHouse(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {availableHouses.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Fields */}
          {type === 'CONTA_NOVA' ? (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-sm font-medium text-slate-400">Quantidade de Contas</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-sm font-medium text-slate-400">Selecione a Conta</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                 <option value="">Selecione...</option>
                 {activeAccounts.map(acc => (
                     <option key={acc.id} value={acc.id}>
                         {acc.name} ({acc.house}) {acc.owner ? `- ${acc.owner}` : ''}
                     </option>
                 ))}
              </select>
            </div>
          )}

          {/* Pix Section - Only for SAQUE */}
          {type === 'SAQUE' && (
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 animate-fadeIn">
                  <label className="text-sm font-medium text-slate-400 block mb-2">Chave Pix de Destino</label>
                  <div className="flex gap-2 mb-3">
                      <button 
                        type="button"
                        onClick={() => setPixSelectionMode('NONE')}
                        className={`flex-1 py-2 text-xs rounded-lg border ${pixSelectionMode === 'NONE' ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-600 text-slate-400'}`}
                      >
                          Nenhuma
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPixSelectionMode('SAVED')}
                        className={`flex-1 py-2 text-xs rounded-lg border ${pixSelectionMode === 'SAVED' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
                      >
                          Chave Salva
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPixSelectionMode('NEW')}
                        className={`flex-1 py-2 text-xs rounded-lg border ${pixSelectionMode === 'NEW' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
                      >
                          Manual
                      </button>
                  </div>

                  {pixSelectionMode === 'SAVED' && (
                      <select
                          value={selectedPixId}
                          onChange={(e) => setSelectedPixId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                      />
                  )}
              </div>
          )}

          {type === 'OUTRO' && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-sm font-medium text-slate-400">Descrição da Pendência</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Descreva o que precisa ser feito..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Registrar Solicitação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};