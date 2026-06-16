import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { NewRequestForm } from './components/NewRequestForm';
import { TaskBoard } from './components/TaskBoard';
import { HistoryLog } from './components/HistoryLog';
import { AccountList } from './components/AccountList';
import { Settings } from './components/Settings';
import { Insights } from './components/Insights';
import { PackList } from './components/PackList';
import { HolderList } from './components/HolderList';
import { Balances } from './components/Balances';
import { Bets } from './components/Bets';
import { Login } from './components/Login';
import { Task, LogEntry, TaskStatus, TabView, TaskType, Account, Pack, User, PixKey, Holder, Transaction, Bank, Tipster, Bet } from './types';
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS, MOCK_HOUSES, INITIAL_DEPOSIT_DESCRIPTION } from './constants';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, writeBatch, getDocs, query, limit, where } from 'firebase/firestore';

// Helper to remove undefined values before sending to Firestore
const sanitizePayload = (data: any) => {
  const clean: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
        clean[key] = data[key];
    }
  });
  return clean;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
  const [authLoading, setAuthLoading] = useState(true);
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [houses, setHouses] = useState<string[]>([]); // Initialize empty, fill from DB
  const [rawHouses, setRawHouses] = useState<{id: string, name: string, order: number, provider?: string, hidden?: boolean}[]>([]); // Keep track of IDs for sorting
  const [providers, setProviders] = useState<{id: string, name: string}[]>([]); // Provedores cadastrados (config_providers)
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  
  // Task Types State - Now includes ID and Order
  const [taskTypes, setTaskTypes] = useState<{ id?: string, label: string, value: string, order?: number }[]>(
    Object.entries(TASK_TYPE_LABELS).map(([key, value], index) => ({ label: value, value: key, order: index }))
  );
  
  const [users, setUsers] = useState<User[]>([]);

  // --- Auth & Data Listeners ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch extended user details from Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              setCurrentUser(userSnap.data() as User);
            } else {
              // Fallback just in case
              const u: User = { 
                id: firebaseUser.uid, 
                name: firebaseUser.displayName || 'User', 
                email: firebaseUser.email || '', 
                username: firebaseUser.email?.split('@')[0] || 'user', 
                role: 'AGENCIA',
                createdAt: new Date().toISOString()
              };
              setCurrentUser(u);
            }
        } catch (e) {
            console.error("Erro ao buscar usuário:", e);
             const u: User = { 
                id: firebaseUser.uid, 
                name: firebaseUser.displayName || 'User', 
                email: firebaseUser.email || '', 
                username: firebaseUser.email?.split('@')[0] || 'user', 
                role: 'AGENCIA',
                createdAt: new Date().toISOString()
              };
              setCurrentUser(u);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time Database Listeners
  useEffect(() => {
    if (!currentUser) return;

    const handleError = (source: string) => (error: any) => {
        console.error(`Erro ao carregar ${source}:`, error);
        if (error.code === 'permission-denied') {
            console.warn(`Permissão negada para ${source}. Verifique as regras do Firestore.`);
        }
    };

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const loadedTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      loadedTasks.sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : 0;
          const orderB = b.orderIndex !== undefined ? b.orderIndex : 0;
          if (orderA !== orderB) return orderB - orderA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTasks(loadedTasks);
    }, handleError('tasks'));

    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    }, handleError('accounts'));

    const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry)));
    }, handleError('logs'));

    const unsubPacks = onSnapshot(collection(db, 'packs'), (snapshot) => {
      setPacks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Pack)));
    }, handleError('packs'));

    const unsubHolders = onSnapshot(collection(db, 'holders'), (snapshot) => {
      setHolders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Holder)));
    }, handleError('holders'));

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, handleError('transactions'));

    const unsubBanks = onSnapshot(collection(db, 'banks'), (snapshot) => {
      setBanks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bank)));
    }, handleError('banks'));

    const unsubTipsters = onSnapshot(collection(db, 'tipsters'), (snapshot) => {
      setTipsters(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tipster)));
    }, handleError('tipsters'));

    const unsubBets = onSnapshot(collection(db, 'bets'), (snapshot) => {
      setBets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bet)));
    }, handleError('bets'));

    const unsubPix = onSnapshot(collection(db, 'pixKeys'), (snapshot) => {
      setPixKeys(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PixKey)));
    }, handleError('pixKeys'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    }, handleError('users'));
    
    const unsubHouses = onSnapshot(collection(db, 'config_houses'), (snapshot) => {
        if (!snapshot.empty) {
            const raw = snapshot.docs.map(d => ({
                id: d.id,
                name: d.data().name,
                order: d.data().order || 0,
                provider: d.data().provider || '',
                hidden: d.data().hidden || false
            }));
            // Sort by order
            raw.sort((a, b) => a.order - b.order);
            setRawHouses(raw);
            setHouses(raw.filter(r => !r.hidden).map(r => r.name)); // selects exibem só casas visíveis
        } else {
             // If empty, we wait for user to click Restore Defaults
             setHouses([]);
             setRawHouses([]);
        }
    }, handleError('config_houses'));

    const unsubProviders = onSnapshot(collection(db, 'config_providers'), (snapshot) => {
        const raw = snapshot.docs.map(d => ({ id: d.id, name: d.data().name as string }));
        raw.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setProviders(raw);
    }, handleError('config_providers'));

    const unsubTypes = onSnapshot(collection(db, 'config_types'), (snapshot) => {
        if (!snapshot.empty) {
             const raw = snapshot.docs.map(d => ({
                 id: d.id,
                 label: d.data().label,
                 value: d.data().value,
                 order: d.data().order !== undefined ? d.data().order : 999
             }));
             // Sort by order
             raw.sort((a, b) => (a.order || 0) - (b.order || 0));
             setTaskTypes(raw);
        }
    }, handleError('config_types'));

    return () => {
      unsubTasks(); unsubAccounts(); unsubLogs(); unsubPacks(); unsubPix(); unsubUsers(); unsubHouses(); unsubProviders(); unsubTypes(); unsubHolders(); unsubTransactions(); unsubBanks(); unsubTipsters(); unsubBets();
    };
  }, [currentUser]);


  // --- Helpers ---
  const addLog = async (taskId: string | undefined, taskDesc: string, action: string) => {
     try {
         await addDoc(collection(db, 'logs'), sanitizePayload({
            taskId: taskId || 'SYSTEM',
            taskDescription: taskDesc,
            action,
            user: currentUser?.name || 'Sistema',
            timestamp: new Date().toISOString()
         }));
     } catch (e) {
         console.error("Failed to add log", e);
     }
  };

  const updatePackProgress = async (packId: string, quantityToAdd: number) => {
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;
    
    const newDelivered = pack.delivered + quantityToAdd;
    // Auto-complete if full
    const isComplete = newDelivered >= pack.quantity;

    const packRef = doc(db, 'packs', packId);
    
    await updateDoc(packRef, sanitizePayload({
        delivered: newDelivered,
        status: isComplete ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date().toISOString()
    }));
  };

  const handleUpdateUser = async (updatedUser: User) => {
      setCurrentUser(updatedUser);
      const userRef = doc(db, 'users', updatedUser.id);
      await updateDoc(userRef, sanitizePayload(updatedUser));
  };
  
  const handleUpdateUserRole = async (userId: string, newRole: 'ADMIN' | 'USER' | 'AGENCIA' | 'KFB') => {
      if (currentUser?.role !== 'ADMIN') return;
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      addLog('SYSTEM', 'Gestão de Usuários', `Alterou cargo do usuário para ${newRole}`);
  };

  // --- Handlers ---

  const handleCreateTask = async (newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
        const newTask = {
          ...newTaskData,
          createdBy: currentUser?.name || 'Desconhecido',
          orderIndex: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        const docRef = await addDoc(collection(db, 'tasks'), sanitizePayload(newTask));
        
        const typeLabel = taskTypes.find(t => t.value === newTask.type)?.label || newTask.type;
        addLog(docRef.id, `${typeLabel} - ${newTask.house}`, `Pendência criada (${TASK_STATUS_LABELS[newTask.status]})`);
    } catch (e: any) {
        alert(`Erro ao criar tarefa: ${e.message}`);
    }
  };

  const handleCreatePack = async (packData: { house: string; quantity: number; price: number }) => {
    try {
        const newPack = {
          ...packData,
          delivered: 0,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'packs'), sanitizePayload(newPack));
        addLog(docRef.id, `Pack ${packData.house}`, `Novo pack criado: ${packData.quantity} contas`);
    } catch (e: any) {
        alert(`Erro ao criar pack: ${e.message}`);
    }
  };

  const handleEditPack = async (packId: string, updates: Partial<Pack>) => {
    try {
        const pack = packs.find(p => p.id === packId);
        if (!pack) return;

        // Force logic: if delivered >= quantity, ensure it is COMPLETED
        const finalQty = updates.quantity !== undefined ? updates.quantity : pack.quantity;
        const finalDelivered = updates.delivered !== undefined ? updates.delivered : pack.delivered;

        // Override status if logic dictates completion, otherwise use provided or existing status
        const finalStatus = finalDelivered >= finalQty ? 'COMPLETED' : (updates.status || pack.status);

        const packRef = doc(db, 'packs', packId);
        await updateDoc(packRef, sanitizePayload({
            ...updates,
            status: finalStatus,
            updatedAt: new Date().toISOString()
        }));
        addLog(packId, 'Gestão de Packs', 'Pack atualizado por admin');
    } catch (e: any) {
        alert(`Erro ao editar pack: ${e.message}`);
    }
  };

  // Updated to support Agent Assignment by KFB and Update Account Timestamp
  const handleUpdateStatus = useCallback(async (taskId: string, newStatus: TaskStatus, agentId?: string) => {
    try {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const timestamp = new Date().toISOString();
        const payload: any = {
            status: newStatus,
            updatedAt: timestamp
        };

        if (newStatus === TaskStatus.FINALIZADA) {
            payload.resolvedAt = timestamp;
            if (agentId) {
                payload.finishedBy = agentId;
            } else if (currentUser) {
                payload.finishedBy = currentUser.id;
            }
        }

        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, sanitizePayload(payload));

        // --- UPDATE ACCOUNT TIMESTAMP IF LINKED ---
        if (task.accountName) {
            const linkedAccount = accounts.find(a => a.name === task.accountName && a.house === task.house);
            if (linkedAccount) {
                 const accRef = doc(db, 'accounts', linkedAccount.id);
                 await updateDoc(accRef, { updatedAt: timestamp });
            }
        }
        // ------------------------------------------

        const typeLabel = taskTypes.find(t => t.value === task.type)?.label || task.type;
        
        let actionMsg = `Status alterado: ${TASK_STATUS_LABELS[task.status]} → ${TASK_STATUS_LABELS[newStatus]}`;
        if (agentId) {
            const agent = users.find(u => u.id === agentId);
            actionMsg += ` (Realizado por: ${agent?.name || 'Desconhecido'})`;
        }
        
        addLog(taskId, `${typeLabel} - ${task.house}`, actionMsg);
    } catch (e: any) {
        alert(`Erro ao atualizar status: ${e.message}`);
    }
  }, [tasks, taskTypes, currentUser, users, accounts]);

  const handleEditTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, sanitizePayload({ ...updates, updatedAt: new Date().toISOString() }));
        
        if (updates.pixKeyInfo && updates.pixKeyInfo !== task.pixKeyInfo) {
             addLog(taskId, `Edição - ${task.house}`, `Chave Pix atualizada.`);
        }
        addLog(taskId, `Edição - ${task.house}`, `Pendência editada.`);
    } catch (e: any) {
        alert(`Erro ao editar tarefa: ${e.message}`);
    }
  }, [tasks]);

  const handleReorderTasks = async (draggedTaskId: string, targetTaskId: string) => {
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);

    if (!draggedTask || !targetTask || draggedTaskId === targetTaskId) return;

    const draggedOrder = draggedTask.orderIndex || 0;
    const targetOrder = targetTask.orderIndex || 0;

    const batch = writeBatch(db);
    const draggedRef = doc(db, 'tasks', draggedTaskId);
    const targetRef = doc(db, 'tasks', targetTaskId);

    batch.update(draggedRef, { orderIndex: targetOrder });
    batch.update(targetRef, { orderIndex: draggedOrder });

    try {
        await batch.commit();
    } catch (e) {
        console.error("Erro ao reordenar", e);
    }
  };

  const handleDeleteTask = async (taskId: string, reason?: string) => {
    try {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, sanitizePayload({
            status: TaskStatus.EXCLUIDA,
            deletionReason: reason,
            updatedAt: new Date().toISOString()
        }));

        const typeLabel = taskTypes.find(t => t.value === task.type)?.label || task.type;
        addLog(taskId, `${typeLabel} - ${task.house}`, `Solicitação excluída. Motivo: ${reason || 'Não informado'}`);
    } catch (e: any) {
        alert(`Erro ao excluir tarefa: ${e.message}`);
    }
  };

  const handleFinishNewAccountTask = async (
    taskId: string, 
    accountsData: { name: string; email: string; depositValue: number, username?: string, password?: string, card?: string, owner?: string }[],
    packIdToDeduct?: string
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const deliveredCount = accountsData.length;
    const requestedCount = task.quantity || 1;
    const isPartial = deliveredCount < requestedCount;

    try {
        const batchPromises = accountsData.map(data => {
            const { card, ...otherData } = data;
            // Structure object explicitly to ensure card is last in the definition (though JS objects key order is mostly creation order)
            const accountPayload = {
                ...otherData,
                house: task.house,
                status: 'ACTIVE',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                taskIdSource: taskId,
                packId: packIdToDeduct,
                card: card // Put card at the end
            };
            return addDoc(collection(db, 'accounts'), sanitizePayload(accountPayload));
        });
        const createdRefs = await Promise.all(batchPromises);

        // Link initial deposits to the transactions/P&L system
        const txPromises = createdRefs.map((ref, i) => {
            const data = accountsData[i];
            if (!data.depositValue || data.depositValue <= 0) return null;
            return addDoc(collection(db, 'transactions'), sanitizePayload({
                accountId: ref.id,
                accountName: data.name,
                house: task.house,
                type: 'DEPOSITO',
                amount: data.depositValue,
                description: INITIAL_DEPOSIT_DESCRIPTION,
                date: new Date().toISOString(),
                createdBy: currentUser?.name || 'Sistema',
                createdAt: new Date().toISOString()
            }));
        }).filter(Boolean);
        if (txPromises.length > 0) await Promise.all(txPromises as Promise<any>[]);

        if (packIdToDeduct) {
          await updatePackProgress(packIdToDeduct, deliveredCount);
        }

        const taskRef = doc(db, 'tasks', taskId);
        if (isPartial) {
            const newQuantity = requestedCount - deliveredCount;
            await updateDoc(taskRef, sanitizePayload({
                 quantity: newQuantity,
                 updatedAt: new Date().toISOString()
            }));
            addLog(taskId, `Entrega Parcial - ${task.house}`, `Entregues: ${deliveredCount}. Restantes: ${newQuantity}.`);
        } else {
            // Conta nova finalization usually doesn't need "Agent Selection" as it's an automated flow, but we can set current user
            await updateDoc(taskRef, sanitizePayload({
                status: TaskStatus.FINALIZADA,
                updatedAt: new Date().toISOString(),
                resolvedAt: new Date().toISOString(),
                finishedBy: currentUser?.id
            }));
            addLog(taskId, `Entrega Finalizada - ${task.house}`, `Tarefa concluída. ${deliveredCount} contas entregues.`);
        }
    } catch (e: any) {
        alert(`Erro ao finalizar entrega: ${e.message}`);
    }
  };

  const handleLimitAccount = async (accountId: string, createWithdrawal: boolean, pixInfo?: string) => {
      try {
          const acc = accounts.find(a => a.id === accountId);
          if(!acc) return;

          const accRef = doc(db, 'accounts', accountId);
          // Atualiza status e data de limitação e updatedAt
          await updateDoc(accRef, { 
              status: 'LIMITED',
              limitedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          });

          if (createWithdrawal) {
              await handleCreateTask({
                   type: TaskType.SAQUE,
                   house: acc.house,
                   accountName: acc.name,
                   description: `Gerado automaticamente ao limitar conta.`,
                   pixKeyInfo: pixInfo,
                   status: TaskStatus.PENDENTE 
              });
          }
          addLog(accountId, `Conta ${acc.name}`, `Conta marcada como LIMITADA.`);
      } catch (e: any) {
          alert(`Erro ao limitar conta: ${e.message}`);
      }
  };
  
  const handleCreateWithdrawalForAccount = async (accountId: string, pixInfo?: string) => {
      try {
          const acc = accounts.find(a => a.id === accountId);
          if(!acc) return;
          
          const context = acc.status === 'LIMITED' ? 'Conta Limitada' : (acc.status === 'REPLACEMENT' ? 'Conta Reposição' : 'Conta');

          await handleCreateTask({
               type: TaskType.SAQUE,
               house: acc.house,
               accountName: acc.name,
               description: `Solicitação de saque manual (${context}).`,
               pixKeyInfo: pixInfo,
               status: TaskStatus.PENDENTE 
              });
          // Update timestamp on account to reflect activity
          await updateDoc(doc(db, 'accounts', accountId), { updatedAt: new Date().toISOString() });
          
          addLog(accountId, `Conta ${acc.name}`, `Solicitou saque em conta ${acc.status}.`);
      } catch (e: any) {
          alert(`Erro ao criar saque: ${e.message}`);
      }
  };
  
  const handleReactivateAccount = async (accountId: string) => {
      try {
          const acc = accounts.find(a => a.id === accountId);
          if(!acc) {
            console.error("Account not found for reactivation", accountId);
            return;
          }
          
          const accRef = doc(db, 'accounts', accountId);
          await updateDoc(accRef, { 
              status: 'ACTIVE', 
              deletionReason: '', 
              updatedAt: new Date().toISOString() 
          });
          addLog(accountId, `Conta ${acc.name}`, `Conta restaurada/reativada (Movida para Ativas).`);
      } catch (e: any) {
          console.error(e);
          alert(`Erro ao reativar conta: ${e.message}`);
      }
  };

  const handleDeleteAccount = async (accountId: string, reason: string) => {
      try {
          const acc = accounts.find(a => a.id === accountId);
          if(!acc) return;
          
          const accRef = doc(db, 'accounts', accountId);
          await updateDoc(accRef, { status: 'DELETED', deletionReason: reason, updatedAt: new Date().toISOString() });
          addLog(accountId, `Conta ${acc.name}`, `Conta excluída. Motivo: ${reason || 'Não informado'}`);
      } catch (e: any) {
          alert(`Erro ao excluir conta: ${e.message}`);
      }
  };
  
  const handlePermanentDeleteAccount = async (accountId: string) => {
      if(confirm("ATENÇÃO: Isso irá apagar a conta permanentemente do banco de dados. Deseja continuar?")) {
        try {
            await deleteDoc(doc(db, 'accounts', accountId));
            addLog(undefined, 'Conta Excluída Permanentemente', `ID: ${accountId} removido definitivamente.`);
        } catch (e: any) {
            alert(`Erro ao excluir permanentemente: ${e.message}`);
        }
      }
  };

  const handleMarkReplacement = async (accountId: string, createWithdrawal: boolean, pixInfo?: string) => {
    try {
        const accountToUpdate = accounts.find(a => a.id === accountId);
        if (!accountToUpdate) return;
        
        // --- PACK DEDUCTION LOGIC VERIFICATION ---
        if (accountToUpdate.packId) {
            const pack = packs.find(p => p.id === accountToUpdate.packId);
            if (pack) {
                const packRef = doc(db, 'packs', pack.id);
                const newDelivered = Math.max(0, pack.delivered - 1);
                // Status should revert to ACTIVE if it was COMPLETED
                await updateDoc(packRef, sanitizePayload({
                    delivered: newDelivered,
                    status: 'ACTIVE', 
                    updatedAt: new Date().toISOString()
                }));
            }
        }
        // -----------------------------------------

         const accRef = doc(db, 'accounts', accountId);
         await updateDoc(accRef, { 
             status: 'REPLACEMENT',
             replacementAt: new Date().toISOString(),
             updatedAt: new Date().toISOString()
         });
            
         if (createWithdrawal) {
            await handleCreateTask({
                type: TaskType.SAQUE,
                house: accountToUpdate.house,
                accountName: accountToUpdate.name,
                description: `Gerado automaticamente (Conta para Reposição).`,
                pixKeyInfo: pixInfo,
                status: TaskStatus.PENDENTE 
            });
         }
         addLog(accountId, `Conta ${accountToUpdate.name}`, `Marcada para REPOSIÇÃO.`);
     } catch (e: any) {
         alert(`Erro ao marcar reposição: ${e.message}`);
     }
  };

  const handleSaveAccount = async (accountData: Account, packIdToDeduct?: string) => {
    try {
        if (accountData.id) {
          // Edit existing
          const { id, card, ...data } = accountData;
          const accRef = doc(db, 'accounts', id);
          
          // 1. Fetch old data to check for changes
          const accSnap = await getDoc(accRef);
          if (accSnap.exists()) {
              const oldData = accSnap.data() as Account;
              
              const updatePayload = {
                  ...data,
                  updatedAt: new Date().toISOString(),
                  card: card // Ensure card is at end
              };

              // 2. Update Account
              await updateDoc(accRef, sanitizePayload(updatePayload));
              
              // 3. CHECK FOR SYNC NEEDS (Cascade Update)
              if (oldData.name !== data.name || oldData.house !== data.house) {
                  // Find all tasks associated with the OLD data
                  const q = query(
                      collection(db, 'tasks'), 
                      where('accountName', '==', oldData.name),
                      where('house', '==', oldData.house)
                  );
                  const tasksSnap = await getDocs(q);
                  
                  if (!tasksSnap.empty) {
                      const batch = writeBatch(db);
                      tasksSnap.forEach(t => {
                          batch.update(t.ref, { 
                              accountName: data.name, 
                              house: data.house 
                          });
                      });
                      await batch.commit();
                      addLog(id, `Sincronização - ${data.name}`, `Atualizou ${tasksSnap.size} pendências antigas para a nova casa/nome.`);
                  }
              }

              // 4. SINCRONIZA O DEPÓSITO INICIAL COM O LEDGER DE TRANSAÇÕES (P&L)
              const oldDeposit = Number(oldData.depositValue) || 0;
              const newDeposit = Number(data.depositValue) || 0;
              if (oldDeposit !== newDeposit) {
                  const initialTx = transactions.find(t =>
                      t.accountId === id && t.type === 'DEPOSITO' && t.description === INITIAL_DEPOSIT_DESCRIPTION
                  );
                  if (initialTx) {
                      if (newDeposit > 0) {
                          await updateDoc(doc(db, 'transactions', initialTx.id), sanitizePayload({
                              amount: newDeposit,
                              accountName: data.name,
                              house: data.house,
                              holderId: data.holderId || ''
                          }));
                      } else {
                          // Depósito zerado: remove a transação inicial vinculada
                          await deleteDoc(doc(db, 'transactions', initialTx.id));
                      }
                  } else if (newDeposit > 0) {
                      // Conta antiga sem transação inicial: cria agora para alimentar o P&L
                      await addDoc(collection(db, 'transactions'), sanitizePayload({
                          accountId: id,
                          accountName: data.name,
                          holderId: data.holderId || '',
                          house: data.house,
                          type: 'DEPOSITO',
                          amount: newDeposit,
                          description: INITIAL_DEPOSIT_DESCRIPTION,
                          date: new Date().toISOString(),
                          createdBy: currentUser?.name || 'Sistema',
                          createdAt: new Date().toISOString()
                      }));
                  }
                  addLog(id, `Conta ${data.name}`, `Depósito inicial sincronizado: R$ ${newDeposit.toFixed(2)}`);
              }
          }
          addLog(id, `Conta ${accountData.name}`, 'Dados da conta atualizados manualmente');
        } else {
          // Create new manual
          const { card, ...data } = accountData;
          const newAccount = {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            packId: packIdToDeduct,
            card: card // Ensure card is at end
          };
          delete (newAccount as any).id;
          
          const ref = await addDoc(collection(db, 'accounts'), sanitizePayload(newAccount));
          
          // Link the initial deposit to the transactions/P&L system
          if (data.depositValue && data.depositValue > 0) {
            await addDoc(collection(db, 'transactions'), sanitizePayload({
              accountId: ref.id,
              accountName: data.name,
              holderId: data.holderId || '',
              house: data.house,
              type: 'DEPOSITO',
              amount: data.depositValue,
              description: INITIAL_DEPOSIT_DESCRIPTION,
              date: new Date().toISOString(),
              createdBy: currentUser?.name || 'Sistema',
              createdAt: new Date().toISOString()
            }));
          }
          
          if (packIdToDeduct) {
            await updatePackProgress(packIdToDeduct, 1);
          }
          addLog(ref.id, `Conta ${newAccount.name}`, `Conta cadastrada manualmente (${newAccount.status})`);
        }
    } catch (e: any) {
        console.error(e);
        alert(`Erro ao salvar conta: ${e.message}`);
    }
  };
  
  // --- Holder (Titular) Handlers ---
  const handleSaveHolder = async (holderData: Holder) => {
    try {
      if (holderData.id) {
        const { id, ...data } = holderData;
        const ref = doc(db, 'holders', id);
        await updateDoc(ref, sanitizePayload({ ...data, updatedAt: new Date().toISOString() }));

        // Cascade: keep linked accounts in sync with the holder's name (owner label)
        const linked = accounts.filter(a => a.holderId === id);
        if (linked.length > 0) {
          const batch = writeBatch(db);
          linked.forEach(a => {
            batch.update(doc(db, 'accounts', a.id), { owner: data.name, updatedAt: new Date().toISOString() });
          });
          await batch.commit();
        }
        addLog(id, `Titular ${holderData.name}`, 'Dados do titular atualizados');
      } else {
        const { id, ...data } = holderData as any;
        const ref = await addDoc(collection(db, 'holders'), sanitizePayload({
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        addLog(ref.id, `Titular ${holderData.name}`, 'Novo titular cadastrado');
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar titular: ${e.message}`);
    }
  };

  const handleDeleteHolder = async (holderId: string) => {
    try {
      const holder = holders.find(h => h.id === holderId);
      const linkedCount = accounts.filter(a => a.holderId === holderId).length;
      if (!confirm(`Excluir o titular ${holder?.name || ''}? ${linkedCount > 0 ? `Existem ${linkedCount} conta(s) vinculada(s) — elas serão desvinculadas, mas não apagadas.` : ''}`)) return;

      // Unlink accounts (do not delete the accounts themselves)
      const linked = accounts.filter(a => a.holderId === holderId);
      if (linked.length > 0) {
        const batch = writeBatch(db);
        linked.forEach(a => batch.update(doc(db, 'accounts', a.id), { holderId: '' }));
        await batch.commit();
      }

      await deleteDoc(doc(db, 'holders', holderId));
      addLog(holderId, `Titular ${holder?.name || ''}`, 'Titular excluído');
    } catch (e: any) {
      alert(`Erro ao excluir titular: ${e.message}`);
    }
  };

  // --- Transaction Handlers ---
  const handleSaveTransaction = async (txData: Transaction) => {
    try {
      if (txData.id) {
        const { id, ...data } = txData;
        await updateDoc(doc(db, 'transactions', id), sanitizePayload(data));
        addLog(txData.accountId, `Transação ${txData.house}`, `Transação editada (${txData.type})`);
      } else {
        const { id, ...data } = txData as any;
        await addDoc(collection(db, 'transactions'), sanitizePayload({
          ...data,
          createdBy: currentUser?.name || 'Sistema',
          createdAt: new Date().toISOString()
        }));
        addLog(txData.accountId, `Transação ${txData.house}`, `${txData.type}: R$ ${Number(txData.amount).toFixed(2)} (${txData.accountName || ''})`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar transação: ${e.message}`);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
      addLog(transactionId, 'Transação', 'Transação removida');
    } catch (e: any) {
      alert(`Erro ao remover transação: ${e.message}`);
    }
  };

  // --- Bank / Investment Handlers (controle de patrimônio, fora de contas e do P/L) ---
  const handleSaveBank = async (bankData: Bank) => {
    try {
      if (bankData.id) {
        const { id, ...data } = bankData;
        await updateDoc(doc(db, 'banks', id), sanitizePayload({ ...data, updatedAt: new Date().toISOString() }));
        addLog(id, `Banco ${bankData.name}`, 'Banco/investimento atualizado');
      } else {
        const { id, ...data } = bankData as any;
        const ref = await addDoc(collection(db, 'banks'), sanitizePayload({
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        addLog(ref.id, `Banco ${bankData.name}`, 'Banco/investimento cadastrado');
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar banco: ${e.message}`);
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    try {
      const bank = banks.find(b => b.id === bankId);
      if (!confirm(`Excluir o banco/investimento ${bank?.name || ''}?`)) return;
      await deleteDoc(doc(db, 'banks', bankId));
      addLog(bankId, `Banco ${bank?.name || ''}`, 'Banco/investimento excluído');
    } catch (e: any) {
      alert(`Erro ao excluir banco: ${e.message}`);
    }
  };

  // --- Tipster Handlers ---
  const handleSaveTipster = async (t: Tipster) => {
    try {
      if (t.id) {
        const { id, ...data } = t;
        await updateDoc(doc(db, 'tipsters', id), sanitizePayload({ ...data, updatedAt: new Date().toISOString() }));
      } else {
        const { id, ...data } = t as any;
        await addDoc(collection(db, 'tipsters'), sanitizePayload({ ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      }
    } catch (e: any) { console.error(e); alert(`Erro ao salvar tipster: ${e.message}`); }
  };

  const handleDeleteTipster = async (id: string) => {
    try {
      const t = tipsters.find(x => x.id === id);
      if (!confirm(`Excluir o tipster ${t?.name || ''}? As apostas já registradas não são afetadas.`)) return;
      await deleteDoc(doc(db, 'tipsters', id));
    } catch (e: any) { alert(`Erro ao excluir tipster: ${e.message}`); }
  };

  // --- Bet Handlers ---
  const handleSaveBet = async (b: Bet) => {
    try {
      if (b.id) {
        const { id, ...data } = b;
        await updateDoc(doc(db, 'bets', id), sanitizePayload({ ...data, updatedAt: new Date().toISOString() }));
      } else {
        const { id, ...data } = b as any;
        await addDoc(collection(db, 'bets'), sanitizePayload({ ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      }
    } catch (e: any) { console.error(e); alert(`Erro ao salvar aposta: ${e.message}`); }
  };

  const handleDeleteBet = async (id: string) => {
    try {
      if (!confirm('Excluir esta aposta?')) return;
      await deleteDoc(doc(db, 'bets', id));
    } catch (e: any) { alert(`Erro ao excluir aposta: ${e.message}`); }
  };

  const handleDeleteManyBets = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      // Firestore aceita até 500 operações por batch; dividimos em blocos por segurança.
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'bets', id)));
        await batch.commit();
      }
    } catch (e: any) { console.error(e); alert(`Erro ao excluir apostas: ${e.message}`); }
  };

  // --- Danger Zone / Database Clearing (CHUNKED DELETE) ---
  const handleClearOperationalData = async (): Promise<number> => {
     // Function to delete entire collections in batches of 100
     const deleteCollection = async (collectionName: string): Promise<number> => {
        const q = query(collection(db, collectionName), limit(100));
        const snapshot = await getDocs(q);
        
        if (snapshot.size === 0) return 0;
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Recursively call to delete remaining docs
        return snapshot.size + await deleteCollection(collectionName);
     };

     let totalDeleted = 0;
     totalDeleted += await deleteCollection('tasks');
     totalDeleted += await deleteCollection('accounts');
     totalDeleted += await deleteCollection('packs');
     totalDeleted += await deleteCollection('logs');
     totalDeleted += await deleteCollection('pixKeys');
     totalDeleted += await deleteCollection('transactions');
     
     return totalDeleted;
  };

  // --- Settings Handlers ---
  
  const setHousesHandler = (_newHouses: string[]) => {
      // Used by settings to add single house logic
  };
  
  const handleRestoreDefaults = async () => {
      if (confirm("Isso irá APAGAR TODAS as Casas e Tipos de Pendência configurados e restaurar os originais do sistema. Continuar?")) {
          try {
              const batch = writeBatch(db);
              
              const existingHouses = await getDocs(collection(db, 'config_houses'));
              existingHouses.forEach(doc => {
                  batch.delete(doc.ref);
              });
              
              const existingTypes = await getDocs(collection(db, 'config_types'));
              existingTypes.forEach(doc => {
                  batch.delete(doc.ref);
              });
              
              MOCK_HOUSES.forEach((h, idx) => {
                 const docRef = doc(collection(db, 'config_houses'));
                 batch.set(docRef, { name: h, order: idx });
              });

              Object.entries(TASK_TYPE_LABELS).forEach(([key, value], idx) => {
                  const docRef = doc(collection(db, 'config_types'));
                  batch.set(docRef, { label: value, value: key, order: idx });
              });

              await batch.commit();
              alert("Padrões (Casas e Tipos) restaurados com sucesso!");
          } catch(e: any) {
              console.error(e);
              alert("Erro ao restaurar: " + e.message);
          }
      }
  };

  const handleReorderHouses = async (newOrder: string[]) => {
      try {
          const batch = writeBatch(db);
          newOrder.forEach((houseName, index) => {
              const houseDoc = rawHouses.find(r => r.name === houseName);
              if (houseDoc) {
                  const ref = doc(db, 'config_houses', houseDoc.id);
                  batch.update(ref, { order: index });
              }
          });
          await batch.commit();
      } catch (e) {
          console.error("Erro ao reordenar casas:", e);
      }
  };

  const handleReorderTypes = async (newOrder: {id?: string, label: string, value: string}[]) => {
      try {
          const batch = writeBatch(db);
          newOrder.forEach((typeObj, index) => {
              if (typeObj.id) {
                  const ref = doc(db, 'config_types', typeObj.id);
                  batch.update(ref, { order: index });
              }
          });
          await batch.commit();
      } catch (e) {
          console.error("Erro ao reordenar tipos:", e);
      }
  };

  const handleSettingsLog = (desc: string, act: string) => addLog(undefined, desc, act);

  const handleLogout = () => {
      signOut(auth);
  };

  if (authLoading) {
      return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!currentUser) {
      return <Login onLogin={setCurrentUser} />;
  }

  const houseProviders: Record<string, string> = {};
  rawHouses.forEach(r => { if (r.provider) houseProviders[r.name] = r.provider; });

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
      {activeTab === 'DASHBOARD' && (
          <TaskBoard 
            tasks={tasks} 
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            users={users} 
            onUpdateStatus={handleUpdateStatus} 
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onFinishNewAccountTask={handleFinishNewAccountTask} 
            onReorderTasks={handleReorderTasks}
            availableTypes={taskTypes}
            logs={logs} 
            accounts={accounts} 
            availableHouses={houses} 
          />
      )}
      {activeTab === 'NEW_REQUEST' && (
          <NewRequestForm 
            onSave={handleCreateTask} 
            availableHouses={houses} 
            availableTypes={taskTypes} 
            accounts={accounts}
            pixKeys={pixKeys}
            currentUser={currentUser}
          />
      )}
      {activeTab === 'PACKS' && (
          <PackList 
             packs={packs}
             accounts={accounts}
             availableHouses={houses}
             onCreatePack={handleCreatePack}
             onEditPack={handleEditPack}
             currentUser={currentUser}
             availableTypes={taskTypes} 
             logs={logs} 
          />
      )}
      {activeTab === 'HISTORY' && currentUser?.role !== 'USER' && currentUser?.role !== 'AGENCIA' && <HistoryLog logs={logs} />}
      {activeTab === 'ACCOUNTS_ACTIVE' && (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'ACTIVE')} 
            type="ACTIVE" 
            holders={holders}
            transactions={transactions}
            onSaveHolder={handleSaveHolder}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onLimit={handleLimitAccount} 
            onReplacement={handleMarkReplacement}
            onDelete={handleDeleteAccount}
            onSave={handleSaveAccount} 
            availableHouses={houses}
            logs={logs}
            tasks={tasks}
            availableTypes={taskTypes}
          />
      )}
      {activeTab === 'ACCOUNTS_LIMITED' && (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'LIMITED')} 
            type="LIMITED" 
            holders={holders}
            transactions={transactions}
            onSaveHolder={handleSaveHolder}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onSave={handleSaveAccount}
            onReplacement={handleMarkReplacement}
            onWithdraw={handleCreateWithdrawalForAccount}
            onReactivate={handleReactivateAccount}
            onDelete={handleDeleteAccount}
            availableHouses={houses}
            logs={logs}
            tasks={tasks}
            availableTypes={taskTypes}
          />
      )}
      {activeTab === 'ACCOUNTS_REPLACEMENT' && (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'REPLACEMENT')} 
            type="REPLACEMENT" 
            holders={holders}
            transactions={transactions}
            onSaveHolder={handleSaveHolder}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onSave={handleSaveAccount}
            onReactivate={handleReactivateAccount}
            onDelete={handleDeleteAccount}
            onWithdraw={handleCreateWithdrawalForAccount}
            availableHouses={houses}
            logs={logs}
            tasks={tasks}
            availableTypes={taskTypes}
          />
      )}
      {activeTab === 'ACCOUNTS_DELETED' && (
          <AccountList 
            accounts={accounts.filter(a => a.status === 'DELETED')} 
            type="DELETED" 
            holders={holders}
            transactions={transactions}
            onSaveHolder={handleSaveHolder}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            packs={packs}
            pixKeys={pixKeys}
            currentUser={currentUser}
            onReactivate={handleReactivateAccount}
            onDelete={handlePermanentDeleteAccount}
            availableHouses={houses}
            logs={logs}
            tasks={tasks}
            availableTypes={taskTypes}
          />
      )}
      {activeTab === 'SETTINGS' && currentUser?.role !== 'AGENCIA' && (
          <Settings
            houses={houses}
            rawHouses={rawHouses}
            providers={providers}
            accounts={accounts}
            tasks={tasks}
            setHouses={setHousesHandler}
            onReorderHouses={handleReorderHouses}
            taskTypes={taskTypes} 
            setTaskTypes={() => {}} 
            onReorderTypes={handleReorderTypes}
            pixKeys={pixKeys}
            setPixKeys={() => {}}
            currentUser={currentUser}
            users={users}
            onUpdateUser={handleUpdateUser}
            onUpdateUserRole={handleUpdateUserRole}
            logAction={handleSettingsLog}
            onReset={handleRestoreDefaults}
            onClearDatabase={handleClearOperationalData}
          />
      )}
      {activeTab === 'INSIGHTS' && currentUser?.role === 'ADMIN' && (
          <Insights 
            tasks={tasks} 
            accounts={accounts} 
            availableHouses={houses}
            packs={packs}
            users={users}
            taskTypes={taskTypes}
            transactions={transactions}
            holders={holders}
          />
      )}
      {activeTab === 'HOLDERS' && (
          <HolderList
            holders={holders}
            accounts={accounts}
            transactions={transactions}
            availableHouses={houses}
            onSaveHolder={handleSaveHolder}
            onDeleteHolder={handleDeleteHolder}
          />
      )}
      {activeTab === 'BALANCES' && (
          <Balances
            accounts={accounts}
            holders={holders}
            banks={banks}
            onSaveAccount={handleSaveAccount}
            onSaveBank={handleSaveBank}
            onDeleteBank={handleDeleteBank}
          />
      )}
      {activeTab === 'BETS' && (
          <Bets
            bets={bets}
            tipsters={tipsters}
            accounts={accounts}
            availableHouses={houses}
            houseProviders={houseProviders}
            onSaveBet={handleSaveBet}
            onDeleteBet={handleDeleteBet}
            onDeleteManyBets={handleDeleteManyBets}
            onSaveTipster={handleSaveTipster}
            onDeleteTipster={handleDeleteTipster}
          />
      )}
    </Layout>
  );
};

export default App;