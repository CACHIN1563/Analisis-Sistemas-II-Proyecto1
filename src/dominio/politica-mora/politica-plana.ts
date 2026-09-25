import { Dinero, Moneda } from '../dinero';
import { IPoliticaMora } from './politica-mora';
import { CalculadoraMora } from '../calculadora-mora';

export class PoliticaPlana implements IPoliticaMora {
  private readonly tasaAnual = 0.24;

  calcularInteresMoratorio(capitalEnMora: Dinero, diasAtraso: number): Dinero {
    return CalculadoraMora.calcularInteresMoratorio(capitalEnMora, this.tasaAnual, diasAtraso);
  }

  getGastoCobranza(diasAtraso: number, divisa: Moneda): Dinero {
    return new Dinero('0.00', divisa);
  }
}
