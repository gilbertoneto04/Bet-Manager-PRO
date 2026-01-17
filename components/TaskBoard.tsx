import React, { useMemo, useState, useEffect } from 'react';
import { Task, TaskStatus, TaskType, Pack, PixKey, User as UserType, LogEntry, Account } from '../types';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Clock, PlayCircle, Plus, Layers, Trash2, AlertOctagon, Package, Landmark, Pencil, X, GripVertical, RotateCcw, User, Info, Save, Filter, Copy, Phone, DollarSign, Key, CreditCard, Calendar } from 'lucide-react';
import { ACCOUNT_STATUS_LABELS } from '../constants';

interface TaskBoardProps {
  tasks: Task[];
  packs: Pack[];
  pixKeys: PixKey[];
  currentUser: UserType | null;
  users?: UserType[]; 
  onUpdateStatus: (taskId: string, newStatus: TaskStatus, agentId?: string) => void;
  onEditTask: (taskId: string, updates: Partial<Task>) => void;
  onFinishNewAccountTask: (taskId: string, accountsData: { name: string; email: string; depositValue: number, username?: string, password?: string, card?: string, owner?: string }[], packId?: string) => void;
  onDeleteTask: (taskId: string, reason?: string) => void;
  onReorderTasks: (draggedId: string, targetId: string) => void;
  availableTypes: { label: string, value: string }[];
  logs?: LogEntry[]; 
  accounts: Account[];
  availableHouses: string[];
  onLogActivity?: (context: string, action: string) => void;
}

// Helper for House Colors
const getHouseStyles = (houseName: string) => {
    const normalized = houseName.toLowerCase().replace(/\s/g, '');
    
    if (normalized.includes('betano')) return 'bg-orange-600 text-white border-orange-500/50 shadow-orange-900/20';
    if (normalized.includes('bet365')) return 'bg-emerald-700 text-white border-emerald-600/50 shadow-emerald-900/20';
    if (normalized.includes('estrela')) return 'bg-yellow-400 text-blue-900 border-yellow-300/50 shadow-yellow-900/20 font-bold';
    if (normalized.includes('kto')) return 'bg-red-600 text-white border-red-500/50 shadow-red-900/20';
    if (normalized.includes('novibet')) return 'bg-cyan-900 text-white border-cyan-700/50 shadow-cyan-900/20';
    if (normalized.includes('stake')) return 'bg-slate-700 text-white border-slate-600/50 shadow-slate-900/20';
    if (normalized.includes('sporting')) return 'bg-blue-600 text-white border-blue-500/50 shadow-blue-900/20';
    
    // Default Style
    return 'bg-slate-800 text-slate-300 border-slate-700 shadow-slate-900/20';
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, packs, pixKeys, currentUser, users, onUpdateStatus, onEditTask, onFinishNewAccountTask, onDeleteTask, onReorderTasks, availableTypes, logs, accounts, availableHouses, onLogActivity }) => {
  // Default filter is 'UNFINISHED' (Não Finalizadas)
  const [filter, setFilter] = React.useState<'ALL' | 'UNFINISHED' | TaskStatus>('UNFINISHED');
  
  // Advanced Filters
  const [filterOwner, setFilterOwner] = useState<string>('ALL');
  const [filterHouse, setFilterHouse] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal State for New Account Completion
  const [finishingTask, setFinishingTask] = useState<Task | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'SELECT' | 'FULL' | 'PARTIAL'>('SELECT');
  const [deliveredQuantity, setDeliveredQuantity] = useState<number>(0);
  const [accountDetails, setAccountDetails] = useState<{ name: string; email: string; depositValue: number | undefined, username: string, password?: string, card?: string, owner: string }[]>([]);
  
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

  // Modal State for General Edit
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editType, setEditType] = useState('');
  const [editHouse, setEditHouse] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editPixInfo, setEditPixInfo] = useState('');
  
  // Modal State for History (Info Button)
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  // Modal State for Account Details (Read Only)
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);

  // DnD State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // KFB Selection Logic
  const [kfbTaskToFinish, setKfbTaskToFinish] = useState<Task | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Unique Owners List for Filter
  const uniqueOwners = useMemo(() => {
      const owners = new Set<string>();
      tasks.forEach(t => {
          if (t.createdBy) owners.add(t.createdBy);
      });
      return Array.from(owners).sort();
  }, [tasks]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close any open modal
        setFinishingTask(null);
        setDeletingTask(null);
        setEditingPixTask(null);
        setTaskToEdit(null);
        setHistoryTask(null);
        setViewingAccount(null);
        setKfbTaskToFinish(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pack Selection & Owner Logic when finishing
  useEffect(() => {
    if (finishingTask) {
        // Find active packs for this house
        const housePacks = packs.filter(p => p.house === finishingTask.house && p.status === 'ACTIVE' && (p.quantity - p.delivered) > 0);
        if (housePacks.length > 0) {
            setSelectedPackId(housePacks[0].id);
            setUsePack(true); // Default to true
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

  // 1. First, apply Advanced Filters (Owner, House, Type) to get a base list.
  // This list is used to calculate counts for the buttons.
  const baseFilteredTasks = useMemo(() => {
    let list = [...tasks];
    if (filterOwner !== 'ALL') {
        list = list.filter(t => t.createdBy === filterOwner);
    }
    if (filterHouse !== 'ALL') {
        list = list.filter(t => t.house === filterHouse);
    }
    if (filterType !== 'ALL') {
        list = list.filter(t => t.type === filterType);
    }
    return list;
  }, [tasks, filterOwner, filterHouse, filterType]);

  // 2. Then apply the Status Filter (Active Tab) to get the final list to render
  const finalRenderTasks = useMemo(() => {
    let list = [...baseFilteredTasks];
    if (filter === 'ALL') {
        list = list.filter(t => t.status !== TaskStatus.EXCLUIDA);
    } else if (filter === 'UNFINISHED') {
        list = list.filter(t => t.status !== TaskStatus.FINALIZADA && t.status !== TaskStatus.EXCLUIDA);
    } else {
        list = list.filter(t => t.status === filter);
    }
    return list;
  }, [baseFilteredTasks, filter]);

  // Activity Logging Logic for Filter Changes
  const handleFilterChange = (type: string, value: string) => {
      if (onLogActivity) {
          onLogActivity('Filtro Pendências', `Alterou filtro ${type} para: ${value}`);
      }
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData('taskId');
    if (sourceTaskId && sourceTaskId !== targetTaskId) {
        onReorderTasks(sourceTaskId, targetTaskId);
    }
    setDraggedTaskId(null);
  };

  const handleCardClick = (e: React.MouseEvent, task: Task) => {
      // Find account logic
      if (task.accountName) {
          const acc = accounts.find(a => a.name === task.accountName && a.house === task.house);
          if (acc) {
              setViewingAccount(acc);
              if (onLogActivity) onLogActivity('Interação', `Visualizou detalhes da conta: ${acc.name}`);
          }
      }
  };

  const handleAction = (task: Task, action: 'SOLICITADA' | 'PENDENTE' | 'FINALIZADA') => {
    if (action === 'FINALIZADA' && currentUser?.role === 'KFB') {
        setKfbTaskToFinish(task);
        setSelectedAgentId('');
        return;
    }
    onUpdateStatus(task.id, action as TaskStatus);
  };

  const confirmKfbFinish = () => {
      if (kfbTaskToFinish) {
          if (!selectedAgentId) {
              alert("Por favor, selecione qual Agência finalizou a tarefa.");
              return;
          }
          onUpdateStatus(kfbTaskToFinish.id, TaskStatus.FINALIZADA, selectedAgentId);
          setKfbTaskToFinish(null);
          setSelectedAgentId('');
      }
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
  
  // General Edit Handlers
  const initGeneralEdit = (task: Task) => {
      setTaskToEdit(task);
      setEditType(task.type);
      setEditHouse(task.house);
      setEditDescription(task.description || '');
      setEditQuantity(task.quantity || 1);
      setEditPixInfo(task.pixKeyInfo || '');
      
      if (task.accountName) {
          const acc = accounts.find(a => a.name === task.accountName && a.house === task.house);
          setEditAccountId(acc ? acc.id : '');
      } else {
          setEditAccountId('');
      }
  };
  
  const handleSaveGeneralEdit = () => {
      if (taskToEdit) {
          let updatedAccountName = undefined;
          
          if (editAccountId) {
              const acc = accounts.find(a => a.id === editAccountId);
              if (acc) updatedAccountName = acc.name;
          }

          onEditTask(taskToEdit.id, {
              type: editType,
              house: editHouse,
              accountName: updatedAccountName,
              description: editDescription,
              quantity: editType === TaskType.CONTA_NOVA ? editQuantity : undefined,
              pixKeyInfo: editPixInfo
          });
          setTaskToEdit(null);
      }
  };

  const initDelivery = (task: Task, mode: 'FULL' | 'PARTIAL') => {
    const qty = mode === 'FULL' ? (task.quantity || 1) : 1;
    const defaultOwner = task.createdBy || '';
    
    setFinishingTask(task);
    setDeliveryMode(mode);
    setDeliveredQuantity(qty);
    setAccountDetails(Array(qty).fill({ name: '', email: '', depositValue: 0, username: '', password: '', card: '', owner: defaultOwner }));
  };

  const handleAccountDetailChange = (index: number, field: string, value: string | number | undefined) => {
    const newDetails = [...accountDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setAccountDetails(newDetails);
  };

  const handleQuantityChange = (qty: number) => {
    if (qty < 1) qty = 1;
    if (finishingTask && qty > (finishingTask.quantity || 1)) qty = finishingTask.quantity || 1;
    
    const defaultOwner = finishingTask?.createdBy || '';

    setDeliveredQuantity(qty);
    const newDetails = [...accountDetails];
    if (qty > newDetails.length) {
      for (let i = newDetails.length; i < qty; i++) {
        newDetails.push({ name: '', email: '', depositValue: 0, username: '', password: '', card: '', owner: defaultOwner });
      }
    } else {
      newDetails.length = qty;
    }
    setAccountDetails(newDetails);
  };

  const submitFinishAccount = () => {
    if (finishingTask) {
      if (currentUser?.role !== 'ADMIN' && (!usePack || !selectedPackId)) {
         alert("Membros da agência devem utilizar um Pack ativo para entregar contas.");
         return;
      }

      if (accountDetails.some(acc => !acc.name || !acc.email)) {
        alert("Por favor, preencha todos os campos obrigatórios (Nome e Email).");
        return;
      }
      
      // Sanitize depositValue to ensure it is a number when saving
      const sanitizedDetails = accountDetails.map(d => ({
          ...d,
          depositValue: d.depositValue ?? 0
      }));

      onFinishNewAccountTask(
          finishingTask.id, 
          sanitizedDetails, 
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
      onClick={() => {
          setFilter(value);
          handleFilterChange('Status', value);
      }}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
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

  const getFilteredLogs = (task: Task) => {
      if (!logs) return [];
      // Match by TaskID or if the description contains task type/house info
      return logs.filter(l => l.taskId === task.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
                    onClick={(e) => { e.stopPropagation(); handleAction(task, 'PENDENTE'); }}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                >
                    <RotateCcw size={14} />
                    Recuperar Pendência
                </button>
            </div>
        );
    }

    if (task.status === TaskStatus.FINALIZADA) {
        const finishedAgent = users?.find(u => u.id === task.finishedBy);
        
        return (
            <div className="col-span-2">
                {finishedAgent && (
                    <div className="mb-2 text-center text-[10px] text-emerald-500/70">
                        Finalizada por: {finishedAgent.name}
                    </div>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); handleAction(task, 'SOLICITADA'); }}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-medium transition-colors"
                >
                    Reabrir (Marcar Solicitada)
                </button>
            </div>
        );
    }

    if (task.type === TaskType.CONTA_NOVA) {
        return (
            <div className="col-span-2 grid grid-cols-2 gap-2">
                 <button
                    onClick={(e) => { e.stopPropagation(); initDelivery(task, 'PARTIAL'); }}
                    className="flex items-center justify-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium transition-colors"
                 >
                    <Layers size={16} />
                    Entregar Parcial
                 </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); initDelivery(task, 'FULL'); }}
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
                    onClick={(e) => { e.stopPropagation(); handleAction(task, 'SOLICITADA'); }}
                    className="flex items-center justify-center gap-2 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                    <PlayCircle size={16} />
                    Solicitada
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleAction(task, 'FINALIZADA'); }}
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
                onClick={(e) => { e.stopPropagation(); handleAction(task, 'PENDENTE'); }}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm font-medium transition-colors"
                >
                <Clock size={16} />
                Voltar
                </button>
                <button
                onClick={(e) => { e.stopPropagation(); handleAction(task, 'FINALIZADA'); }}
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
          <p className="text-slate-400 text-sm mt-1">Gerencie o fluxo de solicitações da operação</p>
        </div>
        
        <div className="w-full sm:w-auto overflow-x-auto pb-2 -mb-2">
            <div className="flex gap-2 min-w-max">
                <FilterButton 
                    label="Não Finalizadas" 
                    value="UNFINISHED" 
                    count={baseFilteredTasks.filter(t => t.status !== TaskStatus.FINALIZADA && t.status !== TaskStatus.EXCLUIDA).length} 
                />
                <FilterButton label="Todas" value="ALL" count={baseFilteredTasks.filter(t => t.status !== TaskStatus.EXCLUIDA).length} />
                <FilterButton label="Pendentes" value={TaskStatus.PENDENTE} count={baseFilteredTasks.filter(t => t.status === TaskStatus.PENDENTE).length} />
                <FilterButton label="Solicitadas" value={TaskStatus.SOLICITADA} count={baseFilteredTasks.filter(t => t.status === TaskStatus.SOLICITADA).length} />
                <FilterButton label="Finalizadas" value={TaskStatus.FINALIZADA} count={baseFilteredTasks.filter(t => t.status === TaskStatus.FINALIZADA).length} />
                <FilterButton label="Excluídas" value={TaskStatus.EXCLUIDA} count={baseFilteredTasks.filter(t => t.status === TaskStatus.EXCLUIDA).length} />
            </div>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <Filter size={16} />
              Filtros:
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
              <select 
                  value={filterOwner}
                  onChange={(e) => {
                      setFilterOwner(e.target.value);
                      handleFilterChange('Dono', e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
              >
                  <option value="ALL">Todos os Donos</option>
                  {uniqueOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                  ))}
              </select>

              <select 
                  value={filterHouse}
                  onChange={(e) => {
                      setFilterHouse(e.target.value);
                      handleFilterChange('Casa', e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
              >
                  <option value="ALL">Todas as Casas</option>
                  {availableHouses.map(h => (
                      <option key={h} value={h}>{h}</option>
                  ))}
              </select>

              <select 
                  value={filterType}
                  onChange={(e) => {
                      setFilterType(e.target.value);
                      handleFilterChange('Tipo', e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
              >
                  <option value="ALL">Todos os Tipos</option>
                  {availableTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {finalRenderTasks.length === 0 ? (
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
          finalRenderTasks.map((task) => (
            <div 
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, task.id)}
              onClick={(e) => handleCardClick(e, task)}
              className={`group bg-slate-900 border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between relative cursor-grab active:cursor-grabbing ${
                  task.status === TaskStatus.EXCLUIDA ? 'border-red-900/30 opacity-70' : 'border-slate-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
              } ${draggedTaskId === task.id ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
            >
              {/* Top Right Action Buttons Group */}
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/80 backdrop-blur-sm rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                  {/* History Button */}
                  {logs && (
                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setHistoryTask(task);
                            if (onLogActivity) onLogActivity('Interação', `Visualizou histórico da pendência: ${task.type} - ${task.house}`);
                        }}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Ver Histórico"
                    >
                        <Info size={16} />
                    </button>
                  )}
                  
                  {/* Edit Button - Only if not excluded */}
                  {task.status !== TaskStatus.EXCLUIDA && (
                    <button
                        onClick={(e) => { e.stopPropagation(); initGeneralEdit(task); }}
                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar Pendência"
                    >
                        <Pencil size={16} />
                    </button>
                  )}

                  {/* Delete Button */}
                  {task.status !== TaskStatus.EXCLUIDA && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); initDeletion(task); }}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Excluir Solicitação"
                      >
                          <Trash2 size={16} />
                      </button>
                  )}
              </div>
              
              <div className="absolute top-1/2 left-1 -translate-y-1/2 text-slate-700 opacity-0 group-hover:opacity-50 pointer-events-none">
                 <GripVertical size={16} />
              </div>

              <div>
                <div className="flex justify-between items-start mb-4 pl-2">
                  <StatusBadge status={task.status} />
                  <span className="text-xs text-slate-500 font-mono pr-20">
                    {new Date(task.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mb-4 pl-2">
                  {/* House Badge and Task Title Row */}
                  <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide border font-bold shadow-sm ${getHouseStyles(task.house)}`}>
                          {task.house}
                      </span>
                      <h3 className="text-lg font-bold text-slate-100">{getTypeLabel(task.type)}</h3>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                      {/* Account Name Highlight */}
                      {task.type !== TaskType.CONTA_NOVA && (
                        <div className="flex items-center gap-2 text-indigo-200 bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-500/20 w-full group-hover:bg-indigo-900/30 transition-colors">
                            <User size={16} className="text-indigo-400 shrink-0" />
                            <span className="font-semibold text-sm truncate" title={task.accountName}>
                                {task.accountName || 'Conta Desconhecida'}
                            </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        {task.type === TaskType.CONTA_NOVA && (
                            <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/10">
                            {task.quantity} {task.quantity === 1 ? 'conta' : 'contas'}
                            </span>
                        )}
                        
                        {task.createdBy && (
                             <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded-full">
                                <User size={10}/> {task.createdBy}
                             </span>
                        )}
                      </div>
                  </div>

                  {task.description && (
                    <p className="mt-3 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-800 italic">
                      "{task.description}"
                    </p>
                  )}
                  {task.pixKeyInfo && (
                      <div className="mt-3 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 p-2 rounded-lg flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                             <Landmark size={14} className="mt-0.5 shrink-0" />
                             <span className="whitespace-pre-wrap break-all">{task.pixKeyInfo}</span>
                          </div>
                          {task.status !== TaskStatus.FINALIZADA && task.status !== TaskStatus.EXCLUIDA && (
                              <button onClick={(e) => { e.stopPropagation(); setEditingPixTask(task); }} className="p-1 hover:bg-purple-500/20 rounded transition-colors shrink-0" title="Editar Pix">
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

      {/* Account Details Modal (Read Only) */}
      {viewingAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
             {/* Fixed Header */}
             <div className="p-6 pb-2 shrink-0 border-b border-slate-800/50">
                 <button onClick={() => setViewingAccount(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800/50 rounded-full"><X size={20}/></button>
                 <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2 pr-8">
                    <User className="text-indigo-400" />
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
      {historyTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
                <button onClick={() => setHistoryTask(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <RotateCcw size={20} className="text-indigo-400" />
                    Histórico da Pendência
                </h3>
                
                <div className="overflow-y-auto pr-2 flex-1 space-y-3">
                    {getFilteredLogs(historyTask).length > 0 ? (
                        getFilteredLogs(historyTask).map(log => (
                            <div key={log.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-slate-200">{log.action}</span>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Calendar size={10} />
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-[10px] text-indigo-400 flex items-center gap-1 mt-1">
                                    <User size={10} /> {log.user}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-10">Nenhum histórico encontrado para esta pendência.</p>
                    )}
                </div>
            </div>
          </div>
      )}

      {/* Edit Task Modal */}
      {taskToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Pencil size={20} className="text-indigo-400" />
                    Editar Pendência
                </h3>
                <button onClick={() => setTaskToEdit(null)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="space-y-4">
                {/* Type & House */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-400 mb-1 block">Tipo</label>
                        <select 
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                        >
                            {availableTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-400 mb-1 block">Casa</label>
                        <select 
                            value={editHouse}
                            onChange={(e) => setEditHouse(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                        >
                            {availableHouses.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                </div>

                {/* Account Selection (Optional) - Filtered by House */}
                {editType !== TaskType.CONTA_NOVA && (
                    <div>
                        <label className="text-xs font-medium text-slate-400 mb-1 block">Conta Vinculada (Apenas {editHouse})</label>
                        <select 
                            value={editAccountId}
                            onChange={(e) => setEditAccountId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                        >
                            <option value="">Sem conta vinculada / Desconhecida</option>
                            {accounts.filter(acc => acc.house === editHouse).map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Quantity (Conta Nova only) */}
                {editType === TaskType.CONTA_NOVA && (
                    <div>
                        <label className="text-xs font-medium text-slate-400 mb-1 block">Quantidade</label>
                        <input 
                            type="number"
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                        />
                    </div>
                )}

                {/* Description */}
                <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block">Descrição</label>
                    <textarea 
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm resize-none"
                    />
                </div>

                {/* Pix Info */}
                <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block">Informações do Pix (Opcional)</label>
                    <textarea 
                        rows={2}
                        value={editPixInfo}
                        onChange={(e) => setEditPixInfo(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm resize-none"
                    />
                </div>

                <button 
                    onClick={handleSaveGeneralEdit}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                >
                    <Save size={18} />
                    Salvar Alterações
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Pix Edit Modal */}
      {editingPixTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <Landmark size={20} className="text-purple-400" />
               Editar Chave Pix
            </h3>
            
            <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">Selecione uma nova chave para esta pendência:</p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex gap-2 mb-3">
                        <button 
                            type="button"
                            onClick={() => setPixSelectionMode('SAVED')}
                            className={`flex-1 py-2 text-xs rounded-lg border ${pixSelectionMode === 'SAVED' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400'}`}
                        >
                            Salva
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
                            placeholder="Digite a chave Pix..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={handleSavePixEdit}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-xl transition-colors"
                >
                    Salvar
                </button>
                <button 
                    onClick={() => setEditingPixTask(null)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl transition-colors"
                >
                    Cancelar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* New Account Completion Modal */}
      {finishingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl my-8">
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
                    <p className="text-xs text-slate-400 mt-1">Solicitante (Dono): {finishingTask.createdBy}</p>
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
                            disabled={currentUser?.role !== 'ADMIN'}
                            onChange={(e) => setUsePack(e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${currentUser?.role !== 'ADMIN' ? 'opacity-50 cursor-not-allowed bg-indigo-600 after:translate-x-full after:border-white' : 'bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-indigo-600'}`}></div>
                   </label>
               </div>
               
               {(usePack || currentUser?.role !== 'ADMIN') && (
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

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {accountDetails.map((acc, idx) => (
                <div key={idx} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex justify-between">
                    <span>Conta #{idx + 1}</span>
                    <span className="text-xs text-slate-500 font-normal">Preencha os dados de acesso</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Nome do Titular</label>
                        <input 
                            type="text" 
                            value={acc.name}
                            onChange={(e) => handleAccountDetailChange(idx, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Email de Acesso</label>
                        <input 
                            type="text" 
                            value={acc.email}
                            onChange={(e) => handleAccountDetailChange(idx, 'email', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Usuário (Login)</label>
                        <input 
                            type="text" 
                            value={acc.username || ''}
                            onChange={(e) => handleAccountDetailChange(idx, 'username', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Senha</label>
                        <input 
                            type="text" 
                            value={acc.password || ''}
                            onChange={(e) => handleAccountDetailChange(idx, 'password', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Dono da Conta</label>
                        <input 
                            type="text" 
                            value={acc.owner || ''}
                            onChange={(e) => handleAccountDetailChange(idx, 'owner', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Valor Depositado (R$)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={acc.depositValue === undefined ? '' : acc.depositValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleAccountDetailChange(idx, 'depositValue', val === '' ? undefined : parseFloat(val));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="text-xs text-slate-500 mb-1 block">Dados do Card / Info Adicional</label>
                        <textarea 
                            rows={2}
                            value={acc.card || ''}
                            onChange={(e) => handleAccountDetailChange(idx, 'card', e.target.value)}
                            placeholder="CPF, Data Nasc, etc..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
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