import React, { useState } from 'react';
import { api } from '../api/client';
import type { CuotaPlan } from '../types';
import { fmtMoney } from '../types';
import { FileText, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface SolicitudCreditoProps {
  fechaCorte: string;
  onCreditoCreado?: (idCredito: string) => void;
  onVerPlan?: (cuotas: CuotaPlan[], monto: number, plazo: number, tna: number) => void;
}

export const SolicitudCredito: React.FC<SolicitudCreditoProps> = ({
  fechaCorte,
  onCreditoCreado,
  onVerPlan
}) => {
  const [idCliente, setIdCliente] = useState('CL-9001');
  const [nombreCompleto, setNombreCompleto] = useState('Gerencia Demostración Gálvez');
  const [dpi, setDpi] = useState('DPI-FICT-009001');
  const [telefono, setTelefono] = useState('5555-9001');
  const [municipio, setMunicipio] = useState('Guatemala');
  const [idCredito, setIdCredito] = useState('CV-2026-9001');
  const [idAsesor, setIdAsesor] = useState('AS-01');

  const [montoCapital, setMontoCapital] = useState<number>(10000);
  const [plazoMeses, setPlazoMeses] = useState<number>(12);
  const [tnaPorcentaje, setTnaPorcentaje] = useState<number>(36); // 36% TNA
  const [fechaDesembolso, setFechaDesembolso] = useState<string>(fechaCorte || '2026-10-31');

  const [cargandoSimulacion, setCargandoSimulacion] = useState(false);
  const [planSimulado, setPlanSimulado] = useState<CuotaPlan[] | null>(null);
  const [cuotaNiveladaEstimada, setCuotaNiveladaEstimada] = useState<string | null>(null);

  const [desembolsando, setDesembolsando] = useState(false);
  const [desembolsoExitoso, setDesembolsoExitoso] = useState<any | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const cargarCasoOP3 = () => {
    setIdCliente('CL-9001');
    setNombreCompleto('Gerencia Demostración Gálvez');
    setDpi('DPI-FICT-009001');
    setTelefono('5555-9001');
    setMunicipio('Guatemala');
    setIdCredito('CV-2026-9001');
    setIdAsesor('AS-01');
    setMontoCapital(10000);
    setPlazoMeses(12);
    setTnaPorcentaje(36);
    setFechaDesembolso('2026-10-31');
    setPlanSimulado(null);
    setDesembolsoExitoso(null);
    setMensajeError(null);
  };

  const handleSimular = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setCargandoSimulacion(true);
    try {
      const tnaBps = Math.round(tnaPorcentaje * 100);
      const res = await api.simularPlan(montoCapital, plazoMeses, tnaBps, fechaDesembolso);
      setPlanSimulado(res.plan);
      if (res.plan && res.plan.length > 0) {
        setCuotaNiveladaEstimada(fmtMoney(res.plan[0].cuota));
      }
      if (onVerPlan) {
        onVerPlan(res.plan, montoCapital, plazoMeses, tnaPorcentaje);
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error al simular plan de amortización');
    } finally {
      setCargandoSimulacion(false);
    }
  };

  const handleDesembolsar = async () => {
    setMensajeError(null);
    setDesembolsando(true);
    try {
      const tnaBps = Math.round(tnaPorcentaje * 100);
      const res = await api.desembolsarCredito({
        cliente: {
          id_cliente: idCliente,
          nombre_completo: nombreCompleto,
          dpi,
          telefono,
          municipio
        },
        credito: {
          id_credito: idCredito,
          id_cliente: idCliente,
          id_asesor: idAsesor,
          fecha: fechaDesembolso,
          capital: montoCapital,
          plazo_meses: plazoMeses,
          tna_bps: tnaBps
        }
      });
      setDesembolsoExitoso(res);
      if (onCreditoCreado && res.id_credito) {
        onCreditoCreado(res.id_credito);
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error al desembolsar crédito');
    } finally {
      setDesembolsando(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Originación y Desembolso</h2>
            <p className="text-xs text-slate-400">Simulación francesa y formalización de microcréditos</p>
          </div>
        </div>

        <button
          type="button"
          onClick={cargarCasoOP3}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition shadow"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Caso OP-3: Gerencia Demostración Gálvez (Q10,000 / 12 cuotas / 36% TNA)</span>
        </button>
      </div>

      {mensajeError && (
        <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {desembolsoExitoso && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 p-5 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">¡Desembolso Exitoso! Crédito Generado (OP-4)</h4>
                <p className="text-xs text-emerald-300">Formalizado en la cartera canónica inmutable.</p>
              </div>
            </div>

            <button
              onClick={() => onCreditoCreado && onCreditoCreado(desembolsoExitoso.credito?.id_credito)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow"
            >
              <span>Ver Detalle</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20 text-xs font-mono">
            <div><span className="text-slate-400 block text-[10px]">ID Crédito:</span><span className="font-extrabold text-cyan-300">{desembolsoExitoso.credito?.id_credito}</span></div>
            <div><span className="text-slate-400 block text-[10px]">Titular:</span><span className="text-white font-bold">{desembolsoExitoso.cliente?.nombre_completo}</span></div>
            <div><span className="text-slate-400 block text-[10px]">Monto:</span><span className="text-emerald-400 font-bold">Q {Number(desembolsoExitoso.credito?.capital).toFixed(2)}</span></div>
            <div><span className="text-slate-400 block text-[10px]">Estado:</span><span className="text-cyan-400 font-bold">{desembolsoExitoso.credito?.estado || 'VIGENTE'}</span></div>
          </div>
        </div>
      )}

      {/* Main Grid: Inputs + Amortization Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <form onSubmit={handleSimular} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-800">
              Datos del Cliente
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">ID Cliente</label>
                <input
                  type="text"
                  value={idCliente}
                  onChange={(e) => setIdCliente(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">DPI</label>
                <input
                  type="text"
                  value={dpi}
                  onChange={(e) => setDpi(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Municipio</label>
                <input
                  type="text"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-2 pb-1.5 border-b border-slate-800">
              Condiciones del Microcrédito
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Monto (Q)</label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={montoCapital}
                  onChange={(e) => setMontoCapital(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Plazo (meses)</label>
                <select
                  value={plazoMeses}
                  onChange={(e) => setPlazoMeses(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses (Estándar)</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Tasa TNA (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tnaPorcentaje}
                  onChange={(e) => setTnaPorcentaje(Number(e.target.value))}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Asesor Asignado</label>
                <input
                  type="text"
                  value={idAsesor}
                  onChange={(e) => setIdAsesor(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Fecha Desembolso</label>
              <input
                type="date"
                value={fechaDesembolso}
                onChange={(e) => setFechaDesembolso(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={cargandoSimulacion}
              className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs py-2.5 px-4 rounded-xl border border-cyan-500/30 transition shadow mt-2"
            >
              {cargandoSimulacion ? 'Calculando...' : '1. Simular Plan (Cuota Nivelada)'}
            </button>
          </form>
        </div>

        {/* Right: Simulation Preview (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Simulación del Cronograma
              </span>
              {cuotaNiveladaEstimada && (
                <span className="text-xs font-mono font-black text-cyan-400">
                  Cuota: Q {cuotaNiveladaEstimada} / mes
                </span>
              )}
            </div>

            {planSimulado ? (
              <div className="mt-3">
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-800 text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0">
                      <tr>
                        <th className="px-2.5 py-2 text-center">#</th>
                        <th className="px-2.5 py-2 text-right">Saldo Inicial</th>
                        <th className="px-2.5 py-2 text-right">Cuota</th>
                        <th className="px-2.5 py-2 text-right">Interés</th>
                        <th className="px-2.5 py-2 text-right">Capital</th>
                        <th className="px-2.5 py-2 text-right">Saldo Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {planSimulado.map((c) => (
                        <tr key={c.numero} className="hover:bg-slate-800/40">
                          <td className="px-2.5 py-1.5 text-center font-bold text-slate-300">{c.numero}</td>
                          <td className="px-2.5 py-1.5 text-right text-slate-400">Q {fmtMoney(c.saldoInicial)}</td>
                          <td className="px-2.5 py-1.5 text-right font-bold text-cyan-400">Q {fmtMoney(c.cuota)}</td>
                          <td className="px-2.5 py-1.5 text-right text-amber-400">Q {fmtMoney(c.interes)}</td>
                          <td className="px-2.5 py-1.5 text-right text-emerald-400">Q {fmtMoney(c.amortizacion)}</td>
                          <td className="px-2.5 py-1.5 text-right text-slate-400">Q {fmtMoney(c.saldoFinal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <p>✔ Ajuste de centavo aplicado en la cuota {plazoMeses} para liquidar saldo a Q 0.00.</p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                Complete el formulario y pulse "Simular Plan" para ver las cuotas calculadas en tiempo real.
              </div>
            )}
          </div>

          {planSimulado && (
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleDesembolsar}
                disabled={desembolsando}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-6 rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{desembolsando ? 'Formalizando...' : '2. Confirmar Desembolso (OP-4)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
