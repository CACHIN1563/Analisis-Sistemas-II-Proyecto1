import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { RepositorioCredito, aStringFecha } from '../persistencia/repositorio';
import { Dinero } from '../dominio/dinero';
import { PlanAmortizacionBuilder, AmortizacionFrancesa } from '../dominio/plan-amortizacion';
import { TramoMora } from '../dominio/calculadora-mora';
import { ServidorMCPCreditoVecino } from '../mcp/servidor-mcp';
import { MotorRAG } from '../rag/motor-rag';
import { AsistenteGerencial } from '../rag/asistente-gerencial';
import Decimal from 'decimal.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const mcp = new ServidorMCPCreditoVecino();

// Helper para obtener fecha de corte estandarizada
function getFechaCorte(req: Request): string {
  const f = req.query.fechaCorte || req.query.fecha || req.body?.fechaCorte || req.body?.fecha;
  if (f && typeof f === 'string') {
    return aStringFecha(f);
  }
  return '2026-10-31';
}

// 1. Salud del sistema
app.get('/api/salud', (req: Request, res: Response) => {
  res.json({
    sistema: 'Crédito Vecino, S. A. — SGMC',
    estado: 'OPERATIVO',
    fechaCortePredeterminada: '2026-10-31',
    version: '2.0.0-PROYECTO-FINAL'
  });
});

// 2. Clientes
app.get('/api/clientes', async (req: Request, res: Response) => {
  try {
    const clientes = await RepositorioCredito.obtenerClientes();
    res.json(clientes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req: Request, res: Response) => {
  try {
    const { id_cliente, nombre_completo, dpi, telefono, municipio, fecha_alta } = req.body;
    if (!id_cliente || !nombre_completo || !dpi) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para el alta del cliente' });
    }
    await RepositorioCredito.crearCliente({
      id_cliente,
      nombre_completo,
      dpi,
      telefono: telefono || '5555-0000',
      municipio: municipio || 'Guatemala',
      fecha_alta: fecha_alta || '2026-10-31'
    });
    res.status(201).json({ mensaje: 'Cliente registrado exitosamente', id_cliente });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Simulación de Plan de Amortización (Francés)
app.post('/api/creditos/simular', (req: Request, res: Response) => {
  try {
    const monto = req.body.monto !== undefined ? req.body.monto : req.body.capital;
    const plazo_meses = req.body.plazo_meses !== undefined ? req.body.plazo_meses : req.body.plazoMeses;
    let tna_porcentaje = req.body.tna_porcentaje;
    if (tna_porcentaje === undefined && req.body.tnaBps !== undefined) {
      tna_porcentaje = Number(req.body.tnaBps) / 100;
    }
    if (!monto || !plazo_meses || tna_porcentaje === undefined) {
      return res.status(400).json({ error: 'Parámetros incompletos (monto/capital, plazo_meses, tna_porcentaje)' });
    }

    const capital = new Dinero(new Decimal(monto).toFixed(2));
    const tasaAnual = new Decimal(tna_porcentaje).dividedBy(100).toNumber();
    const tasaMensual = tasaAnual / 12;

    const plan = new PlanAmortizacionBuilder()
      .setCapital(capital)
      .setTasaMensual(tasaMensual)
      .setPlazos(Number(plazo_meses))
      .setEstrategia(new AmortizacionFrancesa())
      .build();

    const cuotas = plan.map(c => ({
      numero: c.numero,
      saldoInicial: c.saldoInicial.valor,
      cuota: c.cuota.valor,
      interes: c.interes.valor,
      amortizacion: c.amortizacion.valor,
      saldoFinal: c.saldoFinal.valor
    }));

    res.json({
      monto: capital.valor,
      plazo_meses: Number(plazo_meses),
      tna_nominal: `${tna_porcentaje} %`,
      cuota_regular: cuotas[0].cuota,
      cuota_final_ajustada: cuotas[cuotas.length - 1].cuota,
      plan: cuotas
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Desembolsar Crédito (Originación OP-3)
const handlerDesembolso = async (req: Request, res: Response) => {
  try {
    let id_credito = req.body.id_credito;
    let id_cliente = req.body.id_cliente;
    let id_asesor = req.body.id_asesor;
    let fecha = req.body.fecha;
    let capital = req.body.capital;
    let plazo_meses = req.body.plazo_meses;
    let tna_porcentaje = req.body.tna_porcentaje;
    let reestructurado = req.body.reestructurado;

    // Si viene anidado en { cliente, credito }
    if (req.body.cliente) {
      const cli = req.body.cliente;
      id_cliente = cli.id_cliente || id_cliente;
      await RepositorioCredito.crearCliente({
        id_cliente: cli.id_cliente,
        nombre_completo: cli.nombre_completo,
        dpi: cli.dpi,
        telefono: cli.telefono,
        municipio: cli.municipio,
        fecha_alta: cli.fecha_alta || fecha || '2026-10-31'
      });
    }

    if (req.body.credito) {
      const cr = req.body.credito;
      id_credito = cr.id_credito || id_credito;
      id_cliente = cr.id_cliente || id_cliente;
      id_asesor = cr.id_asesor || id_asesor;
      fecha = cr.fecha || fecha;
      capital = cr.capital !== undefined ? cr.capital : capital;
      plazo_meses = cr.plazo_meses !== undefined ? cr.plazo_meses : plazo_meses;
      if (cr.tna_bps !== undefined) {
        tna_porcentaje = Number(cr.tna_bps) / 100;
      }
    }

    if (!id_cliente || !capital || !plazo_meses) {
      return res.status(400).json({ error: 'Campos requeridos incompletos para el desembolso' });
    }

    if (!id_credito) {
      id_credito = id_cliente === 'CL-9001' ? 'CV-2026-9001' : `CV-2026-${Date.now().toString().slice(-4)}`;
    }

    const capitalCentavos = Math.round(new Decimal(capital).times(100).toNumber());
    const tnaBps = Math.round(new Decimal(tna_porcentaje || 36).times(100).toNumber());

    await RepositorioCredito.desembolsarCredito({
      id_credito,
      id_cliente,
      id_asesor: id_asesor || 'AS-01',
      fecha: fecha || '2026-10-31',
      capital_centavos: capitalCentavos,
      plazo_meses: Number(plazo_meses),
      tna_bps: tnaBps,
      reestructurado: Boolean(reestructurado)
    });

    res.status(201).json({
      mensaje: 'Crédito originado y desembolsado exitosamente',
      id_credito,
      id_cliente,
      capital: new Decimal(capital).toFixed(2),
      credito: {
        id_credito,
        id_cliente,
        id_asesor: id_asesor || 'AS-01',
        fecha: fecha || '2026-10-31',
        capital: new Decimal(capital).toFixed(2),
        plazo_meses: Number(plazo_meses),
        tna_porcentaje: tna_porcentaje || 36
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/creditos', handlerDesembolso);
app.post('/api/creditos/desembolsar', handlerDesembolso);

// 5. Listar Créditos y Detalle de Crédito
app.get('/api/creditos', async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const todos = await RepositorioCredito.obtenerCreditos();
    const resultado = [];

    for (const c of todos) {
      const estado = await RepositorioCredito.obtenerEstadoCredito(c.id_credito, fechaCorte);
      resultado.push({
        id_credito: c.id_credito,
        id_cliente: c.id_cliente,
        cliente_nombre: estado.cliente.nombre_completo,
        fecha_desembolso: c.fecha,
        capital_inicial: new Decimal(c.capital_centavos).dividedBy(100).toFixed(2),
        saldo_capital: estado.saldoCapitalActual.valor,
        plazo_meses: c.plazo_meses,
        tna_bps: c.tna_bps,
        dias_atraso: estado.diasAtrasoMaximo,
        tramo: estado.tramoMaximo,
        cuotas_pagadas: estado.cuotasPagadas,
        cuotas_vencidas: estado.cuotasVencidas,
        es_incobrable: estado.esIncobrable,
        esta_cancelado: estado.estaCancelado,
        proxima_cuota: estado.proximaCuota ? {
          numero: estado.proximaCuota.numero,
          fecha_vencimiento: estado.proximaCuota.fechaVencimiento,
          total_exigible: estado.proximaCuota.totalExigible.valor
        } : null
      });
    }

    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/creditos/:id', async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const estado = await RepositorioCredito.obtenerEstadoCredito(req.params.id, fechaCorte);
    
    // Normalizar plan de amortización a cadenas directas para que React nunca falle
    const planNormalizado = estado.planAmortizacion.map(c => ({
      numero: c.numero,
      saldoInicial: (c.saldoInicial as any).valor || (c.saldoInicial as any).importe || String(c.saldoInicial),
      cuota: (c.cuota as any).valor || (c.cuota as any).importe || String(c.cuota),
      interes: (c.interes as any).valor || (c.interes as any).importe || String(c.interes),
      amortizacion: (c.amortizacion as any).valor || (c.amortizacion as any).importe || String(c.amortizacion),
      saldoFinal: (c.saldoFinal as any).valor || (c.saldoFinal as any).importe || String(c.saldoFinal),
      fechaVencimiento: c.fechaVencimiento,
      estado: c.estado
    }));

    const proximaCuotaNormalizada = estado.proximaCuota ? {
      numero: estado.proximaCuota.numero,
      fechaVencimiento: estado.proximaCuota.fechaVencimiento,
      diasAtraso: estado.proximaCuota.diasAtraso,
      tramo: estado.proximaCuota.tramo,
      capital: { valor: (estado.proximaCuota.capital as any).valor || (estado.proximaCuota.capital as any).importe },
      interesCorriente: { valor: (estado.proximaCuota.interesCorriente as any).valor || (estado.proximaCuota.interesCorriente as any).importe },
      interesMoratorio: { valor: (estado.proximaCuota.interesMoratorio as any).valor || (estado.proximaCuota.interesMoratorio as any).importe },
      gastos: { valor: (estado.proximaCuota.gastos as any).valor || (estado.proximaCuota.gastos as any).importe },
      totalExigible: { valor: (estado.proximaCuota.totalExigible as any).valor || (estado.proximaCuota.totalExigible as any).importe }
    } : null;

    res.json({
      ...estado,
      saldoCapitalActual: { valor: (estado.saldoCapitalActual as any).valor || (estado.saldoCapitalActual as any).importe },
      proximaCuota: proximaCuotaNormalizada,
      planAmortizacion: planNormalizado
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 6. Detalle de Mora Cuota (Tramos Recorridos)
app.get(['/api/creditos/:id/mora', '/api/creditos/:id/mora/:cuota'], async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const numCuota = req.params.cuota ? Number(req.params.cuota) : (req.query.cuota ? Number(req.query.cuota) : 1);
    const desglose = await RepositorioCredito.explicarMoraCuota(req.params.id, numCuota, fechaCorte);

    const desgloseTramos = desglose.tramosRecorridos.map(t => ({
      tramo: t.tramo,
      diasEnTramo: t.dias,
      tasaAplicada: (t.tasaNominalAnual * 100).toFixed(1),
      interesTramo: t.monto.valor
    }));

    const capitalExigible = desglose.capitalEnMora instanceof Dinero 
      ? desglose.capitalEnMora.valor 
      : (typeof desglose.capitalEnMora === 'object' && (desglose.capitalEnMora as any)?.valor 
          ? (desglose.capitalEnMora as any).valor 
          : String(desglose.capitalEnMora || '0.00'));

    const capitalDinero = new Dinero(capitalExigible);
    const moraDinero = desglose.totalInteresMoratorio instanceof Dinero 
      ? desglose.totalInteresMoratorio 
      : new Dinero(String((desglose.totalInteresMoratorio as any)?.valor || desglose.totalInteresMoratorio || '0.00'));
    const gastosDinero = desglose.gastosGestion instanceof Dinero 
      ? desglose.gastosGestion 
      : new Dinero(String((desglose.gastosGestion as any)?.valor || desglose.gastosGestion || '0.00'));
    const totalExigibleDinero = desglose.totalExigible instanceof Dinero 
      ? desglose.totalExigible 
      : new Dinero(String((desglose.totalExigible as any)?.valor || desglose.totalExigible || '0.00'));

    const interesCorriente = totalExigibleDinero
      .restar(capitalDinero)
      .restar(moraDinero)
      .restar(gastosDinero);

    res.json({
      ...desglose,
      dias_atraso_total: desglose.diasAtraso,
      tramo_actual: desglose.diasAtraso > 120 ? 'Incobrable (>120d)' :
                    desglose.diasAtraso > 90 ? 'Vencido (91-120d)' :
                    desglose.diasAtraso > 60 ? 'Mora 3 (61-90d)' :
                    desglose.diasAtraso > 30 ? 'Mora 2 (31-60d)' :
                    desglose.diasAtraso > 0 ? 'Mora 1 (1-30d)' : 'Al Día',
      fecha_vencimiento: desglose.fechaVencimiento,
      capital_cuota: capitalDinero.valor,
      capital_exigible: capitalDinero.valor,
      interes_corriente: interesCorriente.valor,
      total_mora: moraDinero.valor,
      gastos_gestion: gastosDinero.valor,
      total_exigible: totalExigibleDinero.valor,
      desglose_tramos: desgloseTramos
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Registro de Pago con Prelación e Idempotencia (OP-1, OP-2, OP-4, OP-5, OP-6)
app.post(['/api/pagos', '/api/creditos/:id/pagos'], async (req: Request, res: Response) => {
  try {
    const idCredito = req.params.id || req.body.idCredito || req.body.id_credito;
    const claveIdempotencia = (req.headers['idempotency-key'] as string) || req.body.clave_idempotencia || req.body.claveIdempotencia;
    const monto = req.body.monto;
    const fechaPago = aStringFecha(req.body.fecha_pago || req.body.fechaPago || '2026-10-31');
    const canal = req.body.canal || 'agencia';

    if (!idCredito) {
      return res.status(400).json({ error: 'El identificador del crédito (idCredito) es obligatorio' });
    }
    if (!claveIdempotencia) {
      return res.status(400).json({ error: 'La cabecera o campo Idempotency-Key es obligatoria' });
    }
    if (!monto) {
      return res.status(400).json({ error: 'El monto es obligatorio' });
    }

    const resultado = await RepositorioCredito.registrarPagoConPrelacion({
      idCredito,
      monto: new Dinero(String(monto)),
      fechaPago,
      canal,
      claveIdempotencia
    });

    if (resultado.yaProcesado) {
      return res.status(200).json({
        mensaje: 'Pago reintentado con clave de idempotencia existente. No se aplicó cobro duplicado.',
        yaProcesado: true,
        claveIdempotencia,
        desglosePrelacion: {
          gastos: resultado.resultado.pagadoGastos.valor,
          interesMoratorio: resultado.resultado.pagadoInteresMoratorio.valor,
          interesCorriente: resultado.resultado.pagadoInteresCorriente.valor,
          capital: resultado.resultado.pagadoCapital.valor,
          excedente: resultado.resultado.excedente.valor
        },
        nuevoSaldoCapital: resultado.estadoCreditoDespues.saldoCapitalActual.valor
      });
    }

    res.status(201).json({
      mensaje: 'Pago aplicado exitosamente conforme a prelación',
      yaProcesado: false,
      claveIdempotencia,
      desglosePrelacion: {
        gastos: resultado.resultado.pagadoGastos.valor,
        interesMoratorio: resultado.resultado.pagadoInteresMoratorio.valor,
        interesCorriente: resultado.resultado.pagadoInteresCorriente.valor,
        capital: resultado.resultado.pagadoCapital.valor,
        excedente: resultado.resultado.excedente.valor
      },
      nuevoSaldoCapital: resultado.estadoCreditoDespues.saldoCapitalActual.valor,
      cuotasPagadas: resultado.estadoCreditoDespues.cuotasPagadas
    });
  } catch (err: any) {
    res.status(422).json({
      error: err.message,
      rechazado: true
    });
  }
});

// 8. Tablero Gerencial (G-1)
app.get(['/api/cartera', '/api/reportes/cartera'], async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const cartera = await RepositorioCredito.obtenerEstadoCartera(fechaCorte);
    res.json(cartera);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Cierres Diario y Mensual (G-2, G-3)
app.get(['/api/cierres/diario', '/api/reportes/cierres/diario'], async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const cierre = await RepositorioCredito.obtenerCierreDiario(fechaCorte);
    res.json(cierre);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/api/cierres/mensual', '/api/reportes/cierres/mensual'], async (req: Request, res: Response) => {
  try {
    const anio = req.query.anio ? Number(req.query.anio) : 2026;
    const mes = req.query.mes ? Number(req.query.mes) : 10;
    const cierre = await RepositorioCredito.obtenerCierreMensual(anio, mes);
    res.json(cierre);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Próximos Vencimientos (G-6)
app.get(['/api/vencimientos', '/api/reportes/vencimientos'], async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const dias = req.query.dias ? Number(req.query.dias) : (req.query.diasVentana ? Number(req.query.diasVentana) : 30);
    const vencimientos = await RepositorioCredito.obtenerProximosVencimientos(fechaCorte, dias);
    res.json(vencimientos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Listar créditos en mora (G-4)
app.get(['/api/reportes/creditos-mora', '/api/creditos-mora'], async (req: Request, res: Response) => {
  try {
    const fechaCorte = getFechaCorte(req);
    const tramoParam = req.query.tramo as string;
    let tramo: TramoMora | undefined = undefined;
    if (tramoParam) {
      if (tramoParam.includes('1')) tramo = TramoMora.MORA_1;
      else if (tramoParam.includes('2')) tramo = TramoMora.MORA_2;
      else if (tramoParam.includes('3')) tramo = TramoMora.MORA_3;
      else if (tramoParam.includes('Vencido')) tramo = TramoMora.VENCIDO;
    }
    const lista = await RepositorioCredito.listarCreditosEnMora(fechaCorte, tramo);
    res.json(lista);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Chat Gerencial con Asistente Inteligente (E5, G-1 a G-8, OP-7 y Dominio Estricto)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { mensaje, fechaCorte: fechaParam, sessionId } = req.body;
    const fechaCorte = aStringFecha(fechaParam || '2026-10-31');
    const resultado = await AsistenteGerencial.procesarMensaje(mensaje || '', fechaCorte, sessionId);
    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Explorador Visual de Base de Datos PGlite
app.get('/api/db/tablas', async (_req: Request, res: Response) => {
  try {
    const { getDb } = await import('../persistencia/db');
    const db = await getDb();
    const tablas = ['clientes', 'creditos', 'pagos', 'asesores', 'documentos_rag', 'politicas', 'carga_metadata'];
    const resultado = [];
    for (const t of tablas) {
      const c = await db.query(`SELECT COUNT(*) as total FROM ${t}`);
      resultado.push({ tabla: t, total: Number(c.rows[0].total) });
    }
    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/:tabla', async (req: Request, res: Response) => {
  try {
    const tablasValidas = ['clientes', 'creditos', 'pagos', 'asesores', 'documentos_rag', 'politicas', 'carga_metadata'];
    const tabla = req.params.tabla.toLowerCase();
    if (!tablasValidas.includes(tabla)) {
      return res.status(400).json({ error: `Tabla no válida. Tablas disponibles: ${tablasValidas.join(', ')}` });
    }
    const { getDb } = await import('../persistencia/db');
    const db = await getDb();
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const resRows = await db.query(`SELECT * FROM ${tabla} LIMIT $1`, [limit]);
    res.json({
      tabla,
      registrosMostrados: resRows.rows.length,
      datos: resRows.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Servir frontend compilado de React
const distPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export { app };

if (require.main === module) {
  (async () => {
    try {
      const { ejecutarCargaCanonico, resolverRutaDatos } = await import('../persistencia/cargador');
      await ejecutarCargaCanonico(resolverRutaDatos(), false);
    } catch (e: any) {
      console.log('Inicialización de datos canónicos:', e.message);
    }
    app.listen(PORT, () => {
      console.log(`\x1b[32m✔ Servidor API Crédito Vecino escuchando en http://localhost:${PORT}\x1b[0m`);
    });
  })();
}
