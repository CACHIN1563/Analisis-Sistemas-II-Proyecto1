import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServidorMCPCreditoVecino } from '../src/mcp/servidor-mcp';
import { RepositorioCredito } from '../src/persistencia/repositorio';
import { ejecutarCargaCanonico, resolverRutaDatos } from '../src/persistencia/cargador';
import { getDb } from '../src/persistencia/db';

describe('Entregable E3 / E6: Pruebas del Servidor MCP', () => {
  const mcp = new ServidorMCPCreditoVecino();

  beforeAll(async () => {
    // Asegurar carga canónica limpia
    await ejecutarCargaCanonico(resolverRutaDatos(), false);
  });

  afterAll(async () => {
    // Limpiar pagos creados durante las pruebas para no ensuciar la base de datos canónica
    const db = await getDb();
    await db.query("DELETE FROM pagos WHERE clave_idempotencia LIKE 'TEST-%'");
  });

  it('consultar_credito: debe retornar la información del crédito coherente con el núcleo', async () => {
    const res = await mcp.ejecutarHerramienta('consultar_credito', {
      id_credito: 'CV-2026-0030',
      fecha_corte: '2026-10-31'
    });

    expect(res.error).toBeUndefined();
    expect(res.id_credito).toBe('CV-2026-0030');
    expect(res.cuotas_pagadas).toBe(2);
    expect(res.dias_atraso).toBe(65);
    expect(res.saldo_capital).toBe('686.16');
  });

  it('calcular_deuda_cuota: debe calcular el desglose exacto de la cuota exigible', async () => {
    const res = await mcp.ejecutarHerramienta('calcular_deuda_cuota', {
      id_credito: 'CV-2026-0043',
      fecha_corte: '2026-10-31'
    });

    expect(res.error).toBeUndefined();
    expect(res.id_credito).toBe('CV-2026-0043');
    expect(res.numero_cuota).toBe(1);
    expect(res.gastos).toBe('0.00');
    expect(res.interes_moratorio).toBe('17.22');
    expect(res.interes_corriente).toBe('75.00');
    expect(res.capital).toBe('469.65');
    expect(res.total_exigible).toBe('561.87');
  });

  it('explicar_mora: debe desglosar tramos recorridos a fecha futura (G-7: CV-2026-0410 al 24-ene-2027)', async () => {
    const res = await mcp.ejecutarHerramienta('explicar_mora', {
      id_credito: 'CV-2026-0410',
      numero_cuota: 2,
      fecha_corte: '2027-01-24'
    });

    expect(res.error).toBeUndefined();
    expect(res.id_credito).toBe('CV-2026-0410');
    expect(res.dias_atraso_total).toBe(45);
    expect(res.total_mora).toBe('18.14');
    expect(res.gastos_gestion).toBe('25.00');
    expect(res.total_exigible).toBe('1047.76');
    expect(res.desglose_por_tramo.length).toBe(2);
  });

  it('consultar_cartera: debe coincidir exactamente con los oráculos del núcleo', async () => {
    const res = await mcp.ejecutarHerramienta('consultar_cartera', {
      fecha_corte: '2026-10-31'
    });

    const core = await RepositorioCredito.obtenerEstadoCartera('2026-10-31');

    expect(res.carteraActivaTotal).toBe(core.carteraActivaTotal);
    expect(res.carteraEnRiesgo).toBe(core.carteraEnRiesgo);
    expect(res.porcentajeRiesgo).toBe(core.porcentajeRiesgo);
    expect(res.incobrablesPeriodo.cantidad).toBe(core.incobrablesPeriodo.cantidad);
  });

  it('registrar_pago [Menor Privilegio]: debe requerir aprobación humana explícita por defecto', async () => {
    const res = await mcp.ejecutarHerramienta('registrar_pago', {
      id_credito: 'CV-2026-0043',
      monto: '561.87',
      fecha_pago: '2026-10-31',
      clave_idempotencia: 'TEST-MCP-IDEM-01',
      aprobacion_humana_confirmada: false
    });

    expect(res.requiere_aprobacion_humana).toBe(true);
    expect(res.propuesta.monto_solicitado).toBe('561.87');
  });

  it('registrar_pago [Rechazo]: debe rechazar montos no exactos (OP-5)', async () => {
    const res = await mcp.ejecutarHerramienta('registrar_pago', {
      id_credito: 'CV-2026-0061',
      monto: '500.00',
      fecha_pago: '2026-10-31',
      clave_idempotencia: 'TEST-MCP-OP5',
      aprobacion_humana_confirmada: true
    });

    expect(res.error).toBe(true);
    expect(res.mensaje).toContain('Monto no exacto');
    expect(res.mensaje).toContain('370.85');
  });

  it('registrar_pago [Rechazo]: debe rechazar créditos incobrables (OP-6)', async () => {
    const res = await mcp.ejecutarHerramienta('registrar_pago', {
      id_credito: 'CV-2026-0015',
      monto: '276.90',
      fecha_pago: '2026-10-31',
      clave_idempotencia: 'TEST-MCP-OP6',
      aprobacion_humana_confirmada: true
    });

    expect(res.error).toBe(true);
    expect(res.mensaje).toContain('INCOBRABLE');
  });

  it('registrar_pago [Éxito e Idempotencia]: aplica prelación y previene cobro repetido (OP-1 / OP-4)', async () => {
    const clave = 'TEST-MCP-OP1-IDEM-999';

    // Primer intento con aprobación humana
    const res1 = await mcp.ejecutarHerramienta('registrar_pago', {
      id_credito: 'CV-2026-0043',
      monto: '561.87',
      fecha_pago: '2026-10-31',
      clave_idempotencia: clave,
      aprobacion_humana_confirmada: true
    });

    expect(res1.pago_aplicado).toBe(true);
    expect(res1.idempotente_reintento).toBe(false);
    expect(res1.desglose_prelacion.mora_pagada).toBe('17.22');
    expect(res1.desglose_prelacion.capital_pagado).toBe('469.65');

    // Reintento con la misma clave (OP-4)
    const res2 = await mcp.ejecutarHerramienta('registrar_pago', {
      id_credito: 'CV-2026-0043',
      monto: '561.87',
      fecha_pago: '2026-10-31',
      clave_idempotencia: clave,
      aprobacion_humana_confirmada: true
    });

    expect(res2.pago_aplicado).toBe(true);
    expect(res2.idempotente_reintento).toBe(true);
  });
});
