import React from 'react';
import { 
  Building2, 
  FileText, 
  Table, 
  Search, 
  AlertTriangle, 
  CreditCard, 
  BarChart3, 
  Calendar, 
  Bot, 
  ArrowLeft
} from 'lucide-react';
import type { PerfilUsuario } from './PortalPerfiles';

export type ScreenId = 
  | 'portal'
  | 'solicitud' 
  | 'plan' 
  | 'detalle' 
  | 'mora' 
  | 'pago' 
  | 'tablero' 
  | 'cierres';

interface NavbarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  perfilActual: PerfilUsuario | null;
  onCambiarPerfil: () => void;
  fechaCorte: string;
  onFechaCorteChange: (nuevaFecha: string) => void;
  onOpenChat: () => void;
  chatOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  perfilActual,
  onCambiarPerfil,
  fechaCorte,
  onFechaCorteChange,
  onOpenChat,
  chatOpen
}) => {
  // Configurar pestañas según el perfil de Figma activo
  const getNavItems = () => {
    if (perfilActual === 'asesor') {
      return [
        { id: 'solicitud' as ScreenId, label: '1. Solicitud & Desembolso', icon: <FileText className="w-3.5 h-3.5" /> },
        { id: 'pago' as ScreenId, label: '2. Cobranza en Ruta (Pago)', icon: <CreditCard className="w-3.5 h-3.5" /> }
      ];
    }
    if (perfilActual === 'cliente') {
      return [
        { id: 'detalle' as ScreenId, label: '1. Estado de Cuenta', icon: <Search className="w-3.5 h-3.5" /> },
        { id: 'plan' as ScreenId, label: '2. Plan de Cuotas', icon: <Table className="w-3.5 h-3.5" /> },
        { id: 'mora' as ScreenId, label: '3. Detalle de Mora', icon: <AlertTriangle className="w-3.5 h-3.5" /> }
      ];
    }
    // Gerente / Comité
    return [
      { id: 'tablero' as ScreenId, label: '1. Tablero Gerencial', icon: <BarChart3 className="w-3.5 h-3.5" /> },
      { id: 'cierres' as ScreenId, label: '2. Cierres Contables', icon: <Calendar className="w-3.5 h-3.5" /> },
      { id: 'plan' as ScreenId, label: '3. Plan de Cuotas', icon: <Table className="w-3.5 h-3.5" /> },
      { id: 'detalle' as ScreenId, label: '4. Expedientes', icon: <Search className="w-3.5 h-3.5" /> }
    ];
  };

  const navItems = getNavItems();

  return (
    <header className="bg-slate-950/95 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back / Brand */}
        <div className="flex items-center gap-2.5">
          {currentScreen !== 'portal' && (
            <button
              onClick={onCambiarPerfil}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition"
              title="Volver a seleccionar perfil"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Perfiles</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-1.5 flex items-center justify-center text-slate-950 shadow-md">
              <Building2 className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">
                Crédito Vecino
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {perfilActual === 'asesor' ? 'Perfil 01: Asesor de Campo' :
                 perfilActual === 'cliente' ? 'Perfil 02: Cliente / Deudor' :
                 perfilActual === 'gerente' ? 'Perfil 03: Gerencia / Comité' : 'Portal de Acceso'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* Fecha Corte */}
          <div className="flex items-center bg-slate-900 rounded-xl px-2.5 py-1 border border-slate-800">
            <span className="text-[10px] text-slate-400 mr-1.5 font-medium">Corte:</span>
            <input
              type="date"
              value={fechaCorte}
              onChange={(e) => onFechaCorteChange(e.target.value)}
              className="bg-transparent text-xs text-cyan-400 font-mono font-bold focus:outline-none"
            />
          </div>

          {/* Chat AI Button */}
          <button
            onClick={onOpenChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow transition ${
              chatOpen
                ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950'
            }`}
          >
            <Bot className="w-4 h-4 stroke-[2.5]" />
            <span>Asistente IA</span>
          </button>
        </div>
      </div>

      {/* Subnavigation Tabs when inside a profile */}
      {currentScreen !== 'portal' && (
        <div className="max-w-7xl mx-auto px-4 border-t border-slate-900 bg-slate-950/80">
          <nav className="flex space-x-1.5 overflow-x-auto py-1.5 scrollbar-thin">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
