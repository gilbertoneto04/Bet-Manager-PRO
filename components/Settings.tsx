import React, { useState } from 'react';
import { Trash2, Plus, RotateCcw, Landmark, User, Shield, ShieldCheck, GripVertical, AlertTriangle, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { PixKey, User as UserType } from '../types';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';

interface SettingsProps {
  houses: string[];
  setHouses: (houses: string[]) => void;
  onReorderHouses?: (newHouses: string[]) => void;
  taskTypes: { id?: string, label: string; value: string, order?: number }[];
  setTaskTypes: (types: { label: string; value: string }[]) => void;
  onReorderTypes?: (newTypes: { id?: string, label: string; value: string, order?: number }[]) => void;
  pixKeys: PixKey[];
  setPixKeys: (keys: PixKey[]) => void;
  currentUser: UserType | null;
  users: UserType[]; 
  onUpdateUser: (user: UserType) => void;
  onUpdateUserRole: (userId: string, newRole: 'ADMIN' | 'USER' | 'AGENCIA' | 'KFB') => void;
  onReset?: () => void;
  logAction: (description: string, action: string) => void;
  onClearDatabase?: () => Promise<number>;
}

export const Settings: React.FC<SettingsProps> = ({ 
  houses, 
  setHouses,
  onReorderHouses,
  taskTypes, 
  onReorderTypes,
  pixKeys,
  currentUser, users, onUpdateUser, onUpdateUserRole,
  onReset,
  logAction,
  onClearDatabase
}) => {
  const [newHouse, setNewHouse] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  
  // Pix Form
  const [pixName, setPixName] = useState('');
  const [pixBank, setPixBank] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKey['keyType']>('CPF');
  const [pixKey, setPixKey] = useState('');

  // Drag State
  const [draggedHouseIndex, setDraggedHouseIndex] = useState<number | null>(null);
  const [draggedTypeIndex, setDraggedTypeIndex] = useState<number | null>(null);

  // Danger Zone Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [userCodeInput, setUserCodeInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [deleteMessage, setDeleteMessage] = useState('');

  // --- Houses ---
  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newHouse.trim()) {
      await addDoc(collection(db, 'config_houses'), { name: newHouse.trim(), order: houses.length });
      logAction('Configuração: Casas', `Adicionou a casa: ${newHouse.trim()}`);
      setNewHouse('');
    }
  };

  const handleRemoveHouse = async (houseName: string) => {
    const q = query(collection(db, 'config_houses'), where("name", "==", houseName));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (d) => {
        await deleteDoc(doc(db, 'config_houses', d.id));
    });
    logAction('Configuração: Casas', `Removeu a casa: ${houseName}`);
  };

  const handleHouseDragStart = (e: React.DragEvent, index: number) => {
      setDraggedHouseIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleHouseDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleHouseDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedHouseIndex === null || draggedHouseIndex === targetIndex) return;
      
      const newHouses = [...houses];
      const [draggedItem] = newHouses.splice(draggedHouseIndex, 1);
      newHouses.splice(targetIndex, 0, draggedItem);
      
      if (onReorderHouses) {
          onReorderHouses(newHouses);
      }
      setDraggedHouseIndex(null);
  };

  // --- Task Types ---
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeLabel.trim()) {
      const val = newTypeLabel.trim().toUpperCase().replace(/\s+/g, '_');
      await addDoc(collection(db, 'config_types'), { 
          label: newTypeLabel.trim(), 
          value: val,
          order: taskTypes.length 
      });
      logAction('Configuração: Tipos', `Adicionou o tipo: ${newTypeLabel.trim()}`);
      setNewTypeLabel('');
    }
  };

  const handleRemoveType = async (typeValue: string, typeLabel: string) => {
    const q = query(collection(db, 'config_types'), where("value", "==", typeValue));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (d) => {
        await deleteDoc(doc(db, 'config_types', d.id));
    });
    logAction('Configuração: Tipos', `Removeu o tipo: ${typeLabel}`);
  };

  const handleTypeDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTypeIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTypeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTypeDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedTypeIndex === null || draggedTypeIndex === targetIndex) return;
    
    const newTypes = [...taskTypes];
    const [draggedItem] = newTypes.splice(draggedTypeIndex, 1);
    newTypes.splice(targetIndex, 0, draggedItem);
    
    if (onReorderTypes) {
        onReorderTypes(newTypes);
    }
    setDraggedTypeIndex(null);
  };

  // --- Pix Keys ---
  const handleAddPix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pixName && pixBank && pixKey) {
        const newPix = {
            name: pixName,
            bank: pixBank,
            keyType: pixKeyType,
            key: pixKey
        };
        await addDoc(collection(db, 'pixKeys'), newPix);
        logAction('Configuração: Pix', `Adicionou chave Pix: ${pixName} (${pixBank})`);
        setPixName('');
        setPixBank('');
        setPixKey('');
    }
  };

  const handleRemovePix = async (id: string, name: string) => {
      await deleteDoc(doc(db, 'pixKeys', id));
      logAction('Configuração: Pix', `Removeu chave Pix: ${name}`);
  };

  const handleDefaultKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (currentUser) {
          const newUser = { ...currentUser, defaultPixKeyId: e.target.value };
          onUpdateUser(newUser);
          logAction('Configuração: Usuário', 'Alterou a chave Pix padrão');
      }
  };

  // --- Danger Zone Logic ---
  const openDeleteModal = () => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setDeleteCode(code);
      setUserCodeInput('');
      setDeleteStatus('IDLE');
      setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
      if (userCodeInput !== deleteCode) {
          setDeleteStatus('ERROR');
          setDeleteMessage('Código incorreto.');
          return;
      }

      if (onClearDatabase) {
          setIsDeleting(true);
          try {
              const count = await onClearDatabase();
              setDeleteStatus('SUCCESS');
              setDeleteMessage(`Limpeza concluída! ${count} itens removidos.`);
              setTimeout(() => {
                  setIsDeleteModalOpen(false);
                  setIsDeleting(false);
              }, 2000);
          } catch (e: any) {
              setDeleteStatus('ERROR');
              setDeleteMessage(`Erro: ${e.message}`);
              setIsDeleting(false);
          }
      }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2">Configurações</h2>
           <p className="text-slate-400">Gerencie as opções disponíveis no sistema.</p>
        </div>
        {onReset && (
            <button 
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-500 transition-all text-sm w-full md:w-auto justify-center"
            >
                <RotateCcw size={16} />
                Restaurar Padrões
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* User Management Section */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                Gestão de Usuários ({users.length})
             </h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm min-w-[600px]">
                     <thead className="text-slate-500 font-medium border-b border-slate-800">
                         <tr>
                             <th className="pb-3 pl-2">Nome</th>
                             <th className="pb-3">Usuário</th>
                             <th className="pb-3">Email</th>
                             <th className="pb-3">Função</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                         {users.map(u => (
                             <tr key={u.id}>
                                 <td className="py-3 pl-2 text-white font-medium">{u.name}</td>
                                 <td className="py-3 text-slate-300">@{u.username}</td>
                                 <td className="py-3 text-slate-400">{u.email}</td>
                                 <td className="py-3">
                                     {currentUser?.role === 'ADMIN' && currentUser.id !== u.id ? (
                                        <select 
                                            value={u.role}
                                            onChange={(e) => onUpdateUserRole(u.id, e.target.value as any)}
                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                        >
                                            <option value="AGENCIA">AGENCIA</option>
                                            <option value="KFB">KFB</option>
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                     ) : (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>
                                            {u.role === 'ADMIN' ? <ShieldCheck size={12}/> : <Shield size={12}/>}
                                            {u.role}
                                        </span>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* Houses Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                Casas de Aposta 
              </h3>
              <span className="text-[10px] text-slate-500 max-w-[120px] text-right">Arraste para reordenar a lista globalmente</span>
          </div>
          
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
              <div 
                key={house} 
                draggable
                onDragStart={(e) => handleHouseDragStart(e, idx)}
                onDragOver={handleHouseDragOver}
                onDrop={(e) => handleHouseDrop(e, idx)}
                className={`flex items-center justify-between bg-slate-950/50 border border-slate-800 p-3 rounded-lg group cursor-move touch-none ${draggedHouseIndex === idx ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                    <GripVertical size={16} className="text-slate-600" />
                    <span className="text-slate-300">{house}</span>
                </div>
                <button 
                  onClick={() => handleRemoveHouse(house)}
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
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Tipos de Pendência
              </h3>
              <span className="text-[10px] text-slate-500 max-w-[120px] text-right">Arraste para reordenar</span>
          </div>
          
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
              <div 
                key={type.id || idx}
                draggable
                onDragStart={(e) => handleTypeDragStart(e, idx)}
                onDragOver={handleTypeDragOver}
                onDrop={(e) => handleTypeDrop(e, idx)}
                className={`flex items-center justify-between bg-slate-950/50 border border-slate-800 p-3 rounded-lg group cursor-move touch-none ${draggedTypeIndex === idx ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                   <GripVertical size={16} className="text-slate-600" />
                   <div>
                       <span className="text-slate-300 block">{type.label}</span>
                       <span className="text-slate-600 text-[10px] font-mono">{type.value}</span>
                   </div>
                </div>
                <button 
                  onClick={() => handleRemoveType(type.value, type.label)}
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
              <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <User className="text-purple-400 shrink-0" size={20} />
                      <div>
                          <p className="text-sm font-semibold text-white">Chave Padrão para {currentUser.name}</p>
                          <p className="text-xs text-slate-400">Essa chave será selecionada automaticamente ao realizar saques.</p>
                      </div>
                  </div>
                  <select
                    value={currentUser.defaultPixKeyId || ''}
                    onChange={handleDefaultKeyChange}
                    className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
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
                  placeholder="Banco (ex: Nu)"
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
                   <option value="TELEFONE">Tel</option>
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
                <div key={key.id} className="bg-slate-950/50 border border-slate-800 p-3 rounded-lg flex justify-between items-start group min-w-0">
                   <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-1 text-purple-400 shrink-0">
                         <Landmark size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                         <p className="text-sm font-semibold text-slate-200 truncate">{key.name}</p>
                         <p className="text-xs text-slate-500 truncate">{key.bank}</p>
                         <div className="mt-1 flex gap-1 items-center min-w-0">
                            <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400 shrink-0">{key.keyType}</span>
                            <span className="text-xs text-slate-300 font-mono break-all line-clamp-2" title={key.key}>{key.key}</span>
                         </div>
                      </div>
                   </div>
                   <button 
                      onClick={() => handleRemovePix(key.id, key.name)}
                      className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
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

      {/* Danger Zone Trigger */}
      {currentUser?.role === 'ADMIN' && onClearDatabase && (
          <div className="mt-12 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl animate-fadeIn">
              <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                      <AlertTriangle size={24} />
                  </div>
                  <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-500 mb-1">Zona de Perigo</h3>
                      <p className="text-sm text-red-400/80 mb-4">
                          Ações nesta área são irreversíveis. Tenha certeza absoluta antes de prosseguir.
                      </p>
                      
                      <div className="flex items-center gap-4 flex-wrap">
                          <button 
                              onClick={openDeleteModal}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-red-500/10"
                          >
                              Limpar Todos os Dados Operacionais
                          </button>
                          <span className="text-xs text-slate-500">
                              Apaga: Pendências, Contas, Packs e Histórico. Mantém: Usuários e Configurações (Casas/Tipos).
                          </span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Danger Zone Modal */}
      {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                      <X size={20}/>
                  </button>

                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-pulse">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Confirmação de Segurança</h3>
                      <p className="text-sm text-slate-400">
                          Você está prestes a apagar <strong>TODOS</strong> os dados operacionais. Esta ação não pode ser desfeita.
                      </p>
                  </div>

                  {deleteStatus === 'SUCCESS' ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center justify-center gap-2 mb-4">
                          <CheckCircle2 size={20} />
                          <span>{deleteMessage}</span>
                      </div>
                  ) : deleteStatus === 'ERROR' ? (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-center gap-2 mb-4">
                          <AlertCircle size={20} />
                          <span>{deleteMessage}</span>
                      </div>
                  ) : (
                      <>
                          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Código de Confirmação</p>
                              <div className="text-3xl font-mono font-bold text-white tracking-widest bg-slate-900 py-2 rounded-lg border border-slate-800 select-all">
                                  {deleteCode}
                              </div>
                          </div>

                          <input
                              type="text"
                              value={userCodeInput}
                              onChange={(e) => setUserCodeInput(e.target.value)}
                              placeholder="Digite o código acima"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-center font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-4"
                          />

                          <button
                              onClick={handleConfirmDelete}
                              disabled={!userCodeInput || isDeleting}
                              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                          >
                              {isDeleting ? 'Apagando dados...' : 'Confirmar Limpeza Total'}
                          </button>
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};