import React from 'react';
import { LayoutDashboard, PlusCircle, History, Menu, X, Users, Ban, Settings, BarChart3, Package, RefreshCw, LogOut, Trash2, Contact, Wallet, Dices, LineChart, Receipt, CalendarRange, ChevronDown, ChevronRight } from 'lucide-react';
import { TabView, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  user: User | null;
  onLogout: () => void;
}

// Fora do Layout de propósito: definido dentro, o React recriava o tipo do componente
// a cada render e REMONTAVA todos os botões — a rolagem da barra lateral pulava
// para o topo a cada clique. Com identidade estável, o DOM (e o scroll) é preservado.
const NavItem = ({ tab, icon: Icon, label, activeTab, onSelect }: { tab: TabView; icon: any; label: string; activeTab: TabView; onSelect: (t: TabView) => void }) => (
  <button
    onClick={() => onSelect(tab)}
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

// Cabeçalho de seção colapsável (também fora do Layout para não remontar/perder o scroll).
const SectionHeader = ({ id, title, collapsed, onToggle }: { id: string; title: string; collapsed: boolean; onToggle: (id: string) => void }) => (
  <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between gap-2 px-4 pt-4 pb-1 group" title={collapsed ? 'Expandir' : 'Minimizar'}>
    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-300 uppercase tracking-wider transition-colors">{title}</span>
    {collapsed ? <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" /> : <ChevronDown size={14} className="text-slate-600 group-hover:text-slate-400" />}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const toggleSection = (id: string) => setCollapsedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const open = (id: string) => !collapsedSections.has(id);

  const selectTab = (tab: TabView) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Gestão Gilbet
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 active:bg-slate-800 rounded-lg">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
            isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div className="px-6 pt-6 pb-3 shrink-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hidden lg:block">
              Gestão Gilbet
            </h1>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-2">
              <NavItem activeTab={activeTab} onSelect={selectTab} tab="DASHBOARD" icon={LayoutDashboard} label="Pendências" />
              <NavItem activeTab={activeTab} onSelect={selectTab} tab="NEW_REQUEST" icon={PlusCircle} label="Nova Solicitação" />
              {/* Seção Pessoal */}
              <SectionHeader id="pessoal" title="Pessoal" collapsed={!open('pessoal')} onToggle={toggleSection} />
              {open('pessoal') && (
                <div className="space-y-2">
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="BALANCES" icon={Wallet} label="Saldos" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="EXPENSES" icon={Receipt} label="Gastos" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="SUMMARY" icon={CalendarRange} label="Resumo" />
                </div>
              )}

              {/* Seção Contas */}
              <SectionHeader id="contas" title="Contas" collapsed={!open('contas')} onToggle={toggleSection} />
              {open('contas') && (
                <div className="space-y-2">
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="HOLDERS" icon={Contact} label="Titulares" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="PACKS" icon={Package} label="Packs de Contas" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="ACCOUNTS_ACTIVE" icon={Users} label="Contas em Uso" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="ACCOUNTS_LIMITED" icon={Ban} label="Contas Limitadas" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="ACCOUNTS_REPLACEMENT" icon={RefreshCw} label="Reposição" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="ACCOUNTS_DELETED" icon={Trash2} label="Contas Excluídas" />
                </div>
              )}

              {/* Seção Apostas */}
              <SectionHeader id="apostas" title="Apostas" collapsed={!open('apostas')} onToggle={toggleSection} />
              {open('apostas') && (
                <div className="space-y-2">
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="BETS" icon={Dices} label="Apostas" />
                  <NavItem activeTab={activeTab} onSelect={selectTab} tab="RESULTS" icon={LineChart} label="Resultados" />
                </div>
              )}

              {/* Seção Sistema (respeita as permissões) */}
              {(user?.role === 'ADMIN' || user?.role !== 'AGENCIA') && (
                <SectionHeader id="sistema" title="Sistema" collapsed={!open('sistema')} onToggle={toggleSection} />
              )}
              {open('sistema') && (
                <div className="space-y-2">
                  {user?.role === 'ADMIN' && (
                    <NavItem activeTab={activeTab} onSelect={selectTab} tab="INSIGHTS" icon={BarChart3} label="Insights" />
                  )}
                  {user?.role !== 'USER' && user?.role !== 'AGENCIA' && (
                    <NavItem activeTab={activeTab} onSelect={selectTab} tab="HISTORY" icon={History} label="Histórico" />
                  )}
                  {user?.role !== 'AGENCIA' && (
                    <NavItem activeTab={activeTab} onSelect={selectTab} tab="SETTINGS" icon={Settings} label="Configurações" />
                  )}
                </div>
              )}
          </nav>

          <div className="shrink-0 w-full p-6 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                  {user?.name.substring(0,2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-slate-200 truncate w-24">{user?.name}</span>
                  <span className="text-[10px] uppercase">{user?.role}</span>
                </div>
              </div>
              <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors p-2" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 relative w-full scroll-smooth">
          <div className="max-w-[1600px] mx-auto p-4 lg:px-10 lg:py-8 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};