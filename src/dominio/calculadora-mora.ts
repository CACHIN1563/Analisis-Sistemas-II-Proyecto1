import { Dinero } from './dinero';
import Decimal from 'decimal.js';

export enum TramoMora {
  VIGENTE = 'Vigente',
  MORA_1 = 'Mora 1 (1-30 días)',
  MORA_2 = 'Mora 2 (31-60 días)',
  MORA_3 = 'Mora 3 (61-90 días)',
  VENCIDO = 'Vencido (91-120 días)',
  INCOBRABLE = 'Incobrable (>120 días)'
}

export class CalculadoraMora {
  static clasificarTramo(diasAtraso: number): TramoMora {
    if (diasAtraso <= 0) return TramoMora.VIGENTE;
    if (diasAtraso <= 30) return TramoMora.MORA_1;
    if (diasAtraso <= 60) return TramoMora.MORA_2;
    if (diasAtraso <= 90) return TramoMora.MORA_3;
    if (diasAtraso <= 120) return TramoMora.VENCIDO;
    return TramoMora.INCOBRABLE;
  }

  static calcularInteresMoratorio(
    capitalEnMora: Dinero,
    tasaAnual: number,
    diasAtraso: number,
    baseConteo: number = 360
  ): Dinero {
    if (diasAtraso <= 0) {
      return new Dinero('0', capitalEnMora.divisa);
    }

    const tasaDiaria = new Decimal(tasaAnual).dividedBy(baseConteo);
    // interes_moratorio = capital_en_mora × tasa_moratoria_diaria × dias_de_atraso
    const interesValor = new Decimal(capitalEnMora.valor)
      .times(tasaDiaria)
      .times(diasAtraso);

    return new Dinero(interesValor, capitalEnMora.divisa);
  }
}
