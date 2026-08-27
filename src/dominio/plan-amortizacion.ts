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

export class PlanAmortizacionBuilder {
  private capital?: Dinero;
  private tasaMensual?: number;
  private plazos?: number;
  private estrategia?: EstrategiaAmortizacion;

  setCapital(capital: Dinero): this {
    this.capital = capital;
    return this;
  }

  setTasaMensual(tasaMensual: number): this {
    this.tasaMensual = tasaMensual;
    return this;
  }

  setPlazos(plazos: number): this {
    this.plazos = plazos;
    return this;
  }

  setEstrategia(estrategia: EstrategiaAmortizacion): this {
    this.estrategia = estrategia;
    return this;
  }

  build(): CuotaPlan[] {
    if (!this.capital) {
      throw new Error('El capital es obligatorio');
    }
    if (this.capital.esIgual(new Dinero('0', this.capital.divisa)) || this.capital.esMenorQue(new Dinero('0', this.capital.divisa))) {
      throw new Error('El capital debe ser mayor que cero');
    }
    if (this.tasaMensual === undefined) {
      throw new Error('La tasa mensual es obligatoria');
    }
    if (!Number.isFinite(this.tasaMensual) || this.tasaMensual < 0) {
      throw new Error('La tasa mensual no puede ser negativa');
    }
    if (this.plazos === undefined) {
      throw new Error('La cantidad de cuotas es obligatoria');
    }
    if (!Number.isInteger(this.plazos) || this.plazos <= 0) {
      throw new Error('La cantidad de cuotas debe ser un entero mayor que cero');
    }
    if (!this.estrategia) {
      throw new Error('La estrategia de amortización es obligatoria');
    }

    return this.estrategia.generarPlan(this.capital, this.tasaMensual, this.plazos);
  }
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
