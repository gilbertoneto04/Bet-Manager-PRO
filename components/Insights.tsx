import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Task, Account, TaskStatus } from '../types';
import { DollarSign, TrendingUp, CheckCircle2, AlertOctagon } from 'lucide-react';

interface InsightsProps {
  tasks: Task[];
  accounts: Account[];
  availableHouses: string[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Insights: React.FC<InsightsProps> = ({ tasks, accounts, availableHouses }) => {

  // --- Metrics Calculation ---

  const metrics = useMemo(() => {
    const totalDeposited = accounts.reduce((sum, acc) => sum + (acc.depositValue || 0), 0);
    const activeAccounts = accounts.filter(a => a.status === 'ACTIVE').length;
    const limitedAccounts = accounts.filter(a => a.status === 'LIMITED').length;
    
    const validTasks = tasks.filter(t => t.status !== TaskStatus.EXCLUIDA);
    const pendingTasks = validTasks.filter(t => t.status !== TaskStatus.FINALIZADA).length;
    
    const completionRate = validTasks.length > 0 
      ? Math.round((validTasks.filter(t => t.status === TaskStatus.FINALIZADA).length / validTasks.length) * 100)
      : 0;

    return { totalDeposited, activeAccounts, limitedAccounts, pendingTasks, completionRate };
  }, [tasks, accounts]);

  // --- Chart Data Preparation ---

  // 1. Deposits per House
  const depositsData = useMemo(() => {
    const data = availableHouses.map(house => {
      const houseAccounts = accounts.filter(a => a.house === house);
      const total = houseAccounts.reduce((sum, a) => sum + (a.depositValue || 0), 0);
      return { name: house, value: total };
    });
    return data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [accounts, availableHouses]);

  // 2. Task Status Distribution
  const statusData = useMemo(() => {
    const counts = {
      [TaskStatus.PENDENTE]: 0,
      [TaskStatus.SOLICITADA]: 0,
      [TaskStatus.FINALIZADA]: 0
    };
    
    tasks.forEach(t => {
      if (t.status !== TaskStatus.EXCLUIDA && counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    return [
      { name: 'Pendente', value: counts[TaskStatus.PENDENTE], color: '#f59e0b' },
      { name: 'Solicitada', value: counts[TaskStatus.SOLICITADA], color: '#3b82f6' },
      { name: 'Finalizada', value: counts[TaskStatus.FINALIZADA], color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [tasks]);

  // 3. Volume by House (Tasks vs Accounts)
  const volumeData = useMemo(() => {
    return availableHouses.map(house => {
      return {
        name: house,
        Tarefas: tasks.filter(t => t.house === house && t.status !== TaskStatus.EXCLUIDA).length,
        Contas: accounts.filter(a => a.house === house).length
      };
    }).sort((a, b) => (b.Tarefas + b.Contas) - (a.Tarefas + a.Contas));
  }, [tasks, accounts, availableHouses]);

  // Custom Tooltip for dark mode
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-200 font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-white">Insights & Analytics</h2>
        <p className="text-slate-400 text-sm mt-1">Visão geral do desempenho da operação</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign size={20} />
            </div>
            <span className="text-sm text-slate-400 font-medium">Total Investido</span>
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {metrics.totalDeposited.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm text-slate-400 font-medium">Contas Ativas</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.activeAccounts} <span className="text-sm text-slate-500 font-normal">/ {metrics.activeAccounts + metrics.limitedAccounts} Total</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <AlertOctagon size={20} />
            </div>
            <span className="text-sm text-slate-400 font-medium">Pendências Abertas</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.pendingTasks}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm text-slate-400 font-medium">Taxa de Conclusão</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.completionRate}%
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits by House */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Volume Financeiro por Casa</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depositsData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `R$${val}`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                <Bar dataKey="value" name="Valor" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Status das Solicitações</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {statusData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500">Sem dados suficientes</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-white mb-6">Volume de Operações por Casa (Tarefas vs Contas)</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
              <Legend />
              <Bar dataKey="Tarefas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Contas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};