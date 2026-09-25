import { Dinero, Moneda } from './dinero';

export class GastoGestionCobro {
  static calcular(diasAtraso: number, divisa: Moneda = 'GTQ'): Dinero {
    if (diasAtraso > 30) {
      return new Dinero('25.00', divisa);
    }
    return new Dinero('0.00', divisa);
  }
}
