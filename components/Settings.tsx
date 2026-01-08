import React, { useState } from 'react';
import { Trash2, Plus, RotateCcw, Landmark, User } from 'lucide-react';
import { PixKey, User as UserType } from '../types';

interface SettingsProps {
  houses: string[];
  setHouses: (houses: string[]) => void;
  taskTypes: { label: string; value: string }[];
  setTaskTypes: (types: { label: string; value: string }[]) => void;
  pixKeys: PixKey[];
  setPixKeys: (keys: PixKey[]) => void;
  currentUser: UserType | null;
  onUpdateUser: (user: UserType) => void;
  onReset?: () => void;
  logAction: (description: string, action: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  houses, setHouses, 
  taskTypes, setTaskTypes, 
  pixKeys, setPixKeys,
  currentUser, onUpdateUser,
  onReset, logAction 
}) => {
  const [newHouse, setNewHouse] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  
  // Pix Form
  const [pixName, setPixName] = useState('');
  const [pixBank, setPixBank] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKey['keyType']>('CPF');
  const [pixKey, setPixKey] = useState('');

  // --- Houses ---
  const handleAddHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHouse.trim()) {
      setHouses([...houses, newHouse.trim()]);
      logAction('Configuração: Casas', `Adicionou a casa: ${newHouse.trim()}`);
      setNewHouse('');
    }
  };

  const handleRemoveHouse = (index: number) => {
    const houseName = houses[index];
    const newHouses = [...houses];
    newHouses.splice(index, 1);
    setHouses(newHouses);
    logAction('Configuração: Casas', `Removeu a casa: ${houseName}`);
  };

  // --- Task Types ---
  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeLabel.trim()) {
      const val = newTypeLabel.trim().toUpperCase().replace(/\s+/g, '_');
      setTaskTypes([...taskTypes, { label: newTypeLabel.trim(), value: val }]);
      logAction('Configuração: Tipos', `Adicionou o tipo: ${newTypeLabel.trim()}`);
      setNewTypeLabel('');
    }
  };

  const handleRemoveType = (index: number) => {
    const typeLabel = taskTypes[index].label;
    const newTypes = [...taskTypes];
    newTypes.splice(index, 1);
    setTaskTypes(newTypes);
    logAction('Configuração: Tipos', `Removeu o tipo: ${typeLabel}`);
  };

  // --- Pix Keys ---
  const handleAddPix = (e: React.FormEvent) => {
    e.preventDefault();
    if (pixName && pixBank && pixKey) {
        const newPix: PixKey = {
            id: Math.random().toString(36).substring(7),
            name: pixName,
            bank: pixBank,
            keyType: pixKeyType,
            key: pixKey
        };
        setPixKeys([...pixKeys, newPix]);
        logAction('Configuração: Pix', `Adicionou chave Pix: ${pixName} (${pixBank})`);
        // Reset
        setPixName('');
        setPixBank('');
        setPixKey('');
    }
  };

  const handleRemovePix = (id: string) => {
      const key = pixKeys.find(k => k.id === id);
      setPixKeys(pixKeys.filter(k => k.id !== id));
      if (key) logAction('Configuração: Pix', `Removeu chave Pix: ${key.name}`);
  };

  const handleDefaultKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (currentUser) {
          const newUser = { ...currentUser, defaultPixKeyId: e.target.value };
          onUpdateUser(newUser);
          logAction('Configuração: Usuário', 'Alterou a chave Pix padrão');
      }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2">Configurações</h2>
           <p className="text-slate-400">Gerencie as opções disponíveis no sistema.</p>
        </div>
        {onReset && (
            <button 
                onClick={() => {
                    onReset();
                    logAction('Configurações', 'Restaurou padrões de fábrica');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 hover:border-red-500/30 text-slate-300 rounded-lg transition-all text-sm font-medium"
            >
                <RotateCcw size={16} />
                Restaurar Padrões
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Houses Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            Casas de Aposta
          </h3>
          
          <form onSubmit={handleAddHouse} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newHouse}
              onChange={(e) => setNewHouse(e.target.value)}
              placeholder="Nome da Casa..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {houses.map((house, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-950/50 border border-slate-800 p-3 rounded-lg group">
                <span className="text-slate-300">{house}</span>
                <button 
                  onClick={() => handleRemoveHouse(idx)}
                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Task Types Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
            Tipos de Pendência
          </h3>
          
          <form onSubmit={handleAddType} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTypeLabel}
              onChange={(e) => setNewTypeLabel(e.target.value)}
              placeholder="Nome do Tipo..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {taskTypes.map((type, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-950/50 border border-slate-800 p-3 rounded-lg group">
                <div>
                   <span className="text-slate-300 block">{type.label}</span>
                   <span className="text-[10px] text-slate-600 font-mono">{type.value}</span>
                </div>
                <button 
                  onClick={() => handleRemoveType(idx)}
                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pix Keys Configuration */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
            Chaves Pix para Saques
          </h3>
          
          {currentUser && (
              <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <User className="text-purple-400" size={20} />
                      <div>
                          <p className="text-sm font-semibold text-white">Chave Padrão para {currentUser.name}</p>
                          <p className="text-xs text-slate-400">Essa chave será selecionada automaticamente ao realizar saques.</p>
                      </div>
                  </div>
                  <select
                    value={currentUser.defaultPixKeyId || ''}
                    onChange={handleDefaultKeyChange}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  >
                      <option value="">Sem padrão</option>
                      {pixKeys.map(k => (
                          <option key={k.id} value={k.id}>{k.name} ({k.key})</option>
                      ))}
                  </select>
              </div>
          )}
          
          <form onSubmit={handleAddPix} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
             <div className="md:col-span-1">
                <input
                  type="text"
                  required
                  value={pixName}
                  onChange={(e) => setPixName(e.target.value)}
                  placeholder="Titular / Nome"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
             </div>
             <div className="md:col-span-1">
                <input
                  type="text"
                  required
                  value={pixBank}
                  onChange={(e) => setPixBank(e.target.value)}
                  placeholder="Banco (ex: Nu, Inter)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
             </div>
             <div className="md:col-span-1">
                <select
                   value={pixKeyType}
                   onChange={(e) => setPixKeyType(e.target.value as any)}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                >
                   <option value="CPF">CPF</option>
                   <option value="CNPJ">CNPJ</option>
                   <option value="EMAIL">Email</option>
                   <option value="TELEFONE">Telefone</option>
                   <option value="ALEATORIA">Aleatória</option>
                </select>
             </div>
             <div className="md:col-span-2 flex gap-2">
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Chave Pix"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg">
                  <Plus size={20} />
                </button>
             </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
             {pixKeys.map((key) => (
                <div key={key.id} className="bg-slate-950/50 border border-slate-800 p-3 rounded-lg flex justify-between items-start group">
                   <div className="flex items-start gap-3">
                      <div className="mt-1 text-purple-400">
                         <Landmark size={18} />
                      </div>
                      <div>
                         <p className="text-sm font-semibold text-slate-200">{key.name}</p>
                         <p className="text-xs text-slate-500">{key.bank}</p>
                         <div className="mt-1 flex gap-1 items-center">
                            <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400">{key.keyType}</span>
                            <span className="text-xs text-slate-300 font-mono">{key.key}</span>
                         </div>
                      </div>
                   </div>
                   <button 
                      onClick={() => handleRemovePix(key.id)}
                      className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>
             ))}
             {pixKeys.length === 0 && (
                 <p className="col-span-full text-center text-slate-500 py-4 italic">Nenhuma chave Pix cadastrada.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};