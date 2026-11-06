import { describe, it, expect, beforeAll } from 'vitest';
import { verificarHuellaSha256, ejecutarCargaCanonico, resolverRutaDatos } from '../src/persistencia/cargador';
import { getDb } from '../src/persistencia/db';

describe('Entregable E2 / E6: Pruebas del Cargador Canónico', () => {
  const rutaDatos = resolverRutaDatos();

  it('debe verificar la huella criptográfica SHA-256 de eventos.jsonl', async () => {
    const res = await verificarHuellaSha256(rutaDatos);
    expect(res.valida).toBe(true);
    expect(res.calculada.toLowerCase()).toBe(res.esperada.toLowerCase());
    expect(res.calculada).toBe('e2d46283de8578f19ea2eb14ace283573ebb729aaa0e9b0e65f80a348e4b9d50');
  });

  it('debe cargar exactamente 60 clientes, 75 créditos y 228 pagos', async () => {
    const resumen = await ejecutarCargaCanonico(rutaDatos, false);
    expect(resumen.huellaValida).toBe(true);
    expect(resumen.totalClientes).toBe(60);
    expect(resumen.totalCreditos).toBe(75);
    expect(resumen.totalPagos).toBe(228);
    expect(resumen.totalAsesores).toBe(6);
    expect(resumen.totalDocumentos).toBe(7);
  });

  it('debe ser estrictamente idempotente: ejecutar dos veces no altera los conteos', async () => {
    const segundaCarga = await ejecutarCargaCanonico(rutaDatos, false);
    expect(segundaCarga.totalClientes).toBe(60);
    expect(segundaCarga.totalCreditos).toBe(75);
    expect(segundaCarga.totalPagos).toBe(228);

    const db = await getDb();
    const c = await db.query('SELECT COUNT(*) as count FROM clientes');
    const cr = await db.query('SELECT COUNT(*) as count FROM creditos');
    const p = await db.query('SELECT COUNT(*) as count FROM pagos');

    expect(Number(c.rows[0].count)).toBe(60);
    expect(Number(cr.rows[0].count)).toBe(75);
    expect(Number(p.rows[0].count)).toBe(228);
  });
});

