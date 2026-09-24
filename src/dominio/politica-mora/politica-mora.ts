import { Dinero, Moneda } from '../dinero';

export interface IPoliticaMora {
  calcularInteresMoratorio(capitalEnMora: Dinero, diasAtraso: number): Dinero;
  getGastoCobranza(diasAtraso: number, divisa: Moneda): Dinero;
}
