import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Task, Account, Pack, User } from '../types';
import { Filter, TrendingUp, Clock, Hourglass, Activity, AlertTriangle, Briefcase, Calendar } from 'lucide-react';

interface InsightsProps {
  tasks: Task[];
  accounts: Account[];
  availableHouses: string[];
  packs: Pack[];
  users?: User[];
  taskTypes?: { label: string, value: string }[];
}

export const Insights: React.FC<InsightsProps> = ({ tasks, accounts, availableHouses, packs, users, taskTypes }) => {
  // --- Filters State ---
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('ALL');
  
  // Flexible Chart Metrics Selection
  const [metrics, setMetrics] = useState({
      tasksCreated: true,
      tasksResolved: false,
      accountsCreated: false,
      accountsLimited: false
  });

  // Helper date range
  const isInRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr).getTime();
    const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
    const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
    return d >= start && d <= end;
  };

  // --- 1. Metrics Calculation: Task Resolution Time ---
  const taskResolutionData = useMemo(() => {
      let totalTime = 0;
      let count = 0;
      
      tasks.forEach(t => {
          if (t.status === 'FINALIZADA' && t.createdAt && t.resolvedAt) {
              const start = new Date(t.createdAt).getTime();
              const end = new Date(t.resolvedAt).getTime();
              totalTime += (end - start);
              count++;
          }
      });

      if (count === 0) return 0;
      
      const avgMs = totalTime / count;
      const avgHours = avgMs / (1000 * 60 * 60);
      return Math.round(avgHours * 10) / 10; // 1 decimal
  }, [tasks]);

  // --- 2. Metrics Calculation: Account Lifespan ---
  const accountLifespanData = useMemo(() => {
      let totalDays = 0;
      let count = 0;

      accounts.forEach(a => {
          if (a.limitedAt && a.createdAt) {
              const start = new Date(a.createdAt).getTime();
              const end = new Date(a.limitedAt).getTime();
              const diffMs = end - start;
              if (diffMs > 0) {
                  totalDays += diffMs / (1000 * 60 * 60 * 24);
                  count++;
              }
          }
      });

      if (count === 0) return 0;
      return Math.round(totalDays / count);
  }, [accounts]);

  // --- 3. Problem Rate (Replacement vs Total Active/Limited/Replacement) ---
  const problemRate = useMemo(() => {
     const totalConsidered = accounts.filter(a => a.status !== 'DELETED').length;
     const replacements = accounts.filter(a => a.status === 'REPLACEMENT').length;
     
     if (totalConsidered === 0) return 0;
     return Math.round((replacements / totalConsidered) * 100);
  }, [accounts]);

  // --- 4. Main Chart Data (House Volume) ---
  const chartData = useMemo(() => {
      const dataMap: Record<string, any> = {};
      availableHouses.forEach(h => {
          dataMap[h] = { name: h, created: 0, resolved: 0, accCreated: 0, accLimited: 0 };
      });

      tasks.forEach(t => {
          if (!dataMap[t.house]) return;
          if (isInRange(t.createdAt)) {
              dataMap[t.house].created += 1;
          }
          if (t.status === 'FINALIZADA' && t.resolvedAt && isInRange(t.resolvedAt)) {
              dataMap[t.house].resolved += 1;
          }
      });

      accounts.forEach(a => {
          if (!dataMap[a.house]) return;
          if (isInRange(a.createdAt)) {
              dataMap[a.house].accCreated += 1;
          }
          if (a.limitedAt && isInRange(a.limitedAt)) {
              dataMap[a.house].accLimited += 1;
          }
      });

      return Object.values(dataMap);
  }, [tasks, accounts, availableHouses, startDate, endDate]);

  // --- 5. User Performance (Avg Time per Agent) ---
  const agentPerformanceData = useMemo(() => {
      if (!users) return [];
      
      const agentStats: Record<string, { totalTime: number, count: number, name: string }> = {};
      
      // Initialize agents
      users.filter(u => u.role === 'AGENCIA' || u.role === 'KFB').forEach(u => {
          agentStats[u.id] = { totalTime: 0, count: 0, name: u.name.split(' ')[0] };
      });

      tasks.forEach(t => {
          // Filter by Date and Status
          if (t.status === 'FINALIZADA' && t.finishedBy && t.resolvedAt && t.createdAt && isInRange(t.resolvedAt)) {
              // Filter by Task Type if selected
              if (selectedTaskType !== 'ALL' && t.type !== selectedTaskType) return;

              if (agentStats[t.finishedBy]) {
                  const duration = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
                  if (duration > 0) {
                      agentStats[t.finishedBy].totalTime += duration;
                      agentStats[t.finishedBy].count += 1;
                  }
              }
          }
      });

      return Object.values(agentStats)
          .map(stat => ({
              name: stat.name,
              avgTime: stat.count > 0 ? parseFloat((stat.totalTime / stat.count / (1000 * 60 * 60)).toFixed(1)) : 0,
              count: stat.count
          }))
          .filter(d => d.count > 0) // Only show active agents
          .sort((a,b) => a.avgTime - b.avgTime); // Sort by fastest (ascending time)
  }, [tasks, users, startDate, endDate, selectedTaskType]);

  // --- 6. House Durability (Avg Days per House) ---
  const houseDurabilityData = useMemo(() => {
      const houseStats: Record<string, { totalDays: number, count: number }> = {};
      availableHouses.forEach(h => houseStats[h] = { totalDays: 0, count: 0 });

      accounts.forEach(a => {
          if (a.limitedAt && a.createdAt && isInRange(a.limitedAt)) {
              if (houseStats[a.house]) {
                  const duration = new Date(a.limitedAt).getTime() - new Date(a.createdAt).getTime();
                  const days = duration / (1000 * 60 * 60 * 24);
                  if (days > 0) {
                      houseStats[a.house].totalDays += days;
                      houseStats[a.house].count += 1;
                  }
              }
          }
      });

      return Object.entries(houseStats)
          .map(([house, stat]) => ({
              name: house,
              avgDays: stat.count > 0 ? Math.round(stat.totalDays / stat.count) : 0
          }))
          .filter(d => d.avgDays > 0)
          .sort((a,b) => b.avgDays - a.avgDays); // Sort by longest lasting
  }, [accounts, availableHouses, startDate, endDate]);


  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-200 font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name === 'created' ? 'Pendências Criadas' : 
               entry.name === 'resolved' ? 'Pendências Resolvidas' :
               entry.name === 'accCreated' ? 'Contas Criadas' :
               entry.name === 'accLimited' ? 'Contas Limitadas' :
               entry.name === 'avgTime' ? 'Tempo Médio (Horas)' :
               entry.name === 'avgDays' ? 'Duração Média (Dias)' :
               entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white">Insights Avançados</h2>
        <p className="text-slate-400 text-sm mt-1">Análise unificada de pendências e contas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-sm text-slate-400 font-medium mb-1">Tempo Médio de Resolução</p>
              <h3 className="text-3xl font-bold text-white">{taskResolutionData}h</h3>
           </div>
           <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20">
               <Clock size={24} />
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-sm text-slate-400 font-medium mb-1">Duração Média de Contas</p>
              <h3 className="text-3xl font-bold text-amber-400">{accountLifespanData} dias</h3>
           </div>
           <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400 border border-amber-500/20">
               <Hourglass size={24} />
           </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-sm text-slate-400 font-medium mb-1">Taxa de Problemas (Reposição)</p>
              <h3 className={`text-3xl font-bold ${problemRate > 20 ? 'text-red-400' : 'text-emerald-400'}`}>{problemRate}%</h3>
           </div>
           <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${problemRate > 20 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
               <AlertTriangle size={24} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Chart Section */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col xl:flex-row justify-between gap-6 mb-6">
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-500" />
                        Volume Operacional
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={metrics.tasksCreated} onChange={() => setMetrics(p => ({...p, tasksCreated: !p.tasksCreated}))} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"/>
                            Pendências Criadas
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={metrics.tasksResolved} onChange={() => setMetrics(p => ({...p, tasksResolved: !p.tasksResolved}))} className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"/>
                            Resolvidas
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={metrics.accountsCreated} onChange={() => setMetrics(p => ({...p, accountsCreated: !p.accountsCreated}))} className="rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"/>
                            Contas Criadas
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={metrics.accountsLimited} onChange={() => setMetrics(p => ({...p, accountsLimited: !p.accountsLimited}))} className="rounded text-amber-600 focus:ring-amber-500 bg-slate-800 border-slate-700"/>
                            Contas Limitadas
                        </label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                    </div>
                    <div>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                    </div>
                    <button 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs border border-slate-700"
                    >
                        <Filter size={12} />
                    </button>
                </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                        <Legend />
                        {metrics.tasksCreated && <Bar name="created" dataKey="created" fill="#6366f1" radius={[4, 4, 0, 0]} />}
                        {metrics.tasksResolved && <Bar name="resolved" dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} />}
                        {metrics.accountsCreated && <Bar name="accCreated" dataKey="accCreated" fill="#3b82f6" radius={[4, 4, 0, 0]} />}
                        {metrics.accountsLimited && <Bar name="accLimited" dataKey="accLimited" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className="space-y-6">
             {/* Agent Performance Chart */}
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-[300px] flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                        <Activity size={18} className="text-purple-500" />
                        Tempo Médio (Agência)
                    </h3>
                    <select 
                        value={selectedTaskType} 
                        onChange={(e) => setSelectedTaskType(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 max-w-[100px]"
                    >
                        <option value="ALL">Todas</option>
                        {taskTypes?.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentPerformanceData} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={50} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="avgTime" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} label={{ position: 'right', fill: '#94a3b8', fontSize: 10, formatter: (v: number) => `${v}h` }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {agentPerformanceData.length === 0 && <p className="text-xs text-slate-600 text-center">Sem dados para este filtro</p>}
             </div>
             
             {/* House Durability Chart */}
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-[300px] flex flex-col">
                <h3 className="text-md font-bold text-white flex items-center gap-2 mb-4">
                    <Briefcase size={18} className="text-amber-500" />
                    Durabilidade (Dias)
                </h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={houseDurabilityData} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={60} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="avgDays" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} label={{ position: 'right', fill: '#94a3b8', fontSize: 10, formatter: (v: number) => `${v}d` }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {houseDurabilityData.length === 0 && <p className="text-xs text-slate-600 text-center">Nenhuma conta limitada no período</p>}
             </div>
          </div>
      </div>
    </div>
  );
};