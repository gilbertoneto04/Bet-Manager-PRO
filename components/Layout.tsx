import React from 'react';
import { LayoutDashboard, PlusCircle, History, Menu, X, Users, Ban, Settings, BarChart3, Package, RefreshCw, LogOut, Trash2 } from 'lucide-react';
import { TabView, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ tab, icon: Icon, label }: { tab: TabView; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
        activeTab === tab
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          BetManager
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-8 hidden lg:block">
              BetManager
            </h1>
            
            <nav className="space-y-2">
              <NavItem tab="DASHBOARD" icon={LayoutDashboard} label="Pendências" />
              <NavItem tab="NEW_REQUEST" icon={PlusCircle} label="Nova Solicitação" />
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestão</p>
              </div>
              <NavItem tab="PACKS" icon={Package} label="Packs de Contas" />
              <NavItem tab="ACCOUNTS_ACTIVE" icon={Users} label="Contas em Uso" />
              <NavItem tab="ACCOUNTS_LIMITED" icon={Ban} label="Contas Limitadas" />
              <NavItem tab="ACCOUNTS_REPLACEMENT" icon={RefreshCw} label="Reposição" />
              <NavItem tab="ACCOUNTS_DELETED" icon={Trash2} label="Contas Excluídas" />
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sistema</p>
              </div>
              <NavItem tab="INSIGHTS" icon={BarChart3} label="Insights" />
              <NavItem tab="HISTORY" icon={History} label="Histórico" />
              <NavItem tab="SETTINGS" icon={Settings} label="Configurações" />
            </nav>
          </div>
          
          <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                  {user?.name.substring(0,2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200 truncate w-24">{user?.name}</span>
                  <span className="text-[10px] uppercase">{user?.role}</span>
                </div>
              </div>
              <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 relative w-full">
          <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-24">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};