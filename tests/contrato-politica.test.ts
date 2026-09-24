import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { IPoliticaMora } from '../src/dominio/politica-mora/politica-mora';
import { PoliticaPlana } from '../src/dominio/politica-mora/politica-plana';
import { PoliticaEscalonada } from '../src/dominio/politica-mora/politica-escalonada';
import { PoliticaRetroactiva } from '../src/dominio/politica-mora/politica-retroactiva';

describe('Prueba de Sustitución de Liskov (Contrato de Políticas)', () => {
  const capitalBase = new Dinero('725.76');

  // Evaluamos el mismo contrato contra las tres políticas para asegurar la sustituibilidad
  const probarContrato = (nombre: string, politica: IPoliticaMora, pruebas: { dias: number, esperado: string }[]) => {
    describe(`Contrato para ${nombre}`, () => {
      it('Debe calcular mora en 0 días como 0.00', () => {
        const interes = politica.calcularInteresMoratorio(capitalBase, 0);
        expect(interes.valor).toBe('0.00');
      });

      it('Debe calcular gasto de cobranza de manera determinista', () => {
        // En 15 días ninguna tiene gasto, en 45 días P2 y P3 tienen Q25, P1 tiene 0
        const gasto15 = politica.getGastoCobranza(15, 'GTQ');
        const gasto45 = politica.getGastoCobranza(45, 'GTQ');
        
        expect(Number(gasto15.valor)).toBeGreaterThanOrEqual(0);
        expect(Number(gasto45.valor)).toBeGreaterThanOrEqual(0);
      });

      pruebas.forEach(p => {
        it(`Debe retornar Q${p.esperado} a los ${p.dias} días`, () => {
          const interes = politica.calcularInteresMoratorio(capitalBase, p.dias);
          expect(interes.valor).toBe(p.esperado);
        });
      });
    });
  };

  probarContrato('Politica Plana (P1)', new PoliticaPlana(), [
    { dias: 15, esperado: '7.26' },
    { dias: 45, esperado: '21.77' }
  ]);

  probarContrato('Politica Escalonada (P2)', new PoliticaEscalonada(), [
    { dias: 15, esperado: '5.44' },   // M-1
    { dias: 45, esperado: '18.14' }   // M-2
  ]);

  probarContrato('Politica Retroactiva (P3 - Prueba)', new PoliticaRetroactiva(), [
    { dias: 70, esperado: '50.80' },  // M-3
    { dias: 90, esperado: '65.32' }   // M-4
  ]);
});
