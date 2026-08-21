import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { Cartera, CreditoCartera } from '../src/dominio/cartera';

describe('Cartera en riesgo (Caso 6.8.1)', () => {
  it('debe calcular la cartera en riesgo y la cartera activa excluyendo incobrables', () => {
    const creditos: CreditoCartera[] = [
      { id: 'C-001', saldoCapital: new Dinero(620000), diasAtrasoMaximaCuota: 0, reestructurado: false, incobrable: false },
      { id: 'C-002', saldoCapital: new Dinero(124000), diasAtrasoMaximaCuota: 8, reestructurado: false, incobrable: false },
      { id: 'C-003', saldoCapital: new Dinero(24000), diasAtrasoMaximaCuota: 45, reestructurado: false, incobrable: false },
      { id: 'C-004', saldoCapital: new Dinero(18000), diasAtrasoMaximaCuota: 75, reestructurado: false, incobrable: false },
      { id: 'C-005', saldoCapital: new Dinero(8000), diasAtrasoMaximaCuota: 100, reestructurado: false, incobrable: false },
      { id: 'C-006', saldoCapital: new Dinero(6000), diasAtrasoMaximaCuota: 0, reestructurado: true, incobrable: false },
      { id: 'C-007', saldoCapital: new Dinero(15000), diasAtrasoMaximaCuota: 210, reestructurado: false, incobrable: true },
    ];

    const reporte = Cartera.calcularIndicadores(creditos);

    expect(reporte.carteraActivaTotal.valor).toBe('800000.00'); // C-007 excluido
    expect(reporte.carteraEnRiesgo.valor).toBe('56000.00'); // C-003, C-004, C-005, C-006
    expect(reporte.porcentajeRiesgo).toBe(7.00);
  });

  it('debe calcular el riesgo de 6.06% tras dar por incobrable el crédito C-005', () => {
    const creditos: CreditoCartera[] = [
      { id: 'C-001', saldoCapital: new Dinero(620000), diasAtrasoMaximaCuota: 0, reestructurado: false, incobrable: false },
      { id: 'C-002', saldoCapital: new Dinero(124000), diasAtrasoMaximaCuota: 8, reestructurado: false, incobrable: false },
      { id: 'C-003', saldoCapital: new Dinero(24000), diasAtrasoMaximaCuota: 45, reestructurado: false, incobrable: false },
      { id: 'C-004', saldoCapital: new Dinero(18000), diasAtrasoMaximaCuota: 75, reestructurado: false, incobrable: false },
      { id: 'C-005', saldoCapital: new Dinero(8000), diasAtrasoMaximaCuota: 100, reestructurado: false, incobrable: true }, // Ahora es incobrable
      { id: 'C-006', saldoCapital: new Dinero(6000), diasAtrasoMaximaCuota: 0, reestructurado: true, incobrable: false },
      { id: 'C-007', saldoCapital: new Dinero(15000), diasAtrasoMaximaCuota: 210, reestructurado: false, incobrable: true },
    ];

    const reporte = Cartera.calcularIndicadores(creditos);

    expect(reporte.carteraActivaTotal.valor).toBe('792000.00');
    expect(reporte.carteraEnRiesgo.valor).toBe('48000.00');
    expect(reporte.porcentajeRiesgo).toBe(6.06);
  });
});
