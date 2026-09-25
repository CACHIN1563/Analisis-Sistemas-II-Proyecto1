import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { Cartera, CreditoCartera } from '../src/dominio/cartera';
import { TramoMora } from '../src/dominio/calculadora-mora';

describe('Desglose de Cartera por Tramo (CP-04.3)', () => {
  it('Debe reproducir el oráculo: 3.00% + 2.25% + 1.00% + 0.75% = 7.00%', () => {
    // Para que el cálculo de exactamente 7% y los desgloses coincidan, 
    // inventamos una cartera base de 1,000,000 GTQ
    // Tramo Vigente = 93% (930,000)
    // Tramo 1 (1-30 días) NO ENTRA en riesgo. 
    // Ah, la regla de "Cartera en Riesgo" es > 30 días o reestructurado.
    // Entonces "en riesgo" = Tramo 2, Tramo 3, Vencido.
    // Wait, let's see what tramos have what %.
    // If the requirement says "desglose de cartera en riesgo por tramo",
    // 3.00% = Tramo 2?
    // 2.25% = Tramo 3?
    // 1.00% = Vencido?
    // 0.75% = Reestructurados vigentes?
    // Let's create a portfolio that adds up exactly to these percentages.
    
    const activaTotal = 10000;
    
    const creditos: CreditoCartera[] = [
      // 93.00% fuera de riesgo (Vigente o Tramo 1, no reestructurado)
      { id: '1', saldoCapital: new Dinero('9300.00'), diasAtrasoMaximaCuota: 0, reestructurado: false, incobrable: false },
      
      // 3.00% Tramo 2 (Mora 2: 31-60 días)
      { id: '2', saldoCapital: new Dinero('300.00'), diasAtrasoMaximaCuota: 45, reestructurado: false, incobrable: false },
      
      // 2.25% Tramo 3 (Mora 3: 61-90 días)
      { id: '3', saldoCapital: new Dinero('225.00'), diasAtrasoMaximaCuota: 75, reestructurado: false, incobrable: false },
      
      // 1.00% Vencido (91-120 días)
      { id: '4', saldoCapital: new Dinero('100.00'), diasAtrasoMaximaCuota: 100, reestructurado: false, incobrable: false },
      
      // 0.75% Reestructurado (ej. Vigente pero reestructurado = en riesgo)
      { id: '5', saldoCapital: new Dinero('75.00'), diasAtrasoMaximaCuota: 0, reestructurado: true, incobrable: false }
    ];

    const reporte = Cartera.calcularIndicadores(creditos, 'GTQ');

    expect(reporte.porcentajeRiesgo).toBe(7.00);

    // Extraer los porcentajes de los desgloses
    const pctTramo2 = reporte.desglosePorTramo.find(d => d.tramo === TramoMora.MORA_2)?.porcentaje;
    const pctTramo3 = reporte.desglosePorTramo.find(d => d.tramo === TramoMora.MORA_3)?.porcentaje;
    const pctVencido = reporte.desglosePorTramo.find(d => d.tramo === TramoMora.VENCIDO)?.porcentaje;
    const pctVigente = reporte.desglosePorTramo.find(d => d.tramo === TramoMora.VIGENTE)?.porcentaje;

    expect(pctTramo2).toBe(3.00);
    expect(pctTramo3).toBe(2.25);
    expect(pctVencido).toBe(1.00);
    
    // El crédito reestructurado cae en tramo vigente por días (0), pero suma a riesgo.
    // Por lo que el breakdown de mora como tal para el tramo VIGENTE incluirá 93% + 0.75% = 93.75%.
  });
});
