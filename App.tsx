import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { NewRequestForm } from './components/NewRequestForm';
import { TaskBoard } from './components/TaskBoard';
import { HistoryLog } from './components/HistoryLog';
import { AccountList } from './components/AccountList';
import { Settings } from './components/Settings';
import { Insights } from './components/Insights';
import { PackList } from './components/PackList';
import { Login } from './components/Login';
import { Task, LogEntry, TaskStatus, TabView, TaskType, Account, Pack, User, PixKey } from './types';
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS, MOCK_HOUSES } from './constants';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('betManager_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('betManager_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('betManager_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [packs, setPacks] = useState<Pack[]>(() => {
    const saved = localStorage.getItem('betManager_packs');
    return saved ? JSON.parse(saved) : [];
  });

  const [houses, setHouses] = useState<string[]>(() => {
    const saved = localStorage.getItem('betManager_houses');
    return saved ? JSON.parse(saved) : MOCK_HOUSES;
  });

  const [pixKeys, setPixKeys] = useState<PixKey[]>(() => {
    const saved = localStorage.getItem('betManager_pixKeys');
    return saved ? JSON.parse(saved) : [];
  });

  const [taskTypes, setTaskTypes] = useState<{ label: string, value: string }[]>(() => {
    const saved = localStorage.getItem('betManager_taskTypes');
    if (saved) return JSON.parse(saved);
    return Object.entries(TASK_TYPE_LABELS).map(([key, value]) => ({
      label: value,
      value: key
    }));
  });

  // Auth Check
  useEffect(() => {
     const savedUser = localStorage.getItem('betManager_currentUser');
     if (savedUser) {
         setCurrentUser(JSON.parse(savedUser));
     }
  }, []);

  // Persistence
  useEffect(() => { localStorage.setItem('betManager_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('betManager_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('betManager_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('betManager_packs', JSON.stringify(packs)); }, [packs]);
  useEffect(() => { localStorage.setItem('betManager_houses', JSON.stringify(houses)); }, [houses]);
  useEffect(() => { localStorage.setItem('betManager_taskTypes', JSON.stringify(taskTypes)); }, [taskTypes]);
  useEffect(() => { localStorage.setItem('betManager_pixKeys', JSON.stringify(pixKeys)); }, [pixKeys]);

  // --- Helpers ---
  const addLog = (taskId: string | undefined, taskDesc: string, action: string) => {
     setLogs(prev => [{
        id: generateId(),
        taskId: taskId || 'SYSTEM',
        taskDescription: taskDesc,
        action,
        user: currentUser?.name || 'Sistema',
        timestamp: new Date().toISOString()
     }, ...prev]);
  };

  const updatePackProgress = (packId: string, quantityToAdd: number) => {
    setPacks(prevPacks => {
      const idx = prevPacks.findIndex(p => p.id === packId);
      if (idx === -1) return prevPacks;

      const updatedPacks = [...prevPacks];
      const pack = updatedPacks[idx];
      const newDelivered = pack.delivered + quantityToAdd;
      
      updatedPacks[idx] = {
        ...pack,
        delivered: newDelivered,
        status: newDelivered >= pack.quantity ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date().toISOString()
      };
      
      return updatedPacks;
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
      setCurrentUser(updatedUser);
      localStorage.setItem('betManager_currentUser', JSON.stringify(updatedUser));
  };

  // --- Handlers ---

  const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks(prev => [newTask, ...prev]);
    const typeLabel = taskTypes.find(t => t.value === newTask.type)?.label || newTask.type;
    addLog(newTask.id, `${typeLabel} - ${newTask.house}`, `Pendência criada (${TASK_STATUS_LABELS[newTask.status]})`);
  };

  const handleCreatePack = (packData: { house: string; quantity: number; price: number }) => {
    const newPack: Pack = {
      id: generateId(),
      ...packData,
      delivered: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPacks(prev => [newPack, ...prev]);
    addLog(newPack.id, `Pack ${packData.house}`, `Novo pack criado: ${packData.quantity} contas`);
  };

  const handleUpdateStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevTasks;

      const task = prevTasks[taskIndex];
      const oldStatus = task.status;
      const updatedTasks = [...prevTasks];
      updatedTasks[taskIndex] = {
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      const typeLabel = taskTypes.find(t => t.value === task.type)?.label || task.type;
      addLog(task.id, `${typeLabel} - ${task.house}`, `Status alterado: ${TASK_STATUS_LABELS[oldStatus]} → ${TASK_STATUS_LABELS[newStatus]}`);

      return updatedTasks;
    });
  }, [taskTypes, currentUser]);

  const handleEditTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prevTasks => {
        const idx = prevTasks.findIndex(t => t.id === taskId);
        if (idx === -1) return prevTasks;
        
        const oldTask = prevTasks[idx];
        const updatedTasks = [...prevTasks];
        updatedTasks[idx] = { ...oldTask, ...updates, updatedAt: new Date().toISOString() };
        
        if (updates.pixKeyInfo && updates.pixKeyInfo !== oldTask.pixKeyInfo) {
             addLog(taskId, `Edição - ${oldTask.house}`, `Chave Pix atualizada.`);
        }
        
        return updatedTasks;
    });
  }, []);

  const handleDeleteTask = (taskId: string, reason?: string) => {
    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevTasks;

      const task = prevTasks[taskIndex];
      const updatedTasks = [...prevTasks];
      updatedTasks[taskIndex] = {
        ...task,
        status: TaskStatus.EXCLUIDA,
        deletionReason: reason,
        updatedAt: new Date().toISOString()
      };

      const typeLabel = taskTypes.find(t => t.value === task.type)?.label || task.type;
      addLog(task.id, `${typeLabel} - ${task.house}`, `Solicitação excluída. Motivo: ${reason || 'Não informado'}`);

      return updatedTasks;
    });
  };

  const handleFinishNewAccountTask = (
    taskId: string, 
    accountsData: { name: string; email: string; depositValue: number }[],
    packIdToDeduct?: string
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const deliveredCount = accountsData.length;
    const requestedCount = task.quantity || 1;
    const isPartial = deliveredCount < requestedCount;

    // 1. Create Accounts
    const newAccounts: Account[] = accountsData.map(data => ({
      id: generateId(),
      name: data.name,
      email: data.email,
      depositValue: data.depositValue,
      house: task.house,
      status: 'ACTIVE',
      tags: [],
      createdAt: new Date().toISOString(),
      taskIdSource: taskId,
      packId: packIdToDeduct // Link to pack if provided
    }));

    setAccounts(prev => [...newAccounts, ...prev]);

    // 2. Update Pack if selected
    if (packIdToDeduct) {
      updatePackProgress(packIdToDeduct, deliveredCount);
    }

    // 3. Update Task
    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevTasks;
      const updatedTasks = [...prevTasks];
      
      if (isPartial) {
        const newQuantity = requestedCount - deliveredCount;
        updatedTasks[taskIndex] = {
          ...task,
          quantity: newQuantity,
          updatedAt: new Date().toISOString()
        };
        addLog(taskId, `Entrega Parcial - ${task.house}`, `Entregues: ${deliveredCount}. Restantes: ${newQuantity}. Pack deduzido: ${packIdToDeduct ? 'Sim' : 'Não'}`);
      } else {
        updatedTasks[taskIndex] = {
          ...task,
          status: TaskStatus.FINALIZADA,
          updatedAt: new Date().toISOString()
        };
        addLog(taskId, `Entrega Finalizada - ${task.house}`, `Tarefa concluída. ${deliveredCount} contas entregues. Pack deduzido: ${packIdToDeduct ? 'Sim' : 'Não'}`);
      }
      return updatedTasks;
    });
  };

  const handleLimitAccount = (accountId: string, createWithdrawal: boolean, pixInfo?: string) => {
    setAccounts(prev => {
       const idx = prev.findIndex(a => a.id === accountId);
       if (idx === -1) return prev;
       
       const updated = [...prev];
       updated[idx] = { ...updated[idx], status: 'LIMITED' };
       
       const acc = prev[idx];
       if (createWithdrawal) {
          setTimeout(() => {
             handleCreateTask({
               type: TaskType.SAQUE,
               house: acc.house,
               accountName: acc.name,
               description: `Gerado automaticamente ao limitar conta.`,
               pixKeyInfo: pixInfo,
               status: TaskStatus.PENDENTE 
             });
          }, 0);
       }
       addLog(acc.id, `Conta ${acc.name}`, `Conta marcada como LIMITADA.`);
       return updated;
    });
  };

  const handleMarkReplacement = (accountId: string, createWithdrawal: boolean, pixInfo?: string) => {
    // Check if account needs to be removed from a pack
    const accountToUpdate = accounts.find(a => a.id === accountId);
    
    if (accountToUpdate && accountToUpdate.packId) {
        setPacks(prev => prev.map(p => {
            if (p.id === accountToUpdate.packId) {
                const newDelivered = Math.max(0, p.delivered - 1);
                // If it was COMPLETED, it becomes ACTIVE because a slot opened up
                return {
                    ...p,
                    delivered: newDelivered,
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString()
                };
            }
            return p;
        }));
        // Log is handled by generic addLog but specific context is good
    }

     setAccounts(prev => {
        const idx = prev.findIndex(a => a.id === accountId);
        if (idx === -1) return prev;
        
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: 'REPLACEMENT' };
        
        const acc = prev[idx];
        if (createWithdrawal) {
           setTimeout(() => {
              handleCreateTask({
                type: TaskType.SAQUE,
                house: acc.house,
                accountName: acc.name,
                description: `Gerado automaticamente (Conta para Reposição).`,
                pixKeyInfo: pixInfo,
                status: TaskStatus.PENDENTE 
              });
           }, 0);
        }
        addLog(acc.id, `Conta ${acc.name}`, `Marcada para REPOSIÇÃO.`);
        return updated;
     });
  };

  const handleSaveAccount = (accountData: Account, packIdToDeduct?: string) => {
    if (accountData.id) {
      // Edit existing
      setAccounts(prev => prev.map(a => a.id === accountData.id ? { ...accountData, updatedAt: new Date().toISOString() } : a));
      addLog(accountData.id, `Conta ${accountData.name}`, 'Dados da conta atualizados manualmente');
    } else {
      // Create new manual
      const newAccount = {
        ...accountData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        status: 'ACTIVE' as const,
        packId: packIdToDeduct
      };
      setAccounts(prev => [newAccount, ...prev]);
      
      if (packIdToDeduct) {
        updatePackProgress(packIdToDeduct, 1);
      }
      addLog(newAccount.id, `Conta ${newAccount.name}`, 'Conta cadastrada manualmente');
    }
  };

  const handleResetSettings = () => {
    setHouses([...MOCK_HOUSES]);
    const defaultTypes = Object.entries(TASK_TYPE_LABELS).map(([key, value]) => ({
        label: value,
        value: key
    }));
    setTaskTypes([...defaultTypes]);
  };

  const handleLogout = () => {
      localStorage.removeItem('betManager_currentUser');
      setCurrentUser(null);
  };

  if (!currentUser) {
      return <Login onLogin={setCurrentUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <TaskBoard 
            tasks={tasks} 
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onUpdateStatus={handleUpdateStatus} 
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onFinishNewAccountTask={handleFinishNewAccountTask} 
            availableTypes={taskTypes}
          />
        );
      case 'NEW_REQUEST':
        return (
          <NewRequestForm 
            onSave={handleCreateTask} 
            availableHouses={houses} 
            availableTypes={taskTypes} 
            accounts={accounts}
            pixKeys={pixKeys}
            currentUser={currentUser}
          />
        );
      case 'PACKS':
        return (
          <PackList 
             packs={packs}
             accounts={accounts}
             availableHouses={houses}
             onCreatePack={handleCreatePack}
          />
        );
      case 'HISTORY':
        return <HistoryLog logs={logs} />;
      case 'ACCOUNTS_ACTIVE':
        return (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'ACTIVE')} 
            type="ACTIVE" 
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onLimit={handleLimitAccount} 
            onReplacement={handleMarkReplacement}
            onSave={handleSaveAccount} 
            availableHouses={houses}
          />
        );
      case 'ACCOUNTS_LIMITED':
        return (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'LIMITED')} 
            type="LIMITED" 
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onSave={handleSaveAccount}
            onReplacement={handleMarkReplacement}
            availableHouses={houses}
          />
        );
      case 'ACCOUNTS_REPLACEMENT':
        return (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'REPLACEMENT')} 
            type="REPLACEMENT" 
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onSave={handleSaveAccount}
            availableHouses={houses}
          />
        );
      case 'SETTINGS':
        return (
          <Settings 
            houses={houses} 
            setHouses={setHouses} 
            taskTypes={taskTypes} 
            setTaskTypes={setTaskTypes} 
            pixKeys={pixKeys}
            setPixKeys={setPixKeys}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onReset={handleResetSettings}
            logAction={addLog.bind(null, undefined)}
          />
        );
      case 'INSIGHTS':
        return (
          <Insights 
            tasks={tasks} 
            accounts={accounts} 
            availableHouses={houses}
          />
        );
      default:
        return (
          <TaskBoard 
            tasks={tasks} 
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onUpdateStatus={handleUpdateStatus} 
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onFinishNewAccountTask={handleFinishNewAccountTask} 
            availableTypes={taskTypes}
          />
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;