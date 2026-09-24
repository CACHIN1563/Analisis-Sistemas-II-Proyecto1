import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { PoliticaPlana } from '../src/dominio/politica-mora/politica-plana';
import { PoliticaEscalonada } from '../src/dominio/politica-mora/politica-escalonada';
import { GastoGestionCobro } from '../src/dominio/politica-mora/gasto-gestion-cobro';
import { DeudaCuota, ProcesadorDePagos } from '../src/dominio/prelacion-pago';

describe('Pruebas de Políticas de Mora (CP-01 a CP-03)', () => {
  const capitalBase = new Dinero('725.76');

  describe('Casos M-1 a M-5 con Política Escalonada', () => {
    const politicaEscalonada = new PoliticaEscalonada();

    it('M-1: 15 días (Tramo 1 - 18%)', () => {
      const interes = politicaEscalonada.calcularInteresMoratorio(capitalBase, 15);
      expect(interes.valor).toBe('5.44'); // 725.76 * (0.18/360) * 15
    });

    it('M-2: 45 días (Tramo 2)', () => {
      const interes = politicaEscalonada.calcularInteresMoratorio(capitalBase, 45);
      expect(interes.valor).toBe('18.14'); 
      // 30 días al 18% = 10.89 + 15 días al 24% = 7.26 => 18.14
    });

    it('M-5: Pago Total de la Cuota a los 45 días', () => {
      // capital = 725.76, interes corriente = 278.86
      const interesMoratorio = politicaEscalonada.calcularInteresMoratorio(capitalBase, 45);
      const gasto = politicaEscalonada.getGastoCobranza(45, 'GTQ'); // Q25
      
      const deuda: DeudaCuota = {
        capital: capitalBase,
        interesCorriente: new Dinero('278.86'),
        interesMoratorio: interesMoratorio, // 18.14
        gastos: gasto // 25.00
      };

      const procesador = new ProcesadorDePagos();
      const pago = new Dinero('1047.76'); // Total a pagar
      const resultado = procesador.procesar(pago, deuda);

      expect(resultado.excedente.valor).toBe('0.00');
      expect(resultado.pagadoCapital.valor).toBe('725.76');
      expect(resultado.pagadoGastos.valor).toBe('25.00');
      expect(resultado.pagadoInteresMoratorio.valor).toBe('18.14');
    });
  });

  describe('Coexistencia de políticas (Sección 7.6)', () => {
    it('Debe calcular Q21.77 para Plana y Q18.14 para Escalonada (45 días)', () => {
      const plana = new PoliticaPlana();
      const escalonada = new PoliticaEscalonada();

      const interesPlana = plana.calcularInteresMoratorio(capitalBase, 45);
      const interesEscalonada = escalonada.calcularInteresMoratorio(capitalBase, 45);

      expect(interesPlana.valor).toBe('21.77');
      expect(interesEscalonada.valor).toBe('18.14');
    });
  });
});
