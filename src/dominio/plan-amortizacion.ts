import { Dinero } from './dinero';
import Decimal from 'decimal.js';

export interface CuotaPlan {
  numero: number;
  saldoInicial: Dinero;
  cuota: Dinero;
  interes: Dinero;
  amortizacion: Dinero;
  saldoFinal: Dinero;
}

export interface EstrategiaAmortizacion {
  generarPlan(capital: Dinero, tasaMensual: number, plazos: number): CuotaPlan[];
}

export class AmortizacionFrancesa implements EstrategiaAmortizacion {
  generarPlan(capital: Dinero, tasaMensual: number, plazos: number): CuotaPlan[] {
    const plan: CuotaPlan[] = [];
    let saldoActual = capital;
    const i = new Decimal(tasaMensual);
    const p = new Decimal(capital.valor);

    // Cálculo de cuota base
    let cuotaValorFijo = new Decimal(0);
    if (i.isZero()) {
      cuotaValorFijo = p.dividedBy(plazos);
    } else {
      const numerador = i.times(i.plus(1).pow(plazos));
      const denominador = i.plus(1).pow(plazos).minus(1);
      cuotaValorFijo = p.times(numerador.dividedBy(denominador));
    }

    const cuotaDineroBase = new Dinero(cuotaValorFijo, capital.divisa);

    for (let k = 1; k <= plazos; k++) {
      const saldoInicial = saldoActual;
      const interesValor = new Decimal(saldoInicial.valor).times(i);
      const interesDinero = new Dinero(interesValor, capital.divisa);

      let cuota = cuotaDineroBase;
      let amortizacionDinero = cuota.restar(interesDinero);

      // Regla obligatoria: Ajuste en la última cuota
      if (k === plazos) {
        amortizacionDinero = saldoInicial;
        cuota = amortizacionDinero.sumar(interesDinero);
      }

      const saldoFinal = saldoInicial.restar(amortizacionDinero);

      plan.push({
        numero: k,
        saldoInicial,
        cuota,
        interes: interesDinero,
        amortizacion: amortizacionDinero,
        saldoFinal
      });

      saldoActual = saldoFinal;
    }

    return plan;
  }
}
