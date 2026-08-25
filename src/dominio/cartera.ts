import { Dinero } from './dinero';
import Decimal from 'decimal.js';

export interface CreditoCartera {
  id: string;
  saldoCapital: Dinero;
  diasAtrasoMaximaCuota: number;
  reestructurado: boolean;
  incobrable: boolean; // > 120 días que ya salió de la cartera
}

export interface ReporteCartera {
  carteraActivaTotal: Dinero;
  carteraEnRiesgo: Dinero;
  porcentajeRiesgo: number;
}

export class Cartera {
  static calcularIndicadores(creditos: CreditoCartera[], divisa: 'GTQ' | 'USD' = 'GTQ'): ReporteCartera {
    let activaTotal = new Dinero('0', divisa);
    let enRiesgoTotal = new Dinero('0', divisa);

    for (const credito of creditos) {
      if (credito.incobrable) {
        // Los incobrables ya salieron de la cartera activa
        continue;
      }

      activaTotal = activaTotal.sumar(credito.saldoCapital);

      // Regla de riesgo: > 30 días de atraso o reestructurado
      if (credito.diasAtrasoMaximaCuota > 30 || credito.reestructurado) {
        enRiesgoTotal = enRiesgoTotal.sumar(credito.saldoCapital);
      }
    }

    let porcentajeRiesgo = 0;
    const activaDecimal = new Decimal(activaTotal.valor);
    if (!activaDecimal.isZero()) {
      porcentajeRiesgo = new Decimal(enRiesgoTotal.valor).dividedBy(activaDecimal).times(100).toNumber();
      // Redondeamos el porcentaje a 2 decimales según la regla general
      porcentajeRiesgo = Number(porcentajeRiesgo.toFixed(2));
    }

    return {
      carteraActivaTotal: activaTotal,
      carteraEnRiesgo: enRiesgoTotal,
      porcentajeRiesgo
    };
  }
}
