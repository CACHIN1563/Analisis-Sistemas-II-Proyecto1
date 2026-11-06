import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { CarteraReporte } from '../types';
import { fmtMoney } from '../types';
import { 
  BarChart3, 
  RefreshCw,
  Filter
} from 'lucide-react';

interface TableroGerencialProps {
  fechaCorte: string;
  onVerCredito?: (idCredito: string) => void;
  onVerMora?: (idCredito: string, cuota: number) => void;
}

export const TableroGerencial: React.FC<TableroGerencialProps> = ({
  fechaCorte,
  onVerCredito: _onVerCredito
}) => {
  const [cargando, setCargando] = useState(false);
  const [cartera, setCartera] = useState<CarteraReporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creditosMora3, setCreditosMora3] = useState<any[]>([]);
  const [mostrarSoloMora3, setMostrarSoloMora3] = useState(false);
  const [ventanaDias, setVentanaDias] = useState<7 | 30>(7);
  const [vencimientos, setVencimientos] = useState<any | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.getReporteCartera(fechaCorte);
      setCartera(data);

      const mora3Data = await api.getCreditosMora(fechaCorte, 'Mora 3 (61-90 días)');
      setCreditosMora3(mora3Data.creditos || []);

      const vencData = await api.getProximosVencimientos(fechaCorte, ventanaDias);
      setVencimientos(vencData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar métricas del tablero gerencial');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaCorte, ventanaDias]);

  return (
    <div className="space-y-5 text-slate-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Tablero Gerencial de Cartera</h2>
            <p className="text-xs text-slate-400">Indicadores de salud crediticia, riesgo PAR y vencimientos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
            Corte: {fechaCorte}
          </span>
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards (G-1) */}
      {cartera && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. Activa */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cartera Activa Total</span>
            <span className="text-xl font-black text-white font-mono mt-1 block">
              Q {fmtMoney(cartera.carteraActivaTotal)}
            </span>
            <span className="text-[10px] text-cyan-400 mt-1 block">75 créditos colocados</span>
          </div>

          {/* 2. Mora */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cartera en Mora</span>
            <span className="text-xl font-black text-amber-400 font-mono mt-1 block">
              Q {fmtMoney(cartera.carteraEnMora)}
            </span>
            <span className="text-[10px] text-amber-300 font-bold mt-1 block">
              Ratio Mora: {cartera.porcentajeMora?.toFixed(2)}%
            </span>
          </div>

          {/* 3. PAR > 30 */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cartera en Riesgo (PAR &gt; 30)</span>
            <span className="text-xl font-black text-rose-400 font-mono mt-1 block">
              Q {fmtMoney(cartera.carteraEnRiesgo)}
            </span>
            <span className="text-[10px] text-rose-300 font-bold mt-1 block">
              PAR: {cartera.porcentajeRiesgo?.toFixed(2)}%
            </span>
          </div>

          {/* 4. Incobrables */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Incobrables (&gt;120d)</span>
            <span className="text-xl font-black text-purple-400 font-mono mt-1 block">
              {cartera.incobrablesPeriodo.cantidad} créditos
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block font-mono">
              Q {fmtMoney(cartera.incobrablesPeriodo.montoTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Tramos Table + Upcoming Dues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tramos Table (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Distribución por Tramos de Mora
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Desglose de capital por días de atraso</span>
            </div>

            <button
              onClick={() => setMostrarSoloMora3(!mostrarSoloMora3)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                mostrarSoloMora3
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{mostrarSoloMora3 ? 'Ver Todos' : 'Mora 3 (G-4)'}</span>
            </button>
          </div>

          {!mostrarSoloMora3 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Tramo</th>
                    <th className="px-3 py-2.5 text-right">Saldo Capital</th>
                    <th className="px-3 py-2.5 text-right">% Cartera</th>
                    <th className="px-3 py-2.5 text-center">Nivel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cartera?.desglosePorTramo.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-left text-slate-200 font-sans font-medium flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          t.tramo.includes('Al') ? 'bg-emerald-400' :
                          t.tramo.includes('Mora 1') ? 'bg-yellow-400' :
                          t.tramo.includes('Mora 2') ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        <span>{t.tramo}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-white font-bold">
                        Q {fmtMoney(t.monto)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {t.porcentaje?.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-center font-sans">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.tramo.includes('Al') ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          t.tramo.includes('Mora 1') ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
                          'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {t.tramo.includes('Al') ? 'Normal' : t.tramo.includes('Mora 1') ? 'Alerta' : 'Riesgo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3.5 space-y-2.5">
              <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 p-2.5 rounded-xl text-xs flex justify-between items-center">
                <span>Créditos en Mora 3 (61-90 días) al corte {fechaCorte} (G-4)</span>
                <span className="font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-lg">
                  {creditosMora3.length} créditos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Crédito</th>
                      <th className="px-3 py-2 text-left font-sans">Cliente</th>
                      <th className="px-3 py-2 text-center">Atraso</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                      <th className="px-3 py-2 text-right">Exigible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {creditosMora3.map((c: any) => (
                      <tr key={c.idCredito} className="hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-bold text-cyan-400">{c.idCredito}</td>
                        <td className="px-3 py-2 font-sans text-slate-300">{c.cliente}</td>
                        <td className="px-3 py-2 text-center text-rose-400 font-bold">{c.diasAtraso}d</td>
                        <td className="px-3 py-2 text-right text-slate-300">Q {fmtMoney(c.saldoCapital)}</td>
                        <td className="px-3 py-2 text-right font-black text-amber-400">Q {fmtMoney(c.totalExigible)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Dues (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Vencimientos (G-6)
              </span>

              <div className="flex bg-slate-950 rounded-xl p-0.5 border border-slate-800">
                <button
                  onClick={() => setVentanaDias(7)}
                  className={`px-2 py-0.5 text-xs font-bold rounded-lg transition ${
                    ventanaDias === 7 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  7d
                </button>
                <button
                  onClick={() => setVentanaDias(30)}
                  className={`px-2 py-0.5 text-xs font-bold rounded-lg transition ${
                    ventanaDias === 30 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  30d
                </button>
              </div>
            </div>

            {vencimientos && (
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Cuotas en la ventana ({ventanaDias} días):</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                    {vencimientos.totalCuotas} cuotas
                  </span>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Esperado:</span>
                    <span className="font-extrabold text-emerald-400 font-mono">
                      Q {fmtMoney(vencimientos.montoTotalEsperado)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                  {vencimientos.cuotas?.slice(0, 4).map((cu: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-cyan-400 block">{cu.idCredito}</span>
                        <span className="text-[10px] text-slate-500 font-sans">{cu.fechaVencimiento}</span>
                      </div>
                      <span className="font-bold text-emerald-400">Q {fmtMoney(cu.montoCuota)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500">
            Flujo proyectado de tesorería institucional.
          </div>
        </div>
      </div>
    </div>
  );
};
