import { describe, it, expect } from 'vitest';
import { Dinero } from '../src/dominio/dinero';

describe('Dinero Value Object', () => {
  it('debe redondear a 2 decimales medio hacia arriba al inicializarse', () => {
    const d1 = new Dinero('100.555');
    expect(d1.valor).toBe('100.56');

    const d2 = new Dinero('100.554');
    expect(d2.valor).toBe('100.55');
  });

  it('debe sumar correctamente dos importes inmutando el original', () => {
    const d1 = new Dinero('100.50');
    const d2 = new Dinero('50.25');
    const suma = d1.sumar(d2);

    expect(suma.valor).toBe('150.75');
    // Verificar inmutabilidad
    expect(d1.valor).toBe('100.50');
    expect(d2.valor).toBe('50.25');
  });

  it('debe multiplicar y redondear correctamente', () => {
    const d1 = new Dinero('100');
    // 100 * 0.03 = 3
    const interes = d1.multiplicar('0.03');
    expect(interes.valor).toBe('3.00');

    // 1004.6208547 redondeado debe ser 1004.62
    const cuota = new Dinero('1004.6208547');
    expect(cuota.valor).toBe('1004.62');
  });

  it('debe prohibir sumar quetzales con dólares', () => {
    const quetzales = new Dinero('100', 'GTQ');
    const dolares = new Dinero('100', 'USD');

    expect(() => quetzales.sumar(dolares)).toThrowError('Incompatibilidad de monedas: no se puede operar GTQ con USD');
    expect(() => quetzales.restar(dolares)).toThrowError('Incompatibilidad de monedas');
  });
});
