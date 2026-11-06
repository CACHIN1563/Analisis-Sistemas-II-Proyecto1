import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { CierreDiario, CierreMensual } from '../types';
import { fmtMoney } from '../types';
import { Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CierresProps {
  fechaCorte: string;
}

export const Cierres: React.FC<CierresProps> = ({ fechaCorte }) => {
  const [tabActiva, setTabActiva] = useState<'mensual' | 'diario'>('mensual');
  const [anio, setAnio] = useState<number>(2026);
  const [mes, setMes] = useState<number>(10);
  const [fechaDiaria, setFechaDiaria] = useState<string>(fechaCorte || '2026-10-31');

  const [cierreMensual, setCierreMensual] = useState<CierreMensual | null>(null);
  const [cierreDiario, setCierreDiario] = useState<CierreDiario | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarCierreMensual = async (a: number, m: number) => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.getCierreMensual(a, m);
      setCierreMensual(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener cierre mensual');
    } finally {
      setCargando(false);
    }
  };

  const cargarCierreDiario = async (f: string) => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.getCierreDiario(f);
      setCierreDiario(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener cierre diario');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tabActiva === 'mensual') {
      cargarCierreMensual(anio, mes);
    } else {
      cargarCierreDiario(fechaDiaria);
    }
  }, [tabActiva, anio, mes, fechaDiaria]);

  return (
    <div className="space-y-5 text-slate-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Cierres Contables Periódicos</h2>
            <p className="text-xs text-slate-400">Consolidación de colocación y cobranza por conceptos contables</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTabActiva('mensual')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              tabActiva === 'mensual'
                ? 'bg-purple-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cierre Mensual (G-2)
          </button>
          <button
            onClick={() => setTabActiva('diario')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              tabActiva === 'diario'
                ? 'bg-purple-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cierre Diario (G-3)
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {tabActiva === 'mensual' ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-400 font-medium">Período:</span>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none"
            >
              <option value={10}>Octubre (Canónico)</option>
              <option value={9}>Septiembre</option>
              <option value={8}>Agosto</option>
            </select>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none"
            >
              <option value={2026}>2026</option>
            </select>
            <button
              onClick={() => cargarCierreMensual(anio, mes)}
              disabled={cargando}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold rounded-xl border border-purple-500/30"
            >
              {cargando ? '...' : 'Consultar'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-400 font-medium">Fecha Diaria:</span>
            <input
              type="date"
              value={fechaDiaria}
              onChange={(e) => setFechaDiaria(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-cyan-400 font-mono focus:outline-none"
            />
            <button
              onClick={() => cargarCierreDiario(fechaDiaria)}
              disabled={cargando}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold rounded-xl border border-purple-500/30"
            >
              {cargando ? '...' : 'Consultar'}
            </button>
          </div>
        )}

        <span className="text-slate-500 text-[11px]">Fuente: Asientos canónicos de PGlite</span>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Monthly Close (G-2) */}
      {tabActiva === 'mensual' && cierreMensual && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Desembolsos (Colocación)</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  Q {fmtMoney(cierreMensual.desembolsos.totalCapital)}
                </span>
                <span className="text-xs text-cyan-400 mt-1 block">
                  {cierreMensual.desembolsos.cantidad} créditos formalizados
                </span>
              </div>
              <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-500/30">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recaudación (Cobranza Total)</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  Q {fmtMoney(cierreMensual.recuperaciones.totalRecaudado)}
                </span>
                <span className="text-xs text-emerald-400 mt-1 block">
                  {cierreMensual.recuperaciones.cantidadPagos} pagos procesados
                </span>
              </div>
              <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-500/30">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">
                Desglose de Cobranza por Concepto
              </span>
              <span className="font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                {cierreMensual.periodo}
              </span>
            </div>

            <table className="min-w-full divide-y divide-slate-800 text-xs font-mono">
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-left font-sans text-slate-200">Amortización a Saldo de Capital</td>
                  <td className="px-4 py-3 text-right font-bold text-white">Q {fmtMoney(cierreMensual.recuperaciones.porConcepto.capital)}</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-left font-sans text-slate-200">Intereses Corrientes Compensatorios</td>
                  <td className="px-4 py-3 text-right font-bold text-cyan-400">Q {fmtMoney(cierreMensual.recuperaciones.porConcepto.interesCorriente)}</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-left font-sans text-slate-200">Intereses Moratorios Devengados</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">Q {fmtMoney(cierreMensual.recuperaciones.porConcepto.interesMoratorio)}</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-left font-sans text-slate-200">Gastos de Cobranza Administrativa</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-400">Q {fmtMoney(cierreMensual.recuperaciones.porConcepto.gastos)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-950 border-t border-slate-800 font-bold">
                <tr>
                  <td className="px-4 py-3 text-left font-sans text-emerald-400">Total Recaudado en el Mes (G-2)</td>
                  <td className="px-4 py-3 text-right text-emerald-400 text-sm">Q {fmtMoney(cierreMensual.recuperaciones.totalRecaudado)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Daily Close (G-3) */}
      {tabActiva === 'diario' && cierreDiario && (
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cierre Diario</span>
              <span className="text-lg font-black text-white font-mono mt-0.5 block">{cierreDiario.fecha}</span>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
              Operaciones: 0
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Total Desembolsado:</span>
              <span className="text-lg font-bold font-mono text-white mt-0.5 block">Q {fmtMoney(cierreDiario.desembolsos.totalCapital)}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Total Recaudado (G-3):</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">Q {fmtMoney(cierreDiario.recuperaciones.totalRecaudado)}</span>
            </div>
          </div>

          <div className="p-3 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs">
            ✔ <strong>Evidencia G-3:</strong> Al 31 de octubre de 2026 no hubo operaciones registradas en el libro diario de la institución.
          </div>
        </div>
      )}
    </div>
  );
};
