import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { AmortizacionFrancesa } from '../src/dominio/plan-amortizacion';
import Decimal from 'decimal.js';

describe('Plan de Amortización (Caso 6.4.1)', () => {
  it('debe reproducir exactamente la tabla de amortización y cumplir invariantes', () => {
    const estrategia = new AmortizacionFrancesa();
    const capital = new Dinero('10000');
    const tasaMensual = 0.03; // 36% anual -> 3% mensual
    const cuotas = 12;

    const plan = estrategia.generarPlan(capital, tasaMensual, cuotas);

    expect(plan.length).toBe(12);

    const tablaEsperada = [
      ['10000.00', '1004.62', '300.00', '704.62', '9295.38'],
      ['9295.38', '1004.62', '278.86', '725.76', '8569.62'],
      ['8569.62', '1004.62', '257.09', '747.53', '7822.09'],
      ['7822.09', '1004.62', '234.66', '769.96', '7052.13'],
      ['7052.13', '1004.62', '211.56', '793.06', '6259.07'],
      ['6259.07', '1004.62', '187.77', '816.85', '5442.22'],
      ['5442.22', '1004.62', '163.27', '841.35', '4600.87'],
      ['4600.87', '1004.62', '138.03', '866.59', '3734.28'],
      ['3734.28', '1004.62', '112.03', '892.59', '2841.69'],
      ['2841.69', '1004.62', '85.25', '919.37', '1922.32'],
      ['1922.32', '1004.62', '57.67', '946.95', '975.37'],
      ['975.37', '1004.63', '29.26', '975.37', '0.00']
    ];
    const tablaReal = plan.map((fila) => [
      fila.saldoInicial.valor,
      fila.cuota.valor,
      fila.interes.valor,
      fila.amortizacion.valor,
      fila.saldoFinal.valor
    ]);
    expect(tablaReal).toEqual(tablaEsperada);
    
    // Invariante: Saldo final exacto 0.00
    expect(plan[11].saldoFinal.valor).toBe('0.00');

    // Invariante: Suma de amortizaciones = Capital Desembolsado
    let sumaAmortizaciones = new Dinero('0');
    for (const fila of plan) {
      sumaAmortizaciones = sumaAmortizaciones.sumar(fila.amortizacion);
    }
    expect(sumaAmortizaciones.esIgual(capital)).toBe(true);
  });
});
