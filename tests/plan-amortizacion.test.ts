import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { AmortizacionFrancesa } from '../src/dominio/plan-amortizacion';
import Decimal from 'decimal.js';

describe('Plan de Amortización (Caso 6.4.1)', () => {
  it('debe reproducir exactamente la tabla de amortización y cumplir invariantes', () => {
    const estrategia = new AmortizacionFrancesa();
    const capital = new Dinero(10000);
    const tasaMensual = 0.03; // 36% anual -> 3% mensual
    const cuotas = 12;

    const plan = estrategia.generarPlan(capital, tasaMensual, cuotas);

    expect(plan.length).toBe(12);

    // Fila 1
    expect(plan[0].cuota.valor).toBe('1004.62');
    expect(plan[0].interes.valor).toBe('300.00');
    expect(plan[0].amortizacion.valor).toBe('704.62');
    expect(plan[0].saldoFinal.valor).toBe('9295.38');

    // Fila 11
    expect(plan[10].saldoInicial.valor).toBe('1922.32');
    expect(plan[10].cuota.valor).toBe('1004.62');
    expect(plan[10].interes.valor).toBe('57.67');
    expect(plan[10].amortizacion.valor).toBe('946.95');
    expect(plan[10].saldoFinal.valor).toBe('975.37');

    // Fila 12 (Ajuste)
    expect(plan[11].saldoInicial.valor).toBe('975.37');
    expect(plan[11].cuota.valor).toBe('1004.63'); // El ajuste de un centavo
    expect(plan[11].interes.valor).toBe('29.26');
    expect(plan[11].amortizacion.valor).toBe('975.37');
    
    // Invariante: Saldo final exacto 0.00
    expect(plan[11].saldoFinal.valor).toBe('0.00');

    // Invariante: Suma de amortizaciones = Capital Desembolsado
    let sumaAmortizaciones = new Dinero(0);
    for (const fila of plan) {
      sumaAmortizaciones = sumaAmortizaciones.sumar(fila.amortizacion);
    }
    expect(sumaAmortizaciones.esIgual(capital)).toBe(true);
  });
});
