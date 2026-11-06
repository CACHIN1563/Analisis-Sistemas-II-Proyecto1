import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { EstadoCredito } from '../types';
import { fmtMoney } from '../types';
import { Table, Search, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface PlanAmortizacionProps {
  initialCreditoId?: string;
  fechaCorte: string;
}

export const PlanAmortizacion: React.FC<PlanAmortizacionProps> = ({
  initialCreditoId,
  fechaCorte
}) => {
  const [idCredito, setIdCredito] = useState(initialCreditoId || 'CV-2026-0043');
  const [cargando, setCargando] = useState(false);
  const [estadoCredito, setEstadoCredito] = useState<EstadoCredito | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarCredito = async (id: string) => {
    if (!id.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const data = await api.obtenerEstadoCredito(id.trim().toUpperCase(), fechaCorte);
      setEstadoCredito(data);
    } catch (err: any) {
      setError(err.message || `No se pudo encontrar el crédito ${id}`);
      setEstadoCredito(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (initialCreditoId) {
      setIdCredito(initialCreditoId);
      cargarCredito(initialCreditoId);
    } else {
      cargarCredito('CV-2026-0043');
    }
  }, [initialCreditoId, fechaCorte]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarCredito(idCredito);
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Plan de Amortización</h2>
              <p className="text-xs text-slate-400">Cronograma de cuotas niveladas francesas y regla del centavo</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['CV-2026-0043', 'CV-2026-0035', 'CV-2026-0030', 'CV-2026-0061'].map((ej) => (
              <button
                key={ej}
                onClick={() => { setIdCredito(ej); cargarCredito(ej); }}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                  idCredito === ej
                    ? 'bg-cyan-500 text-slate-950 font-extrabold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {ej}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleBuscar} className="mt-4 flex gap-2">
          <input
            type="text"
            value={idCredito}
            onChange={(e) => setIdCredito(e.target.value.toUpperCase())}
            placeholder="CV-2026-XXXX"
            className="flex-1 text-xs font-mono px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={cargando}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{cargando ? '...' : 'Consultar'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {estadoCredito && (
        <div className="space-y-4">
          {/* Credit Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Crédito</span>
              <span className="font-mono font-extrabold text-cyan-400 text-sm block">
                {estadoCredito.credito.id_credito}
              </span>
              <span className="text-[11px] text-slate-300 truncate block mt-0.5">
                {estadoCredito.cliente?.nombre_completo}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capital Original</span>
              <span className="font-mono font-extrabold text-white text-sm block">
                Q {(estadoCredito.credito.capital_centavos / 100).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {estadoCredito.credito.plazo_meses} meses · {(estadoCredito.credito.tna_bps / 100).toFixed(1)}% TNA
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Actual</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm block">
                Q {fmtMoney(estadoCredito.saldoCapitalActual)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {estadoCredito.cuotasPagadas} de {estadoCredito.cuotasTotales} pagadas
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Política</span>
              <span className="font-mono font-extrabold text-purple-400 text-xs block">
                {estadoCredito.politicaAplicada}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {estadoCredito.esIncobrable ? '🚨 Incobrable' : estadoCredito.cuotasVencidas > 0 ? `⚠️ ${estadoCredito.cuotasVencidas} vencidas` : '✔ Al día'}
              </span>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tabla de Cuotas Niveladas
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                Corte: {fechaCorte}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5 text-left">Vence</th>
                    <th className="px-3 py-2.5 text-right">Saldo Inicial</th>
                    <th className="px-3 py-2.5 text-right">Cuota Nivelada</th>
                    <th className="px-3 py-2.5 text-right">Interés</th>
                    <th className="px-3 py-2.5 text-right">Capital</th>
                    <th className="px-3 py-2.5 text-right">Saldo Final</th>
                    <th className="px-3 py-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {estadoCredito.planAmortizacion && estadoCredito.planAmortizacion.map((c) => {
                    const esUltima = c.numero === estadoCredito.cuotasTotales;
                    return (
                      <tr
                        key={c.numero}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          esUltima ? 'bg-amber-950/20 font-semibold text-amber-200' : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-center text-slate-300 font-bold">
                          {c.numero}
                          {esUltima && (
                            <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">
                              ¢
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-left text-slate-400 font-sans text-[11px]">
                          {c.fechaVencimiento || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-400">
                          Q {fmtMoney(c.saldoInicial)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-cyan-300">
                          Q {fmtMoney(c.cuota)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-400">
                          Q {fmtMoney(c.interes)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400">
                          Q {fmtMoney(c.amortizacion)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">
                          Q {fmtMoney(c.saldoFinal)}
                        </td>
                        <td className="px-3 py-2 text-center font-sans">
                          {c.estado === 'pagada' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Pagada
                            </span>
                          ) : c.estado === 'vencida' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Vencida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                              <Clock className="w-2.5 h-2.5" />
                              Vigente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Centavo Rule Footer */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>
                  <strong>Regla del Centavo:</strong> El ajuste final de redondeo se absorbe en la cuota {estadoCredito.cuotasTotales} para liquidar a Q 0.00 exactos.
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-semibold">
                Amortización total = Q {(estadoCredito.credito.capital_centavos / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
