import Decimal from 'decimal.js';

export type Moneda = 'GTQ' | 'USD';

export class Dinero {
  private readonly importe: Decimal;
  private readonly moneda: Moneda;

  constructor(importe: string | Decimal, moneda: Moneda = 'GTQ') {
    // Solo permitimos string o Decimal para evitar pérdida de precisión de punto flotante
    // nativo de JavaScript ANTES de que llegue a decimal.js
    this.importe = new Decimal(importe).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    this.moneda = moneda;
  }

  get valor(): string {
    return this.importe.toFixed(2);
  }

  get divisa(): Moneda {
    return this.moneda;
  }

  private validarMismaMoneda(otro: Dinero) {
    if (this.moneda !== otro.moneda) {
      throw new Error(`Incompatibilidad de monedas: no se puede operar ${this.moneda} con ${otro.moneda}`);
    }
  }

  sumar(otro: Dinero): Dinero {
    this.validarMismaMoneda(otro);
    return new Dinero(this.importe.plus(otro.importe), this.moneda);
  }

  restar(otro: Dinero): Dinero {
    this.validarMismaMoneda(otro);
    return new Dinero(this.importe.minus(otro.importe), this.moneda);
  }

  multiplicar(factor: string | Decimal): Dinero {
    return new Dinero(this.importe.times(factor), this.moneda);
  }

  dividir(divisor: string | Decimal): Dinero {
    if (new Decimal(divisor).isZero()) {
      throw new Error('No se puede dividir por cero');
    }
    return new Dinero(this.importe.dividedBy(divisor), this.moneda);
  }

  esIgual(otro: Dinero): boolean {
    this.validarMismaMoneda(otro);
    return this.importe.equals(otro.importe);
  }

  esMayorQue(otro: Dinero): boolean {
    this.validarMismaMoneda(otro);
    return this.importe.greaterThan(otro.importe);
  }

  esMenorQue(otro: Dinero): boolean {
    this.validarMismaMoneda(otro);
    return this.importe.lessThan(otro.importe);
  }
}
