import { describe, expect, it } from 'vitest';
import { Dinero } from '../src/dominio/dinero';
import {
  ContextoEstadoCredito,
  EstadoCredito
} from '../src/dominio/estado-credito';
import {
  AmortizacionFrancesa,
  PlanAmortizacionBuilder
} from '../src/dominio/plan-amortizacion';
import { CalculadoraMora, TramoMora } from '../src/dominio/calculadora-mora';

const fechaInicial = new Date('2026-08-01T00:00:00Z');
const fechaCambio = new Date('2026-08-02T00:00:00Z');

function crearCredito(): ContextoEstadoCredito {
  return new ContextoEstadoCredito(new Dinero('10000'), fechaInicial);
}

function crearCreditoVigente(): ContextoEstadoCredito {
  const credito = crearCredito();
  credito.aprobar(fechaCambio);
  credito.desembolsar(fechaCambio);
  return credito;
}

describe('State del ciclo de vida del crédito', () => {
  it('transita de solicitado a aprobado', () => {
    const credito = crearCredito();
    credito.aprobar(fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.APROBADO);
  });

  it('transita de solicitado a rechazado', () => {
    const credito = crearCredito();
    credito.rechazar(fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.RECHAZADO);
  });

  it('transita de aprobado a vigente después del desembolso', () => {
    const credito = crearCredito();
    credito.aprobar(fechaCambio);
    credito.desembolsar(fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.VIGENTE);
  });

  it('anula una solicitud por desistimiento antes del desembolso', () => {
    const credito = crearCredito();
    credito.desistir(fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.ANULADO);
  });

  it('anula un crédito aprobado al expirar antes del desembolso', () => {
    const credito = crearCredito();
    credito.aprobar(fechaCambio);
    credito.expirar(fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.ANULADO);
  });

  it('transita de vigente a en_mora', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(15, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.EN_MORA);
  });

  it('regulariza en_mora a vigente al pagar todo lo vencido', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(15, fechaCambio);
    credito.aplicarPago(new Dinero('9000'), 0, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.VIGENTE);
  });

  it('mantiene en_mora después de un pago parcial', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(15, fechaCambio);
    credito.aplicarPago(new Dinero('9500'), 10, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.EN_MORA);
    expect(credito.diasAtraso).toBe(10);
  });

  it('transita de en_mora a reestructurado', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(15, fechaCambio);
    credito.reestructurar(fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.REESTRUCTURADO);
  });

  it('transita de reestructurado a vigente', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(15, fechaCambio);
    credito.reestructurar(fechaCambio);
    credito.aplicarPago(new Dinero('9000'), 0, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.VIGENTE);
  });

  it('lleva un crédito reestructurado atrasado a en_mora', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(15, fechaCambio);
    credito.reestructurar(fechaCambio);
    credito.registrarAtraso(1, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.EN_MORA);
  });

  it('cancela por saldo exacto de cero', () => {
    const credito = crearCreditoVigente();
    credito.aplicarPago(new Dinero('0'), 0, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.CANCELADO);
  });

  it('pasa a incobrable al superar 120 días', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(121, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.INCOBRABLE);
  });

  it('no permite marcar incobrable con 120 días o menos', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(120, fechaCambio);
    expect(() => credito.marcarIncobrable(fechaCambio)).toThrow('después de 120 días');
  });

  it('rechaza transiciones inválidas', () => {
    const credito = crearCredito();
    expect(() => credito.desembolsar(fechaCambio)).toThrow('Transición no permitida');
  });

  it('impide pagos en estado solicitado', () => {
    const credito = crearCredito();
    expect(() => credito.aplicarPago(new Dinero('100'), 0, fechaCambio)).toThrow('Transición no permitida');
  });

  it('no permite transiciones indebidas desde un estado terminal', () => {
    const credito = crearCredito();
    credito.rechazar(fechaCambio);
    expect(() => credito.aprobar(fechaCambio)).toThrow('Transición no permitida');
  });

  it('regulariza el atraso de forma reversible y reclasifica sus tramos', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(45, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.EN_MORA);
    expect(CalculadoraMora.clasificarTramo(credito.diasAtraso)).toBe(TramoMora.MORA_2);

    credito.aplicarPago(new Dinero('9500'), 10, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.EN_MORA);
    expect(credito.diasAtraso).toBe(10);
    expect(CalculadoraMora.clasificarTramo(credito.diasAtraso)).toBe(TramoMora.MORA_1);

    credito.aplicarPago(new Dinero('9000'), 0, fechaCambio);
    expect(credito.diasAtraso).toBe(0);
    expect(credito.estado).toBe(EstadoCredito.VIGENTE);
  });

  it('regulariza en_mora al registrar cero días de atraso', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(10, fechaCambio);
    credito.registrarAtraso(0, fechaCambio);
    expect(credito.estado).toBe(EstadoCredito.VIGENTE);
  });

  it('rechaza días y saldos resultantes negativos', () => {
    const credito = crearCreditoVigente();
    expect(() => credito.aplicarPago(new Dinero('9000'), -1, fechaCambio)).toThrow('entero no negativo');
    expect(() => credito.aplicarPago(new Dinero('-0.01'), 0, fechaCambio)).toThrow('no puede ser negativo');
  });

  it('conserva la trazabilidad vigente, en_mora e incobrable al detectar 121 días', () => {
    const credito = crearCreditoVigente();
    credito.registrarAtraso(121, fechaCambio, 'cierre-diario', 'Cuota con 121 días de atraso');
    expect(credito.estado).toBe(EstadoCredito.INCOBRABLE);
    expect(credito.historial.slice(-2).map((r) => [r.estadoAnterior, r.estadoNuevo])).toEqual([
      [EstadoCredito.VIGENTE, EstadoCredito.EN_MORA],
      [EstadoCredito.EN_MORA, EstadoCredito.INCOBRABLE]
    ]);
  });

  it('registra historial inmutable con fecha, actor y motivo y acumula transiciones', () => {
    const credito = crearCredito();
    credito.aprobar(fechaCambio, 'asesor-17', 'Evaluación favorable');
    credito.desembolsar(fechaCambio, 'tesoreria', 'Fondos entregados');
    expect(credito.historial).toHaveLength(2);
    expect(credito.historial[0]).toMatchObject({
      estadoAnterior: EstadoCredito.SOLICITADO,
      estadoNuevo: EstadoCredito.APROBADO,
      actor: 'asesor-17',
      motivo: 'Evaluación favorable'
    });
    expect(credito.historial[0].fecha).toEqual(fechaCambio);
    credito.historial[0].fecha.setUTCFullYear(2030);
    expect(credito.historial[0].fecha).toEqual(fechaCambio);
  });

  it('no altera el historial cuando una transición es inválida', () => {
    const credito = crearCredito();
    expect(() => credito.desembolsar(fechaCambio)).toThrow('Transición no permitida');
    expect(credito.historial).toHaveLength(0);
  });
});

describe('Builder del plan de amortización', () => {
  const builderCompleto = () => new PlanAmortizacionBuilder()
    .setCapital(new Dinero('10000'))
    .setTasaMensual(0.03)
    .setPlazos(12)
    .setEstrategia(new AmortizacionFrancesa());

  it('rechaza parámetros incompletos', () => {
    expect(() => new PlanAmortizacionBuilder().build()).toThrow('El capital es obligatorio');
  });

  it('rechaza capital no válido', () => {
    expect(() => builderCompleto().setCapital(new Dinero('0')).build()).toThrow('El capital debe ser mayor que cero');
  });

  it('rechaza plazo no válido', () => {
    expect(() => builderCompleto().setPlazos(0).build()).toThrow('La cantidad de cuotas debe ser un entero mayor que cero');
  });

  it('genera el caso de amortización existente', () => {
    const plan = builderCompleto().build();
    expect(plan[0].cuota.valor).toBe('1004.62');
    expect(plan[11].cuota.valor).toBe('1004.63');
  });

  it('conserva la suma de amortizaciones y el saldo final', () => {
    const plan = builderCompleto().build();
    let suma = new Dinero('0');
    for (const cuota of plan) suma = suma.sumar(cuota.amortizacion);
    expect(suma.valor).toBe('10000.00');
    expect(plan[plan.length - 1].saldoFinal.valor).toBe('0.00');
  });
});
