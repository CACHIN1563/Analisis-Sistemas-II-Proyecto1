import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { EstadoCredito } from '../types';
import { fmtMoney } from '../types';
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck
} from 'lucide-react';

interface RegistroPagoProps {
  initialCreditoId?: string;
  fechaCorte: string;
  onPagoCompletado?: (resultado: any) => void;
}

export const RegistroPago: React.FC<RegistroPagoProps> = ({
  initialCreditoId,
  fechaCorte,
  onPagoCompletado
}) => {
  const [idCredito, setIdCredito] = useState(initialCreditoId || 'CV-2026-0043');
  const [cargandoCredito, setCargandoCredito] = useState(false);
  const [creditoData, setCreditoData] = useState<EstadoCredito | null>(null);

  // Formulario de pago
  const [numeroCuota, setNumeroCuota] = useState<number>(1);
  const [fechaPago, setFechaPago] = useState<string>(fechaCorte || '2026-10-31');
  const [montoIngresado, setMontoIngresado] = useState<string>('561.87');
  const [claveIdempotencia, setClaveIdempotencia] = useState<string>(`IDEM-UI-${Date.now()}`);

  // Confirmación Humana (Human-in-the-loop)
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);

  // Estado del proceso
  const [procesando, setProcesando] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState<any | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const cargarCredito = async (id: string) => {
    if (!id.trim()) return;
    setCargandoCredito(true);
    setErrorValidacion(null);
    setPagoExitoso(null);
    try {
      const data = await api.obtenerEstadoCredito(id.trim().toUpperCase(), fechaCorte);
      setCreditoData(data);
      if (data.proximaCuota) {
        setNumeroCuota(data.proximaCuota.numero);
        setMontoIngresado(fmtMoney(data.proximaCuota.totalExigible));
      }
    } catch (err: any) {
      setErrorValidacion(err.message || 'Error al cargar crédito');
      setCreditoData(null);
    } finally {
      setCargandoCredito(false);
    }
  };

  useEffect(() => {
    if (initialCreditoId) setIdCredito(initialCreditoId);
    cargarCredito(initialCreditoId || 'CV-2026-0043');
  }, [initialCreditoId, fechaCorte]);

  const [ultimaClaveIdempotencia, setUltimaClaveIdempotencia] = useState<string>('IDEM-OP1-CANONICO');

  const cargarCasoOP1 = () => {
    const key = `IDEM-OP1-${Date.now()}`;
    setIdCredito('CV-2026-0043');
    setNumeroCuota(1);
    setFechaPago('2026-10-31');
    setMontoIngresado('561.87');
    setClaveIdempotencia(key);
    setUltimaClaveIdempotencia(key);
    cargarCredito('CV-2026-0043');
  };

  const cargarCasoOP2 = () => {
    setIdCredito('CV-2026-0035');
    setNumeroCuota(2);
    setFechaPago('2026-10-31');
    setClaveIdempotencia(`IDEM-OP2-${Date.now()}`);
    cargarCredito('CV-2026-0035');
  };

  const cargarCasoOP4 = () => {
    // Reintentar OP-1 con la misma clave de idempotencia
    setIdCredito('CV-2026-0043');
    setNumeroCuota(1);
    setFechaPago('2026-10-31');
    setMontoIngresado('561.87');
    setClaveIdempotencia(ultimaClaveIdempotencia);
    cargarCredito('CV-2026-0043');
  };

  const cargarCasoOP5 = () => {
    setIdCredito('CV-2026-0061');
    setNumeroCuota(1);
    setFechaPago('2026-10-31');
    setMontoIngresado('500.00'); // Inexacto: exigible es 370.85
    setClaveIdempotencia(`IDEM-OP5-${Date.now()}`);
    cargarCredito('CV-2026-0061');
  };

  const cargarCasoOP6 = () => {
    setIdCredito('CV-2026-0015');
    setNumeroCuota(3);
    setFechaPago('2026-10-31');
    setClaveIdempotencia(`IDEM-OP6-${Date.now()}`);
    cargarCredito('CV-2026-0015');
  };

  const handleIniciarPago = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!creditoData) {
      setErrorValidacion('Debe seleccionar un crédito válido.');
      return;
    }

    if (creditoData.esIncobrable) {
      setErrorValidacion('RECHAZADO (OP-6): Este crédito ha sido declarado INCOBRABLE (>120 días de atraso). Está bloqueado para pagos por ventanilla ordinaria.');
      return;
    }

    if (creditoData.proximaCuota) {
      const exigible = Number(fmtMoney(creditoData.proximaCuota.totalExigible));
      const ingresado = Number(montoIngresado);
      if (Math.abs(exigible - ingresado) > 0.001) {
        setErrorValidacion(`RECHAZADO (OP-5): El monto ingresado (Q ${ingresado.toFixed(2)}) no coincide exactamente con el total exigible de la cuota (Q ${exigible.toFixed(2)}). Crédito Vecino requiere pago exacto de la cuota.`);
        return;
      }
    }

    setMostrarModalConfirmacion(true);
  };

  const handleConfirmarAprobacionHumana = async () => {
    setMostrarModalConfirmacion(false);
    setProcesando(true);
    setErrorValidacion(null);

    try {
      const res = await api.registrarPago({
        idCredito: idCredito.trim().toUpperCase(),
        numeroCuota,
        fechaPago,
        monto: Number(montoIngresado),
        claveIdempotencia,
        aprobacionHumana: true
      });

      setPagoExitoso(res);
      if (onPagoCompletado) onPagoCompletado(res);
      await cargarCredito(idCredito);
    } catch (err: any) {
      setErrorValidacion(err.message || 'Error al procesar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Registro de Pago y Cobranza</h2>
              <p className="text-xs text-slate-400">Prelación legal, control de monto exacto y aprobación humana</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={cargarCasoOP1}
              className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 rounded-lg text-[10px] font-bold transition shadow"
            >
              OP-1: CV-2026-0043
            </button>
            <button
              onClick={cargarCasoOP2}
              className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/40 rounded-lg text-[10px] font-bold transition shadow"
            >
              OP-2: CV-2026-0035
            </button>
            <button
              onClick={cargarCasoOP4}
              className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/40 rounded-lg text-[10px] font-bold transition shadow"
            >
              OP-4: Reintentar Idempotencia
            </button>
            <button
              onClick={cargarCasoOP5}
              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/40 rounded-lg text-[10px] font-bold transition shadow"
            >
              OP-5: Monto Inexacto (Q500)
            </button>
            <button
              onClick={cargarCasoOP6}
              className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-600/40 rounded-lg text-[10px] font-bold transition shadow"
            >
              OP-6: Incobrable (CV-2026-0015)
            </button>
          </div>
        </div>
      </div>

      {errorValidacion && (
        <div className="bg-rose-950/70 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-white">Regla de Negocio / Rechazo</h4>
            <p className="text-xs mt-0.5">{errorValidacion}</p>
          </div>
        </div>
      )}

      {pagoExitoso && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 px-5 py-4 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-sm text-white">¡Pago Aplicado con Éxito!</h4>
          </div>
          <p className="text-xs text-emerald-300">
            Se asentó el recibo con estricto orden de prelación.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20 text-xs font-mono">
            <div><span className="text-slate-400 block text-[10px]">Recibo:</span><span className="font-bold text-white">{pagoExitoso.id_pago}</span></div>
            <div><span className="text-slate-400 block text-[10px]">Crédito:</span><span className="text-cyan-400 font-bold">{pagoExitoso.id_credito} (c#{pagoExitoso.numero_cuota})</span></div>
            <div><span className="text-slate-400 block text-[10px]">Monto:</span><span className="text-emerald-400 font-bold">Q {Number(pagoExitoso.monto).toFixed(2)}</span></div>
            <div><span className="text-slate-400 block text-[10px]">Idempotencia:</span><span className="text-slate-400 truncate block text-[10px]">{pagoExitoso.clave_idempotencia}</span></div>
          </div>
        </div>
      )}

      {/* Main Grid: Form + Prelación */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
            Datos del Asiento Contable
          </h3>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">ID Crédito</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={idCredito}
                onChange={(e) => setIdCredito(e.target.value.toUpperCase())}
                className="flex-1 text-xs font-mono uppercase px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => cargarCredito(idCredito)}
                disabled={cargandoCredito}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                {cargandoCredito ? '...' : 'Cargar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Cuota #</label>
              <input
                type="number"
                min="1"
                value={numeroCuota}
                onChange={(e) => setNumeroCuota(Number(e.target.value))}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Fecha Asiento</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Monto a Liquidar (Q)</label>
            <input
              type="number"
              step="0.01"
              value={montoIngresado}
              onChange={(e) => setMontoIngresado(e.target.value)}
              className="w-full text-sm font-mono font-black px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Clave de Idempotencia</label>
            <input
              type="text"
              value={claveIdempotencia}
              onChange={(e) => setClaveIdempotencia(e.target.value)}
              className="w-full text-[10px] font-mono px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleIniciarPago}
            disabled={procesando || cargandoCredito}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Solicitar Aprobación de Pago</span>
          </button>
        </div>

        {/* Obligation Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Orden Legal de Prelación (Art. 1453)
              </span>
              {creditoData?.esIncobrable && (
                <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-800">
                  INCOBRABLE
                </span>
              )}
            </div>

            {creditoData?.proximaCuota ? (
              <div className="mt-3 space-y-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Exigible al Corte</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      Q {fmtMoney(creditoData.proximaCuota.totalExigible)}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>Cuota #{creditoData.proximaCuota.numero}</div>
                    <div className="text-cyan-400">{creditoData.proximaCuota.fechaVencimiento}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex justify-between items-center">
                    <span className="text-slate-300">1. Gastos de Cobranza</span>
                    <span className="font-mono font-bold text-slate-400">Q {fmtMoney(creditoData.proximaCuota.gastos)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex justify-between items-center">
                    <span className="text-slate-300">2. Interés Moratorio</span>
                    <span className="font-mono font-bold text-amber-400">Q {fmtMoney(creditoData.proximaCuota.interesMoratorio)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex justify-between items-center">
                    <span className="text-slate-300">3. Interés Corriente</span>
                    <span className="font-mono font-bold text-cyan-400">Q {fmtMoney(creditoData.proximaCuota.interesCorriente)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex justify-between items-center">
                    <span className="text-slate-300">4. Amortización a Capital</span>
                    <span className="font-mono font-bold text-emerald-400">Q {fmtMoney(creditoData.proximaCuota.capital)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Cargue un crédito para ver el desglose legal
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500">
            Prohibición legal de anatocismo: los intereses moratorios no generan intereses.
          </div>
        </div>
      </div>

      {/* Human Approval Modal */}
      {mostrarModalConfirmacion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Aprobación Humana Requerida</h3>
                <p className="text-xs text-slate-400">Confirmación obligatoria para asentar pago</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span className="text-slate-500">Crédito:</span><span className="text-white font-bold">{idCredito}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cuota:</span><span className="text-white">#{numeroCuota}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Fecha:</span><span className="text-cyan-400">{fechaPago}</span></div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5"><span className="text-slate-300 font-bold">Monto Exacto:</span><span className="text-emerald-400 font-black text-sm">Q {montoIngresado}</span></div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmacion(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAprobacionHumana}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow"
              >
                Confirmar y Asentar Pago (OP-1)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
