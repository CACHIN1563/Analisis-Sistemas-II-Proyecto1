import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { EstadoCredito } from '../types';
import { fmtMoney } from '../types';
import { 
  Search, 
  User, 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert
} from 'lucide-react';

interface DetalleCreditoProps {
  initialCreditoId?: string;
  fechaCorte: string;
  onVerMora?: (idCredito: string, numeroCuota: number) => void;
  onRegistrarPago?: (idCredito: string) => void;
}

export const DetalleCredito: React.FC<DetalleCreditoProps> = ({
  initialCreditoId,
  fechaCorte,
  onVerMora,
  onRegistrarPago
}) => {
  const [idCredito, setIdCredito] = useState(initialCreditoId || 'CV-2026-0043');
  const [cargando, setCargando] = useState(false);
  const [creditoData, setCreditoData] = useState<EstadoCredito | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarCredito = async (id: string) => {
    if (!id.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const data = await api.obtenerEstadoCredito(id.trim().toUpperCase(), fechaCorte);
      setCreditoData(data);
    } catch (err: any) {
      setError(err.message || `No se pudo encontrar el crédito ${id}`);
      setCreditoData(null);
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
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Estado de Crédito y Deuda</h2>
              <p className="text-xs text-slate-400">Consulta de saldos, cuotas vigentes y obligaciones exigibles</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['CV-2026-0043', 'CV-2026-0035', 'CV-2026-0061', 'CV-2026-0015'].map((ej) => (
              <button
                key={ej}
                onClick={() => { setIdCredito(ej); cargarCredito(ej); }}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                  idCredito === ej
                    ? 'bg-emerald-500 text-slate-950 font-extrabold'
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
            className="flex-1 text-xs font-mono px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={cargando}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{cargando ? '...' : 'Buscar'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {creditoData && (
        <div className="space-y-4">
          {/* Main Status Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">ID Crédito</span>
                <span className="text-xl font-black text-white font-mono">
                  {creditoData.credito.id_credito}
                </span>
              </div>

              {/* Status Badge */}
              <div>
                {creditoData.esIncobrable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    INCOBRABLE (&gt;120 días)
                  </span>
                ) : creditoData.estaCancelado ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    CANCELADO
                  </span>
                ) : creditoData.cuotasVencidas > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {creditoData.tramoMaximo} ({creditoData.diasAtrasoMaximo} días atraso)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    AL DÍA
                  </span>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
              {/* Cliente */}
              <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                <span className="font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5 text-[11px]">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Titular de la Cuenta
                </span>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nombre:</span>
                  <span className="font-semibold text-white text-xs block">
                    {creditoData.cliente?.nombre_completo || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DPI:</span>
                  <span className="font-mono text-slate-300">
                    {creditoData.cliente?.dpi}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Municipio:</span>
                  <span className="text-slate-300">
                    {creditoData.cliente?.municipio}
                  </span>
                </div>
              </div>

              {/* Condiciones */}
              <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                <span className="font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5 text-[11px]">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  Condiciones Financieras
                </span>
                <div>
                  <span className="text-slate-400 block text-[10px]">Capital Desembolsado:</span>
                  <span className="font-bold text-white font-mono text-xs block">
                    Q {(creditoData.credito.capital_centavos / 100).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Plazo y Tasa:</span>
                  <span className="font-semibold text-slate-300">
                    {creditoData.credito.plazo_meses} meses · {(creditoData.credito.tna_bps / 100).toFixed(1)}% TNA
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Desembolso / Asesor:</span>
                  <span className="text-slate-300 font-mono">
                    {creditoData.credito.fecha ? String(creditoData.credito.fecha).substring(0, 10) : '-'} · {creditoData.credito.id_asesor}
                  </span>
                </div>
              </div>

              {/* Saldos */}
              <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                <span className="font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Saldos al Corte ({fechaCorte})
                </span>
                <div>
                  <span className="text-slate-400 block text-[10px]">Saldo Capital Pendiente:</span>
                  <span className="font-black text-emerald-400 font-mono text-sm block">
                    Q {fmtMoney(creditoData.saldoCapitalActual)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Progreso de Cuotas:</span>
                  <span className="font-semibold text-slate-300">
                    {creditoData.cuotasPagadas} pagadas de {creditoData.cuotasTotales} ({creditoData.cuotasVencidas} vencidas)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Política:</span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {creditoData.politicaAplicada}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Próxima Cuota / Exigible Card */}
          {creditoData.proximaCuota && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold text-[10px] rounded-lg">
                      Cuota #{creditoData.proximaCuota.numero}
                    </span>
                    <span className="text-xs text-slate-400">
                      Vence: {creditoData.proximaCuota.fechaVencimiento}
                    </span>
                    {creditoData.proximaCuota.diasAtraso > 0 && (
                      <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full font-bold">
                        {creditoData.proximaCuota.diasAtraso} días de atraso
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">Obligación Exigible Inmediata</h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Exigible al Corte</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    Q {fmtMoney(creditoData.proximaCuota.totalExigible)}
                  </span>
                </div>
              </div>

              {/* Prelación Desglose */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">1. Gastos Cobranza:</span>
                  <span className="font-mono font-bold text-slate-200">
                    Q {fmtMoney(creditoData.proximaCuota.gastos)}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">2. Interés Moratorio:</span>
                  <span className="font-mono font-bold text-amber-400">
                    Q {fmtMoney(creditoData.proximaCuota.interesMoratorio)}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">3. Interés Corriente:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    Q {fmtMoney(creditoData.proximaCuota.interesCorriente)}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">4. Amortización Capital:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    Q {fmtMoney(creditoData.proximaCuota.capital)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-800/80">
                {creditoData.proximaCuota.diasAtraso > 0 && onVerMora && (
                  <button
                    onClick={() => onVerMora(creditoData.credito.id_credito, creditoData.proximaCuota!.numero)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/20 transition"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Ver Desglose de Mora</span>
                  </button>
                )}

                {onRegistrarPago && !creditoData.esIncobrable && !creditoData.estaCancelado && (
                  <button
                    onClick={() => onRegistrarPago(creditoData.credito.id_credito)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Registrar Pago en Ventanilla</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
