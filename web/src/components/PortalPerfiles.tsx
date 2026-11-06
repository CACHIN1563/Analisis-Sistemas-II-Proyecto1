import React from 'react';
import { Building2, UserCheck, User, ChevronRight, ShieldCheck } from 'lucide-react';

export type PerfilUsuario = 'asesor' | 'cliente' | 'gerente';

interface PortalPerfilesProps {
  onSeleccionarPerfil: (perfil: PerfilUsuario) => void;
  fechaCorte: string;
}

export const PortalPerfiles: React.FC<PortalPerfilesProps> = ({
  onSeleccionarPerfil,
  fechaCorte
}) => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-between py-6 sm:py-12 px-4 text-center select-none animate-fadeIn">
      {/* Top Brand & Logo */}
      <div className="flex flex-col items-center pt-2">
        {/* Glow & Logo Icon */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-3 sm:p-4 shadow-2xl flex items-center justify-center">
            <Building2 className="w-9 h-9 sm:w-11 sm:h-11 text-slate-950 stroke-[2.2]" />
          </div>
        </div>

        {/* Header Typography */}
        <span className="text-[10px] sm:text-xs font-bold text-cyan-400 tracking-[0.24em] uppercase mt-5 block">
          PORTAL DE ACCESO POR PERFIL
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1.5">
          Crédito Vecino
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 font-normal max-w-md">
          Selecciona tu perfil para continuar
        </p>
      </div>

      {/* Profile Option Cards (01, 02, 03) */}
      <div className="space-y-4 my-8 text-left w-full">
        {/* 01: Asesor de Campo */}
        <button
          type="button"
          onClick={() => onSeleccionarPerfil('asesor')}
          className="w-full relative group bg-gradient-to-r from-slate-900/95 to-slate-900/80 hover:from-slate-800/90 hover:to-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.99] text-left block"
        >
          <span className="absolute top-3 right-4 font-mono text-[10px] font-bold text-slate-600 group-hover:text-cyan-400 transition">
            01
          </span>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-400 shadow-inner">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-cyan-300 transition">
                Perfil Asesor de Campo
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Gestión de originación y cobro en ruta
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* 02: Cliente / Deudor */}
        <button
          type="button"
          onClick={() => onSeleccionarPerfil('cliente')}
          className="w-full relative group bg-gradient-to-r from-slate-900/95 to-slate-900/80 hover:from-slate-800/90 hover:to-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.99] text-left block"
        >
          <span className="absolute top-3 right-4 font-mono text-[10px] font-bold text-slate-600 group-hover:text-emerald-400 transition">
            02
          </span>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:border-emerald-400 shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition">
                Perfil Cliente / Deudor
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Consulta de saldo, plan de pagos y mora
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* 03: Gerencia / Comité */}
        <button
          type="button"
          onClick={() => onSeleccionarPerfil('gerente')}
          className="w-full relative group bg-gradient-to-r from-slate-900/95 to-slate-900/80 hover:from-slate-800/90 hover:to-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.99] text-left block"
        >
          <span className="absolute top-3 right-4 font-mono text-[10px] font-bold text-slate-600 group-hover:text-purple-400 transition">
            03
          </span>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-950/70 border border-purple-500/30 text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:border-purple-400 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-purple-300 transition">
                Perfil Gerencia / Comité
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Supervisión analítica y cierre contable
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>
      </div>

      {/* Footer Info */}
      <div className="pt-4 flex flex-col items-center gap-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-400/90 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[10px]">Corte Canónico: {fechaCorte}</span>
        </div>
        <span>Crédito Vecino, S. A. · Figma UX 2026</span>
      </div>
    </div>
  );
};

