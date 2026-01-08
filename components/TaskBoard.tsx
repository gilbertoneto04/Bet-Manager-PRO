import React, { useMemo, useState, useEffect } from 'react';
import { Task, TaskStatus, TaskType, Pack, PixKey, User } from '../types';
import { TASK_STATUS_LABELS } from '../constants';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Clock, PlayCircle, Plus, LayoutList, Layers, Trash2, AlertOctagon, Package, Landmark, Pencil, X, GripVertical, RotateCcw } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  packs: Pack[];
  pixKeys: PixKey[];
  currentUser: User | null;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (taskId: string, updates: Partial<Task>) => void;
  onFinishNewAccountTask: (taskId: string, accountsData: { name: string; email: string; depositValue: number }[], packId?: string) => void;
  onDeleteTask: (taskId: string, reason?: string) => void;
  onReorderTasks: (draggedId: string, targetId: string) => void;
  availableTypes: { label: string, value: string }[];
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, packs, pixKeys, currentUser, onUpdateStatus, onEditTask, onFinishNewAccountTask, onDeleteTask, onReorderTasks, availableTypes }) => {
  // Default filter is 'UNFINISHED' (Não Finalizadas)
  const [filter, setFilter] = React.useState<'ALL' | 'UNFINISHED' | TaskStatus>('UNFINISHED');
  
  // Modal State for New Account Completion
  const [finishingTask, setFinishingTask] = useState<Task | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'SELECT' | 'FULL' | 'PARTIAL'>('SELECT');
  const [deliveredQuantity, setDeliveredQuantity] = useState<number>(0);
  const [accountDetails, setAccountDetails] = useState<{ name: string; email: string; depositValue: number }[]>([]);
  
  // Pack Selection Logic
  const [usePack, setUsePack] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  
  // Modal State for Deletion
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Modal State for Editing Pix
  const [editingPixTask, setEditingPixTask] = useState<Task | null>(null);
  const [pixSelectionMode, setPixSelectionMode] = useState<'SAVED' | 'NEW'>('SAVED');
  const [selectedPixId, setSelectedPixId] = useState('');
  const [newPixString, setNewPixString] = useState('');

  // DnD State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Reset pack selection when modal opens
  useEffect(() => {
    if (finishingTask) {
        // Find active packs for this house
        const housePacks = packs.filter(p => p.house === finishingTask.house && p.status === 'ACTIVE');
        if (housePacks.length > 0) {
            setSelectedPackId(housePacks[0].id);
            setUsePack(true);
        } else {
            setSelectedPackId('');
            setUsePack(false);
        }
    }
  }, [finishingTask, packs]);

  // Auto-select default pix key when editing pix modal opens
  useEffect(() => {
    if (editingPixTask) {
        if (currentUser?.defaultPixKeyId) {
            setPixSelectionMode('SAVED');
            setSelectedPixId(currentUser.defaultPixKeyId);
        } else {
            setPixSelectionMode('SAVED');
            setSelectedPixId('');
        }
    }
  }, [editingPixTask, currentUser]);

  const filteredTasks = useMemo(() => {
    // Tasks are already sorted by App.tsx, but filter keeps order
    let list = [...tasks];
    
    if (filter === 'ALL') {
        return list.filter(t => t.status !== TaskStatus.EXCLUIDA);
    }
    
    if (filter === 'UNFINISHED') return list.filter(t => t.status !== TaskStatus.FINALIZADA && t.status !== TaskStatus.EXCLUIDA);
    
    return list.filter(t => t.status === filter);
  }, [tasks, filter]);

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
    // Needed for Firefox to allow drag
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData('taskId');
    if (sourceTaskId && sourceTaskId !== targetTaskId) {
        onReorderTasks(sourceTaskId, targetTaskId);
    }
    setDraggedTaskId(null);
  };

  const handleAction = (task: Task, action: 'SOLICITADA' | 'PENDENTE' | 'FINALIZADA') => {
    onUpdateStatus(task.id, action as TaskStatus);
  };

  const handleSavePixEdit = () => {
    if (editingPixTask) {
        let newPixInfo = '';
        if (pixSelectionMode === 'NEW') {
            newPixInfo = newPixString ? `Chave Pix (Manual): ${newPixString}` : '';
        } else {
            const key = pixKeys.find(k => k.id === selectedPixId);
            newPixInfo = key ? `Chave Pix (${key.name} - ${key.bank}): ${key.key}` : '';
        }
        
        if (newPixInfo) {
             onEditTask(editingPixTask.id, { pixKeyInfo: newPixInfo });
        }
        setEditingPixTask(null);
        setSelectedPixId('');
        setNewPixString('');
    }
  };

  const initDelivery = (task: Task, mode: 'FULL' | 'PARTIAL') => {
    const qty = mode === 'FULL' ? (task.quantity || 1) : 1;
    
    setFinishingTask(task);
    setDeliveryMode(mode);
    setDeliveredQuantity(qty);
    setAccountDetails(Array(qty).fill({ name: '', email: '', depositValue: 0 }));
  };

  const handleAccountDetailChange = (index: number, field: string, value: string | number) => {
    const newDetails = [...accountDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setAccountDetails(newDetails);
  };

  const handleQuantityChange = (qty: number) => {
    if (qty < 1) qty = 1;
    if (finishingTask && qty > (finishingTask.quantity || 1)) qty = finishingTask.quantity || 1;

    setDeliveredQuantity(qty);
    const newDetails = [...accountDetails];
    if (qty > newDetails.length) {
      for (let i = newDetails.length; i < qty; i++) {
        newDetails.push({ name: '', email: '', depositValue: 0 });
      }
    } else {
      newDetails.length = qty;
    }
    setAccountDetails(newDetails);
  };

  const submitFinishAccount = () => {
    if (finishingTask) {
      if (accountDetails.some(acc => !acc.name || !acc.email)) {
        alert("Por favor, preencha todos os campos obrigatórios (Nome e Email).");
        return;
      }
      onFinishNewAccountTask(
          finishingTask.id, 
          accountDetails, 
          usePack && selectedPackId ? selectedPackId : undefined
      );
      setFinishingTask(null);
    }
  };

  const initDeletion = (task: Task) => {
    setDeletingTask(task);
    setDeletionReason('');
  };

  const confirmDeletion = () => {
    if (deletingTask) {
        onDeleteTask(deletingTask.id, deletionReason);
        setDeletingTask(null);
        setDeletionReason('');
    }
  };

  const FilterButton = ({ label, value, count }: { label: string, value: 'ALL' | 'UNFINISHED' | TaskStatus, count: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
        filter === value
          ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      {label}
      <span className={`px-2 py-0.5 rounded-md text-xs ${filter === value ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
        {count}
      </span>
    </button>
  );

  const getTypeLabel = (typeValue: string) => {
    const found = availableTypes.find(t => t.value === typeValue);
    return found ? found.label : typeValue;
  };

  const renderTaskActions = (task: Task) => {
    if (task.status === TaskStatus.EXCLUIDA) {
        return (
            <div className="col-span-2 space-y-2">
                <div className="text-center text-xs text-red-400 bg-red-500/5 py-2 rounded border border-red-500/10">
                    Excluída em {new Date(task.updatedAt).toLocaleDateString()}
                    {task.deletionReason && <span className="block mt-1 italic text-slate-500">"{task.deletionReason}"</span>}
                </div>
                <button
                    onClick={() => handleAction(task, 'PENDENTE')}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                >
                    <RotateCcw size={14} />
                    Recuperar Pendência
                </button>
            </div>
        );
    }

    if (task.status === TaskStatus.FINALIZADA) {
        return (
            <button
                onClick={() => handleAction(task, 'SOLICITADA')}
                className="col-span-2 flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-medium transition-colors"
            >
                Reabrir (Marcar Solicitada)
            </button>
        );
    }

    if (task.type === TaskType.CONTA_NOVA) {
        return (
            <div className="col-span-2 grid grid-cols-2 gap-2">
                 <button
                    onClick={() => initDelivery(task, 'PARTIAL')}
                    className="flex items-center justify-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium transition-colors"
                 >
                    <Layers size={16} />
                    Entregar Parcial
                 </button>
                 <button
                    onClick={() => initDelivery(task, 'FULL')}
                    className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                 >
                    <CheckCircle2 size={16} />
                    Finalizar (Tudo)
                 </button>
            </div>
        );
    }

    if (task.status === TaskStatus.PENDENTE) {
        return (
            <>
                <button
                    onClick={() => handleAction(task, 'SOLICITADA')}
                    className="flex items-center justify-center gap-2 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                    <PlayCircle size={16} />
                    Solicitada
                </button>
                <button
                    onClick={() => handleAction(task, 'FINALIZADA')}
                    className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                    <CheckCircle2 size={16} />
                    Finalizar
                </button>
            </>
        );
    }

    if (task.status === TaskStatus.SOLICITADA) {
        return (
             <>
                <button
                onClick={() => handleAction(task, 'PENDENTE')}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm font-medium transition-colors"
                >
                <Clock size={16} />
                Voltar
                </button>
                <button
                onClick={() => handleAction(task, 'FINALIZADA')}
                className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                <CheckCircle2 size={16} />
                Finalizar
                </button>
            </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Quadro de Pendências</h2>
          <p className="text-slate-400 text-sm mt-1">Gerencie o fluxo de solicitações da operação (Arraste para reordenar)</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
            <FilterButton 
                label="Não Finalizadas" 
                value="UNFINISHED" 
                count={tasks.filter(t => t.status !== TaskStatus.FINALIZADA && t.status !== TaskStatus.EXCLUIDA).length} 
            />
            <FilterButton label="Todas" value="ALL" count={tasks.filter(t => t.status !== TaskStatus.EXCLUIDA).length} />
            <FilterButton label="Pendentes" value={TaskStatus.PENDENTE} count={tasks.filter(t => t.status === TaskStatus.PENDENTE).length} />
            <FilterButton label="Solicitadas" value={TaskStatus.SOLICITADA} count={tasks.filter(t => t.status === TaskStatus.SOLICITADA).length} />
            <FilterButton label="Finalizadas" value={TaskStatus.FINALIZADA} count={tasks.filter(t => t.status === TaskStatus.FINALIZADA).length} />
            <FilterButton label="Excluídas" value={TaskStatus.EXCLUIDA} count={tasks.filter(t => t.status === TaskStatus.EXCLUIDA).length} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
           <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 text-slate-500">
               {filter === TaskStatus.EXCLUIDA ? <Trash2 size={32} /> : <CheckCircle2 size={32} />}
             </div>
             <h3 className="text-lg font-medium text-slate-300">
                {filter === TaskStatus.EXCLUIDA ? 'Lixeira vazia' : 'Nenhuma pendência encontrada'}
             </h3>
             <p className="text-slate-500 text-sm">Nesta seção não há itens para exibir.</p>
           </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, task.id)}
              className={`group bg-slate-900 border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between relative cursor-grab active:cursor-grabbing ${
                  task.status === TaskStatus.EXCLUIDA ? 'border-red-900/30 opacity-70' : 'border-slate-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
              } ${draggedTaskId === task.id ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
            >
              {task.status !== TaskStatus.EXCLUIDA && (
                  <button 
                    onClick={() => initDeletion(task)}
                    className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Excluir Solicitação"
                  >
                      <Trash2 size={16} />
                  </button>
              )}
              
              <div className="absolute top-1/2 left-1 -translate-y-1/2 text-slate-700 opacity-0 group-hover:opacity-50">
                 <GripVertical size={16} />
              </div>

              <div>
                <div className="flex justify-between items-start mb-4 pl-2">
                  <StatusBadge status={task.status} />
                  <span className="text-xs text-slate-500 font-mono pr-6">
                    {new Date(task.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mb-4 pl-2">
                  <h3 className="text-lg font-semibold text-slate-200 mb-1">{getTypeLabel(task.type)}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                      {task.house}
                    </span>
                    {task.type === TaskType.CONTA_NOVA ? (
                      <span className="text-indigo-400 font-medium">
                        {task.quantity} {task.quantity === 1 ? 'conta' : 'contas'}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-500">{task.accountName}</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-3 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-800 italic">
                      "{task.description}"
                    </p>
                  )}
                  {task.pixKeyInfo && (
                      <div className="mt-3 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 p-2 rounded-lg flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                             <Landmark size={14} className="mt-0.5" />
                             <span className="whitespace-pre-wrap">{task.pixKeyInfo}</span>
                          </div>
                          {task.status !== TaskStatus.FINALIZADA && task.status !== TaskStatus.EXCLUIDA && (
                              <button onClick={() => setEditingPixTask(task)} className="p-1 hover:bg-purple-500/20 rounded transition-colors" title="Editar Pix">
                                  <Pencil size={12} />
                              </button>
                          )}
                      </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 pl-2">
                {renderTaskActions(task)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Pix Modal */}
      {editingPixTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Landmark size={20} className="text-purple-400"/>
                        Editar Chave Pix
                    </h3>
                    <button onClick={() => setEditingPixTask(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                
                <div className="space-y-4">
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
                    
                    <button 
                        onClick={handleSavePixEdit}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        Salvar Alteração
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* New Account Completion Modal */}
      {finishingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-white">Finalizar Entrega de Contas</h3>
               <button onClick={() => setFinishingTask(null)} className="text-slate-400 hover:text-white"><Plus className="rotate-45" /></button>
             </div>
             
             {/* Stats & Quantity */}
             <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-sm text-indigo-200">
                        Solicitado: <strong>{finishingTask.quantity}</strong> | Entregando: <strong>{deliveredQuantity}</strong>
                    </p>
                    {deliveryMode === 'PARTIAL' && (
                        <p className="text-xs text-amber-400 mt-1">
                            Restarão { (finishingTask.quantity || 1) - deliveredQuantity } contas pendentes.
                        </p>
                    )}
                </div>
                {deliveryMode === 'PARTIAL' && (
                    <div className="flex items-center gap-2">
                    <span className="text-xs uppercase text-slate-500 font-bold">Qtd:</span>
                    <input 
                        type="number" 
                        min="1"
                        max={finishingTask.quantity}
                        value={deliveredQuantity} 
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-center font-bold"
                    />
                    </div>
                )}
            </div>

            {/* Pack Selection Section */}
            <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
               <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                       <Package size={18} className="text-slate-400" />
                       <span className="text-sm font-medium text-slate-200">Reduzir do Pack</span>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={usePack} 
                            onChange={(e) => setUsePack(e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                   </label>
               </div>
               
               {usePack && (
                   <div>
                       <select 
                          value={selectedPackId}
                          onChange={(e) => setSelectedPackId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                       >
                           <option value="">Selecione um pack...</option>
                           {packs
                              .filter(p => p.house === finishingTask.house && p.status === 'ACTIVE')
                              .map(p => (
                               <option key={p.id} value={p.id}>
                                   Pack de {p.quantity} (Restam {p.quantity - p.delivered})
                               </option>
                           ))}
                       </select>
                       {packs.filter(p => p.house === finishingTask.house && p.status === 'ACTIVE').length === 0 && (
                           <p className="text-xs text-red-400 mt-2">Nenhum pack ativo encontrado para {finishingTask.house}.</p>
                       )}
                   </div>
               )}
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
            {accountDetails.map((acc, idx) => (
                <div key={idx} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                <h4 className="text-sm font-semibold text-indigo-400 mb-3">Conta #{idx + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="text-xs text-slate-500 mb-1 block">Nome / Login</label>
                    <input 
                        type="text" 
                        value={acc.name}
                        onChange={(e) => handleAccountDetailChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    </div>
                    <div>
                    <label className="text-xs text-slate-500 mb-1 block">Email</label>
                    <input 
                        type="text" 
                        value={acc.email}
                        onChange={(e) => handleAccountDetailChange(idx, 'email', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    </div>
                    <div className="md:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Valor Depositado (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={acc.depositValue}
                        onChange={(e) => handleAccountDetailChange(idx, 'depositValue', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    </div>
                </div>
                </div>
            ))}
            </div>

            <div className="mt-6 flex gap-3">
            <button onClick={submitFinishAccount} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Confirmar Entrega
            </button>
            <button onClick={() => setFinishingTask(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                Cancelar
            </button>
            </div>
           </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {deletingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                    <AlertOctagon size={24} />
                    <h3 className="text-xl font-bold text-white">Excluir Solicitação</h3>
                </div>
                
                <p className="text-slate-300 mb-4">
                    Tem certeza que deseja excluir esta pendência de <strong>{getTypeLabel(deletingTask.type)}</strong>?
                    <br/><span className="text-xs text-slate-500">Ela será movida para a aba "Excluídas".</span>
                </p>

                <div className="mb-6">
                    <label className="text-xs font-medium text-slate-400 mb-2 block">Motivo da Exclusão (Opcional)</label>
                    <textarea
                        rows={3}
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        placeholder="Ex: Criada por engano, duplicada..."
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
                        onClick={() => setDeletingTask(null)}
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