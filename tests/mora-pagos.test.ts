import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import { CalculadoraMora, TramoMora } from '../src/dominio/calculadora-mora';
import { ProcesadorDePagos, DeudaCuota } from '../src/dominio/prelacion-pago';

describe('Calculadora de Mora (Caso 6.5)', () => {
  it('debe calcular el interés moratorio exacto', () => {
    const capitalEnMora = new Dinero('725.76');
    const tasaAnual = 0.24;
    const diasAtraso = 15;
    const interes = CalculadoraMora.calcularInteresMoratorio(capitalEnMora, tasaAnual, diasAtraso);
    
    // interes_moratorio = 725.76 * (0.24/360) * 15 = 7.2576 -> redondeado a 7.26
    expect(interes.valor).toBe('7.26');
  });

  it('debe clasificar los tramos correctamente', () => {
    expect(CalculadoraMora.clasificarTramo(0)).toBe(TramoMora.VIGENTE);
    expect(CalculadoraMora.clasificarTramo(15)).toBe(TramoMora.MORA_1);
    expect(CalculadoraMora.clasificarTramo(45)).toBe(TramoMora.MORA_2);
    expect(CalculadoraMora.clasificarTramo(75)).toBe(TramoMora.MORA_3);
    expect(CalculadoraMora.clasificarTramo(100)).toBe(TramoMora.VENCIDO);
    expect(CalculadoraMora.clasificarTramo(130)).toBe(TramoMora.INCOBRABLE);
  });
});

describe('Prelación de Pagos (Caso 6.6)', () => {
  const deudaBase: DeudaCuota = {
    gastos: new Dinero('0.00'),
    interesMoratorio: new Dinero('7.26'),
    interesCorriente: new Dinero('278.86'),
    capital: new Dinero('725.76')
  };

  it('Escenario A: Pago exacto de la cuota vencida', () => {
    const pago = new Dinero('1011.88');
    const procesador = new ProcesadorDePagos();
    
    const resultado = procesador.procesar(pago, deudaBase);

    expect(resultado.pagadoGastos.valor).toBe('0.00');
    expect(resultado.pagadoInteresMoratorio.valor).toBe('7.26');
    expect(resultado.pagadoInteresCorriente.valor).toBe('278.86');
    expect(resultado.pagadoCapital.valor).toBe('725.76');
    expect(resultado.excedente.valor).toBe('0.00');
  });

  it('Escenario B: Pago parcial (de menos)', () => {
    const pago = new Dinero('500.00');
    const procesador = new ProcesadorDePagos();
    
    const resultado = procesador.procesar(pago, deudaBase);

    expect(resultado.pagadoGastos.valor).toBe('0.00');
    expect(resultado.pagadoInteresMoratorio.valor).toBe('7.26');
    expect(resultado.pagadoInteresCorriente.valor).toBe('278.86');
    expect(resultado.pagadoCapital.valor).toBe('213.88'); // El restante
    expect(resultado.excedente.valor).toBe('0.00');
  });

  it('Escenario C: Pago de más', () => {
    const pago = new Dinero('3000.00');
    const procesador = new ProcesadorDePagos();
    
    const resultado = procesador.procesar(pago, deudaBase);

    expect(resultado.pagadoGastos.valor).toBe('0.00');
    expect(resultado.pagadoInteresMoratorio.valor).toBe('7.26');
    expect(resultado.pagadoInteresCorriente.valor).toBe('278.86');
    expect(resultado.pagadoCapital.valor).toBe('725.76');
    expect(resultado.excedente.valor).toBe('1988.12'); // Excedente
  });
});
