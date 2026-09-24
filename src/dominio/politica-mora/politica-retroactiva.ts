import { Dinero, Moneda } from '../dinero';
import { IPoliticaMora } from './politica-mora';
import { CalculadoraMora } from '../calculadora-mora';
import { GastoGestionCobro } from '../gasto-gestion-cobro';

export class PoliticaRetroactiva implements IPoliticaMora {
  calcularInteresMoratorio(capitalEnMora: Dinero, diasAtraso: number): Dinero {
    let tasa = 0.18;
    if (diasAtraso > 120) tasa = 0.48;
    else if (diasAtraso > 90) tasa = 0.48;
    else if (diasAtraso > 60) tasa = 0.36;
    else if (diasAtraso > 30) tasa = 0.24;

    return CalculadoraMora.calcularInteresMoratorio(capitalEnMora, tasa, diasAtraso);
  }

  getGastoCobranza(diasAtraso: number, divisa: Moneda): Dinero {
    return GastoGestionCobro.calcular(diasAtraso, divisa);
  }
}
