import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { fmtMoney } from '../types';
import { AlertTriangle, Search, ArrowRight } from 'lucide-react';

interface DetalleMoraProps {
  initialCreditoId?: string;
  initialNumeroCuota?: number;
  fechaCorte: string;
  onRegistrarPago?: (idCredito: string) => void;
}

export const DetalleMora: React.FC<DetalleMoraProps> = ({
  initialCreditoId,
  initialNumeroCuota,
  fechaCorte,
  onRegistrarPago
}) => {
  const [idCredito, setIdCredito] = useState(initialCreditoId || 'CV-2026-0035');
  const [numeroCuota, setNumeroCuota] = useState<number>(initialNumeroCuota || 2);
  const [fechaEvaluacion, setFechaEvaluacion] = useState(fechaCorte || '2026-10-31');
  const [cargando, setCargando] = useState(false);
  const [moraData, setMoraData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultarMora = async (id: string, cuota: number, fecha: string) => {
    if (!id.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const data = await api.explicarMora(id.trim().toUpperCase(), cuota, fecha);
      setMoraData(data);
    } catch (err: any) {
      setError(err.message || 'Error al consultar desglose de mora');
      setMoraData(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (initialCreditoId) setIdCredito(initialCreditoId);
    if (initialNumeroCuota) setNumeroCuota(initialNumeroCuota);
    setFechaEvaluacion(fechaCorte);
    consultarMora(initialCreditoId || idCredito, initialNumeroCuota || numeroCuota, fechaCorte);
  }, [initialCreditoId, initialNumeroCuota, fechaCorte]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    consultarMora(idCredito, numeroCuota, fechaEvaluacion);
  };

  const cargarEjemplo = (id: string, cuota: number, fecha: string) => {
    setIdCredito(id);
    setNumeroCuota(cuota);
    setFechaEvaluacion(fecha);
    consultarMora(id, cuota, fecha);
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Explicabilidad de Mora</h2>
              <p className="text-xs text-slate-400">Desglose tramo por tramo según política institucional</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => cargarEjemplo('CV-2026-0035', 2, '2026-10-31')}
              className="px-2.5 py-1 bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-600/40 rounded-lg text-[10px] font-mono font-bold transition"
            >
              OP-2: CV-2026-0035
            </button>
            <button
              onClick={() => cargarEjemplo('CV-2026-0030', 3, '2026-10-31')}
              className="px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-600/40 rounded-lg text-[10px] font-mono font-bold transition"
            >
              G-5: CV-2026-0030
            </button>
            <button
              onClick={() => cargarEjemplo('CV-2026-0410', 2, '2027-01-24')}
              className="px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900/90 text-purple-300 border border-purple-600/40 rounded-lg text-[10px] font-mono font-bold transition"
            >
              G-7: CV-2026-0410 (2027)
            </button>
          </div>
        </div>

        {/* Search input grid */}
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">ID Crédito</label>
            <input
              type="text"
              value={idCredito}
              onChange={(e) => setIdCredito(e.target.value.toUpperCase())}
              className="w-full text-xs font-mono uppercase px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Cuota #</label>
            <input
              type="number"
              min="1"
              value={numeroCuota}
              onChange={(e) => setNumeroCuota(Number(e.target.value))}
              className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Fecha de Evaluación</label>
            <input
              type="date"
              value={fechaEvaluacion}
              onChange={(e) => setFechaEvaluacion(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl shadow transition flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{cargando ? '...' : 'Explicar Mora'}</span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {moraData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Días de Atraso</span>
              <span className="text-xl font-extrabold text-rose-400 font-mono block">
                {moraData.dias_atraso_total} días
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {moraData.tramo_actual}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Política Aplicada</span>
              <span className="text-sm font-extrabold text-purple-300 font-mono block">
                {moraData.politica}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Vence: {moraData.fecha_vencimiento}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recargos de Mora</span>
              <span className="text-base font-extrabold text-amber-400 font-mono block">
                Q {(Number(fmtMoney(moraData.total_mora)) + Number(fmtMoney(moraData.gastos_gestion))).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Mora: Q {fmtMoney(moraData.total_mora)} · Gastos: Q {fmtMoney(moraData.gastos_gestion)}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Exigible al Corte</span>
              <span className="text-lg font-black text-emerald-400 font-mono block">
                Q {fmtMoney(moraData.total_exigible)}
              </span>
              <span className="text-[10px] text-emerald-500 block mt-0.5">
                Incluye capital e intereses
              </span>
            </div>
          </div>

          {/* Breakdown Table: Tramos Recorridos */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Desglose por Tramos Recorridos
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Cálculo tramo a tramo conforme a las tasas pactadas
                </span>
              </div>
              <span className="bg-amber-950 text-amber-300 border border-amber-600/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {moraData.desglose_tramos?.length || 0} tramos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Tramo de Mora</th>
                    <th className="px-3 py-2.5 text-center">Días en Tramo</th>
                    <th className="px-3 py-2.5 text-right">Tasa Anual</th>
                    <th className="px-3 py-2.5 text-right">Interés Calculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {moraData.desglose_tramos?.map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-left font-sans font-medium text-slate-200">
                        {t.tramo}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-300">
                        {t.diasEnTramo} días
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {t.tasaAplicada}%
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-amber-400">
                        Q {fmtMoney(t.interesTramo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Exigible Summary Bar */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-300 flex flex-wrap justify-between items-center gap-2">
              <span>
                Capital (Q {fmtMoney(moraData.capital_cuota || moraData.capital_exigible)}) + Interés (Q {fmtMoney(moraData.interes_corriente)}) + Mora (Q {fmtMoney(moraData.total_mora)}) + Gastos (Q {fmtMoney(moraData.gastos_gestion)})
              </span>
              <span className="font-mono text-emerald-400 font-extrabold text-xs">
                = Q {fmtMoney(moraData.total_exigible)}
              </span>
            </div>
          </div>

          {onRegistrarPago && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => onRegistrarPago(moraData.id_credito)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow transition"
              >
                <span>Proceder a Registro de Pago</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
