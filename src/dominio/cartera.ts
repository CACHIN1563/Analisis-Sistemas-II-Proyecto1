import { Dinero, Moneda } from './dinero';
import Decimal from 'decimal.js';
import { ClasificacionTramo } from './clasificacion-tramo';
import { TramoMora } from './calculadora-mora';

export interface CreditoCartera {
  id: string;
  saldoCapital: Dinero;
  diasAtrasoMaximaCuota: number;
  reestructurado: boolean;
  incobrable: boolean; 
}

export interface DesgloseTramo {
  tramo: TramoMora;
  monto: Dinero;
  porcentaje: number;
}

export interface ReporteCartera {
  carteraActivaTotal: Dinero;
  carteraEnRiesgo: Dinero;
  porcentajeRiesgo: number;
  desglosePorTramo: DesgloseTramo[];
}

export class Cartera {
  static calcularIndicadores(creditos: CreditoCartera[], divisa: Moneda = 'GTQ'): ReporteCartera {
    let activaTotal = new Dinero('0', divisa);
    let enRiesgoTotal = new Dinero('0', divisa);
    
    const montosPorTramo = new Map<TramoMora, Dinero>();
    Object.values(TramoMora).forEach(t => montosPorTramo.set(t, new Dinero('0', divisa)));

    for (const credito of creditos) {
      if (credito.incobrable) continue;

      activaTotal = activaTotal.sumar(credito.saldoCapital);

      const tramo = ClasificacionTramo.clasificar(credito.diasAtrasoMaximaCuota);
      const montoActual = montosPorTramo.get(tramo) || new Dinero('0', divisa);
      montosPorTramo.set(tramo, montoActual.sumar(credito.saldoCapital));

      if (credito.diasAtrasoMaximaCuota > 30 || credito.reestructurado) {
        enRiesgoTotal = enRiesgoTotal.sumar(credito.saldoCapital);
      }
    }

    let porcentajeRiesgo = 0;
    const activaDecimal = new Decimal(activaTotal.valor);
    const desglosePorTramo: DesgloseTramo[] = [];

    if (!activaDecimal.isZero()) {
      porcentajeRiesgo = new Decimal(enRiesgoTotal.valor).dividedBy(activaDecimal).times(100).toNumber();
      porcentajeRiesgo = Number(porcentajeRiesgo.toFixed(2));

      for (const [tramo, monto] of montosPorTramo.entries()) {
        const porc = new Decimal(monto.valor).dividedBy(activaDecimal).times(100).toNumber();
        desglosePorTramo.push({
          tramo,
          monto,
          porcentaje: Number(porc.toFixed(2))
        });
      }
    } else {
      for (const [tramo, monto] of montosPorTramo.entries()) {
        desglosePorTramo.push({ tramo, monto, porcentaje: 0 });
      }
    }

    return {
      carteraActivaTotal: activaTotal,
      carteraEnRiesgo: enRiesgoTotal,
      porcentajeRiesgo,
      desglosePorTramo
    };
  }
}
