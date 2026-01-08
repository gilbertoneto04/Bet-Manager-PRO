import React from 'react';
import { LogEntry } from '../types';
import { ScrollText, User, Calendar } from 'lucide-react';

export const HistoryLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sortedLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <ScrollText size={48} className="mb-4 opacity-50" />
        <p className="text-lg">Nenhum registro de atividade encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Histórico de Atividades</h2>
        <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-mono">
          {logs.length} registros
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950 text-slate-200 uppercase font-medium border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Pendência</th>
                <th className="px-6 py-4">Ação Realizada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                        <span className="text-slate-600">|</span>
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400">
                        <User size={12} />
                      </div>
                      {log.user}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded">
                        {log.taskDescription}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {log.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};