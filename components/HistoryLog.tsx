import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types';
import { User, Calendar, ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react';

export const HistoryLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filter State
  const [searchUser, setSearchUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filter by User Name
      const matchesUser = searchUser === '' || log.user.toLowerCase().includes(searchUser.toLowerCase());

      // Filter by Date Range
      let matchesDate = true;
      if (startDate || endDate) {
        const logDate = new Date(log.timestamp).setHours(0,0,0,0);
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
        const end = endDate ? new Date(endDate).setHours(23,59,59,999) : null;

        if (start && logDate < start) matchesDate = false;
        if (end && logDate > end) matchesDate = false;
      }

      return matchesUser && matchesDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, searchUser, startDate, endDate]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = useMemo(() => {
      const firstIndex = (currentPage - 1) * itemsPerPage;
      return filteredLogs.slice(firstIndex, firstIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const clearFilters = () => {
      setSearchUser('');
      setStartDate('');
      setEndDate('');
      setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold text-white">Histórico de Atividades</h2>
            <div className="flex gap-2 items-center text-xs mt-1">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
                Total: {logs.length}
                </span>
                {filteredLogs.length !== logs.length && (
                    <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded-full font-mono">
                    Filtrados: {filteredLogs.length}
                    </span>
                )}
            </div>
        </div>
        
        {/* Filters Toolbar */}
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Usuário</label>
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input 
                        type="text" 
                        value={searchUser}
                        onChange={(e) => { setSearchUser(e.target.value); setCurrentPage(1); }}
                        placeholder="Buscar usuário..."
                        className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 w-full sm:w-32"
                    />
                </div>
            </div>
            
            <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] text-slate-500 font-bold uppercase">De</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Até</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            {(searchUser || startDate || endDate) && (
                <button 
                    onClick={clearFilters}
                    className="h-[30px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 text-xs"
                    title="Limpar Filtros"
                >
                    <X size={14} />
                    Limpar
                </button>
            )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px]">
        {filteredLogs.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
             <Filter size={48} className="mb-4 opacity-20" />
             <p>Nenhum registro encontrado com os filtros atuais.</p>
           </div>
        ) : (
        <>
            <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950 text-slate-200 uppercase font-medium border-b border-slate-800">
                <tr>
                    <th className="px-6 py-4">Data/Hora</th>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Pendência / Contexto</th>
                    <th className="px-6 py-4">Ação Realizada</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                {currentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500 text-xs">
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
                        <span className="font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded text-xs">
                            {log.taskDescription}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-xs">
                        {log.action}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-slate-800 p-4 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Itens por página:</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1 outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">
                        Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </>
        )}
      </div>
    </div>
  );
};