import { Dinero, Moneda } from '../dinero';
import { IPoliticaMora } from './politica-mora';
import { CalculadoraMora } from '../calculadora-mora';
import { GastoGestionCobro } from '../gasto-gestion-cobro';
import Decimal from 'decimal.js';

export class PoliticaEscalonada implements IPoliticaMora {
  private readonly tasas = [
    { maxDias: 30, tasa: 0.18 },
    { maxDias: 60, tasa: 0.24 },
    { maxDias: 90, tasa: 0.36 },
    { maxDias: 120, tasa: 0.48 },
    { maxDias: Infinity, tasa: 0.48 }
  ];

  calcularInteresMoratorio(capitalEnMora: Dinero, diasAtraso: number): Dinero {
    if (diasAtraso <= 0) return new Dinero('0', capitalEnMora.divisa);

    let diasRestantes = diasAtraso;
    let diasAcumulados = 0;
    let sumaTasasPorDias = 0;

    for (const tramo of this.tasas) {
      if (diasRestantes <= 0) break;
      const diasEnTramo = Math.min(diasRestantes, tramo.maxDias - diasAcumulados);

      sumaTasasPorDias += tramo.tasa * diasEnTramo;

      diasRestantes -= diasEnTramo;
      diasAcumulados += diasEnTramo;
    }

    const tasaEfectiva = sumaTasasPorDias / diasAtraso;
    return CalculadoraMora.calcularInteresMoratorio(capitalEnMora, tasaEfectiva, diasAtraso);
  }

  getGastoCobranza(diasAtraso: number, divisa: Moneda): Dinero {
    return GastoGestionCobro.calcular(diasAtraso, divisa);
  }
}
