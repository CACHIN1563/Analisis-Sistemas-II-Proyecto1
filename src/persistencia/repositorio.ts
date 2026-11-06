import { getDb } from './db';
import { Dinero } from '../dominio/dinero';
import { PlanAmortizacionBuilder, AmortizacionFrancesa, CuotaPlan } from '../dominio/plan-amortizacion';
import { CalculadoraMora, TramoMora } from '../dominio/calculadora-mora';
import { ClasificacionTramo } from '../dominio/clasificacion-tramo';
import { PoliticaPlana } from '../dominio/politica-mora/politica-plana';
import { PoliticaEscalonada } from '../dominio/politica-mora/politica-escalonada';
import { IPoliticaMora } from '../dominio/politica-mora/politica-mora';
import { ProcesadorDePagos, DeudaCuota, ResultadoPago } from '../dominio/prelacion-pago';
import Decimal from 'decimal.js';

export interface ClienteDB {
  id_cliente: string;
  nombre_completo: string;
  dpi: string;
  telefono: string;
  municipio: string;
  fecha_alta: string;
}

export interface CreditoDB {
  id_credito: string;
  id_cliente: string;
  id_asesor: string;
  fecha: string;
  capital_centavos: number | string;
  plazo_meses: number;
  tna_bps: number;
  reestructurado: boolean;
  estado: string;
}

export interface PagoDB {
  id_pago: number;
  seq?: number;
  clave_idempotencia: string;
  id_credito: string;
  fecha: string;
  monto_centavos: number | string;
  canal: string;
  gastos_centavos: number | string;
  mora_centavos: number | string;
  interes_centavos: number | string;
  capital_centavos: number | string;
  excedente_centavos: number | string;
  duplicado: boolean;
}

export interface EstadoCreditoCalculado {
  credito: CreditoDB;
  cliente: ClienteDB;
  saldoCapitalActual: Dinero;
  cuotasTotales: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  proximaCuota: {
    numero: number;
    fechaVencimiento: string;
    diasAtraso: number;
    tramo: TramoMora;
    capital: Dinero;
    interesCorriente: Dinero;
    interesMoratorio: Dinero;
    gastos: Dinero;
    totalExigible: Dinero;
  } | null;
  diasAtrasoMaximo: number;
  tramoMaximo: TramoMora;
  esIncobrable: boolean;
  estaAlDia: boolean;
  estaCancelado: boolean;
  politicaAplicada: string;
  planAmortizacion: Array<CuotaPlan & { fechaVencimiento: string; estado: 'pagada' | 'vencida' | 'vigente' }>;
}

export function aStringFecha(f: any): string {
  if (!f) return '';
  if (typeof f === 'string') return f.slice(0, 10);
  if (f instanceof Date) return f.toISOString().slice(0, 10);
  return String(f).slice(0, 10);
}

export function calcularFechaVencimiento(fechaDesembolsoRaw: any, numeroCuota: number): string {
  const fechaDesembolsoStr = aStringFecha(fechaDesembolsoRaw);
  const [y, m, d] = fechaDesembolsoStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1 + numeroCuota, d));
  const mesEsperado = (m - 1 + numeroCuota) % 12;
  if (fecha.getUTCMonth() !== mesEsperado) {
    fecha.setUTCDate(0);
  }
  return fecha.toISOString().slice(0, 10);
}

export function diferenciaDias(fechaInicioRaw: any, fechaFinRaw: any): number {
  const fechaInicioStr = aStringFecha(fechaInicioRaw);
  const fechaFinStr = aStringFecha(fechaFinRaw);
  const f1 = new Date(fechaInicioStr + 'T00:00:00Z').getTime();
  const f2 = new Date(fechaFinStr + 'T00:00:00Z').getTime();
  const diff = Math.floor((f2 - f1) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function resolverPolitica(fechaDesembolsoRaw: any): { id: string; politica: IPoliticaMora } {
  const fechaDesembolsoStr = aStringFecha(fechaDesembolsoRaw);
  if (fechaDesembolsoStr <= '2026-09-30') {
    return { id: 'POL-2024-01', politica: new PoliticaPlana() };
  }
  return { id: 'POL-2026-10', politica: new PoliticaEscalonada() };
}

export function calcularEstadoCreditoPuro(
  credito: CreditoDB,
  cliente: ClienteDB,
  pagosCredito: PagoDB[],
  fechaCorte: string
): EstadoCreditoCalculado {
  const capitalTotal = new Dinero(new Decimal(credito.capital_centavos).dividedBy(100).toFixed(2));
  const tasaAnual = new Decimal(credito.tna_bps).dividedBy(10000).toNumber();
  const tasaMensual = tasaAnual / 12;

  const planBase = new PlanAmortizacionBuilder()
    .setCapital(capitalTotal)
    .setTasaMensual(tasaMensual)
    .setPlazos(credito.plazo_meses)
    .setEstrategia(new AmortizacionFrancesa())
    .build();

  const { id: politicaId, politica } = resolverPolitica(credito.fecha);
  const fechaCorteStr = aStringFecha(fechaCorte);

  const pagosValidos = pagosCredito.filter(p => !p.duplicado && aStringFecha(p.fecha) <= fechaCorteStr);
  const cuotasPagadas = pagosValidos.length;

  let saldoCapitalActual = capitalTotal;
  for (let i = 0; i < cuotasPagadas && i < planBase.length; i++) {
    saldoCapitalActual = saldoCapitalActual.restar(planBase[i].amortizacion);
  }

  let cuotasVencidas = 0;
  let diasAtrasoMaximo = 0;
  let proximaCuotaCalculada: EstadoCreditoCalculado['proximaCuota'] = null;

  const planDetallado = planBase.map((c, idx) => {
    const numCuota = idx + 1;
    const fVenc = calcularFechaVencimiento(credito.fecha, numCuota);
    let estadoCuota: 'pagada' | 'vencida' | 'vigente' = 'vigente';

    if (numCuota <= cuotasPagadas) {
      estadoCuota = 'pagada';
    } else if (fVenc <= fechaCorte) {
      estadoCuota = 'vencida';
      cuotasVencidas++;
      const atraso = diferenciaDias(fVenc, fechaCorte);
      if (atraso > diasAtrasoMaximo) {
        diasAtrasoMaximo = atraso;
      }
    }

    return {
      ...c,
      fechaVencimiento: fVenc,
      estado: estadoCuota
    };
  });

  const estaCancelado = cuotasPagadas >= credito.plazo_meses;
  const esIncobrable = diasAtrasoMaximo > 120;
  const tramoMaximo = ClasificacionTramo.clasificar(diasAtrasoMaximo);

  if (!estaCancelado) {
    const proxNum = cuotasPagadas + 1;
    const cuotaPlan = planBase[proxNum - 1];
    const fVenc = calcularFechaVencimiento(credito.fecha, proxNum);
    const diasAtrasoProx = fVenc < fechaCorte ? diferenciaDias(fVenc, fechaCorte) : 0;
    const tramoProx = ClasificacionTramo.clasificar(diasAtrasoProx);

    let interesMora = new Dinero('0.00');
    let gastos = new Dinero('0.00');

    if (diasAtrasoProx > 0 && !esIncobrable) {
      interesMora = politica.calcularInteresMoratorio(cuotaPlan.amortizacion, diasAtrasoProx);
      gastos = politica.getGastoCobranza(diasAtrasoProx, 'GTQ');
    }

    const totalExigible = cuotaPlan.amortizacion
      .sumar(cuotaPlan.interes)
      .sumar(interesMora)
      .sumar(gastos);

    proximaCuotaCalculada = {
      numero: proxNum,
      fechaVencimiento: fVenc,
      diasAtraso: diasAtrasoProx,
      tramo: tramoProx,
      capital: cuotaPlan.amortizacion,
      interesCorriente: cuotaPlan.interes,
      interesMoratorio: interesMora,
      gastos,
      totalExigible
    };
  }

  return {
    credito,
    cliente,
    saldoCapitalActual,
    cuotasTotales: credito.plazo_meses,
    cuotasPagadas,
    cuotasVencidas,
    proximaCuota: proximaCuotaCalculada,
    diasAtrasoMaximo,
    tramoMaximo,
    esIncobrable,
    estaAlDia: cuotasVencidas === 0 && !esIncobrable && !estaCancelado,
    estaCancelado,
    politicaAplicada: politicaId,
    planAmortizacion: planDetallado
  };
}

export class RepositorioCredito {
  static async obtenerClientes(): Promise<ClienteDB[]> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM clientes ORDER BY id_cliente');
    return res.rows as unknown as ClienteDB[];
  }

  static async obtenerClientePorId(idCliente: string): Promise<ClienteDB | null> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM clientes WHERE id_cliente = $1', [idCliente]);
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as ClienteDB;
  }

  static async crearCliente(cliente: ClienteDB): Promise<void> {
    const db = await getDb();
    await db.query(
      `INSERT INTO clientes (id_cliente, nombre_completo, dpi, telefono, municipio, fecha_alta)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id_cliente) DO UPDATE 
       SET nombre_completo = EXCLUDED.nombre_completo,
           dpi = EXCLUDED.dpi,
           telefono = EXCLUDED.telefono,
           municipio = EXCLUDED.municipio;`,
      [cliente.id_cliente, cliente.nombre_completo, cliente.dpi, cliente.telefono, cliente.municipio, cliente.fecha_alta]
    );
  }

  static async desembolsarCredito(credito: Omit<CreditoDB, 'estado'>): Promise<void> {
    const db = await getDb();
    await db.query(
      `INSERT INTO creditos (id_credito, id_cliente, id_asesor, fecha, capital_centavos, plazo_meses, tna_bps, reestructurado, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'desembolsado')
       ON CONFLICT (id_credito) DO NOTHING;`,
      [
        credito.id_credito,
        credito.id_cliente,
        credito.id_asesor,
        credito.fecha,
        credito.capital_centavos,
        credito.plazo_meses,
        credito.tna_bps,
        credito.reestructurado
      ]
    );
  }

  static async obtenerCreditos(): Promise<CreditoDB[]> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM creditos ORDER BY id_credito');
    return res.rows as unknown as CreditoDB[];
  }

  static async obtenerCreditoPorId(idCredito: string): Promise<CreditoDB | null> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM creditos WHERE id_credito = $1', [idCredito]);
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as CreditoDB;
  }

  static async obtenerPagosPorCredito(idCredito: string): Promise<PagoDB[]> {
    const db = await getDb();
    const res = await db.query(
      'SELECT * FROM pagos WHERE id_credito = $1 AND duplicado = false ORDER BY fecha, id_pago',
      [idCredito]
    );
    return res.rows as unknown as PagoDB[];
  }

  static async obtenerTodosLosPagos(): Promise<PagoDB[]> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM pagos ORDER BY fecha, id_pago');
    return res.rows as unknown as PagoDB[];
  }

  static async obtenerEstadoCredito(idCredito: string, fechaCorte: string = '2026-10-31'): Promise<EstadoCreditoCalculado> {
    const credito = await this.obtenerCreditoPorId(idCredito);
    if (!credito) {
      throw new Error(`Crédito no encontrado: ${idCredito}`);
    }
    const cliente = await this.obtenerClientePorId(credito.id_cliente);
    if (!cliente) {
      throw new Error(`Cliente no encontrado para el crédito: ${credito.id_cliente}`);
    }
    const pagos = await this.obtenerPagosPorCredito(idCredito);
    return calcularEstadoCreditoPuro(credito, cliente, pagos, fechaCorte);
  }

  static async explicarMoraCuota(
    idCredito: string,
    numeroCuota: number,
    fechaCorte: string
  ): Promise<{
    idCredito: string;
    numeroCuota: number;
    fechaDesembolso: string;
    fechaVencimiento: string;
    fechaCorte: string;
    diasAtraso: number;
    capitalEnMora: Dinero;
    politica: string;
    tramosRecorridos: Array<{ tramo: string; dias: number; tasaNominalAnual: number; monto: Dinero }>;
    gastosGestion: Dinero;
    totalInteresMoratorio: Dinero;
    totalExigible: Dinero;
  }> {
    const estado = await this.obtenerEstadoCredito(idCredito, fechaCorte);
    const cuota = estado.planAmortizacion.find(c => c.numero === numeroCuota);
    if (!cuota) {
      throw new Error(`Cuota número ${numeroCuota} no existe en el crédito ${idCredito}`);
    }

    const fVenc = cuota.fechaVencimiento;
    const diasAtraso = fVenc < fechaCorte ? diferenciaDias(fVenc, fechaCorte) : 0;
    const capital = cuota.amortizacion;
    const { id: polId, politica } = resolverPolitica(estado.credito.fecha);

    const tramosRecorridos: Array<{ tramo: string; dias: number; tasaNominalAnual: number; monto: Dinero }> = [];

    if (polId === 'POL-2024-01') {
      const montoMora = diasAtraso > 0 ? politica.calcularInteresMoratorio(capital, diasAtraso) : new Dinero('0.00');
      if (diasAtraso > 0) {
        tramosRecorridos.push({
          tramo: 'Mora Plana (24% anual)',
          dias: diasAtraso,
          tasaNominalAnual: 0.24,
          monto: montoMora
        });
      }
    } else {
      const tramosDef = [
        { nombre: 'Mora 1 (1-30 días)', maxDias: 30, tasa: 0.18 },
        { nombre: 'Mora 2 (31-60 días)', maxDias: 60, tasa: 0.24 },
        { nombre: 'Mora 3 (61-90 días)', maxDias: 90, tasa: 0.30 },
        { nombre: 'Vencido (91-120 días)', maxDias: 120, tasa: 0.36 }
      ];

      let diasRestantes = diasAtraso;
      let diasAcumulados = 0;

      for (const t of tramosDef) {
        if (diasRestantes <= 0) break;
        const diasEnEste = Math.min(diasRestantes, t.maxDias - diasAcumulados);
        const factor = new Decimal(capital.valor).times(t.tasa / 360).times(diasEnEste);
        tramosRecorridos.push({
          tramo: t.nombre,
          dias: diasEnEste,
          tasaNominalAnual: t.tasa,
          monto: new Dinero(factor.toFixed(2))
        });
        diasRestantes -= diasEnEste;
        diasAcumulados += diasEnEste;
      }
    }

    const totalMora = diasAtraso > 0 ? politica.calcularInteresMoratorio(capital, diasAtraso) : new Dinero('0.00');
    const gastos = diasAtraso > 0 ? politica.getGastoCobranza(diasAtraso, 'GTQ') : new Dinero('0.00');
    const totalExigible = capital.sumar(cuota.interes).sumar(totalMora).sumar(gastos);

    return {
      idCredito,
      numeroCuota,
      fechaDesembolso: estado.credito.fecha,
      fechaVencimiento: fVenc,
      fechaCorte,
      diasAtraso,
      capitalEnMora: capital,
      politica: polId,
      tramosRecorridos,
      gastosGestion: gastos,
      totalInteresMoratorio: totalMora,
      totalExigible
    };
  }

  static async listarCreditosEnMora(fechaCorte: string = '2026-10-31', filtroTramo?: TramoMora): Promise<Array<{
    idCredito: string;
    cliente: string;
    diasAtraso: number;
    tramo: TramoMora;
    saldoCapital: string;
    cuotaVencida: string;
    totalExigible: string;
  }>> {
    const db = await getDb();
    const resCred = await db.query('SELECT * FROM creditos ORDER BY id_credito');
    const resCli = await db.query('SELECT * FROM clientes');
    const resPag = await db.query('SELECT * FROM pagos WHERE duplicado = false ORDER BY fecha, id_pago');

    const clientesMap = new Map<string, ClienteDB>();
    for (const cli of resCli.rows as unknown as ClienteDB[]) {
      clientesMap.set(cli.id_cliente, cli);
    }

    const pagosPorCredito = new Map<string, PagoDB[]>();
    for (const p of resPag.rows as unknown as PagoDB[]) {
      if (!pagosPorCredito.has(p.id_credito)) {
        pagosPorCredito.set(p.id_credito, []);
      }
      pagosPorCredito.get(p.id_credito)!.push(p);
    }

    const resultado = [];

    for (const c of resCred.rows as unknown as CreditoDB[]) {
      const cli = clientesMap.get(c.id_cliente);
      if (!cli) continue;
      const pagos = pagosPorCredito.get(c.id_credito) || [];
      const estado = calcularEstadoCreditoPuro(c, cli, pagos, fechaCorte);

      if (estado.diasAtrasoMaximo > 0 && !estado.esIncobrable && !estado.estaCancelado) {
        if (!filtroTramo || estado.tramoMaximo === filtroTramo) {
          resultado.push({
            idCredito: c.id_credito,
            cliente: estado.cliente.nombre_completo,
            diasAtraso: estado.diasAtrasoMaximo,
            tramo: estado.tramoMaximo,
            saldoCapital: estado.saldoCapitalActual.valor,
            cuotaVencida: estado.proximaCuota?.numero ? `Cuota ${estado.proximaCuota.numero}` : 'N/A',
            totalExigible: estado.proximaCuota?.totalExigible.valor || '0.00'
          });
        }
      }
    }

    return resultado.sort((a, b) => b.diasAtraso - a.diasAtraso);
  }

  static async obtenerProximosVencimientos(fechaCorte: string = '2026-10-31', diasVentana: number = 30): Promise<{
    fechaCorte: string;
    diasVentana: number;
    totalCuotas: number;
    montoTotalExigible: string;
    cuotas: Array<{
      idCredito: string;
      cliente: string;
      numeroCuota: number;
      fechaVencimiento: string;
      cuotaMonto: string;
    }>;
  }> {
    const db = await getDb();
    const resCred = await db.query('SELECT * FROM creditos ORDER BY id_credito');
    const resCli = await db.query('SELECT * FROM clientes');
    const resPag = await db.query('SELECT * FROM pagos WHERE duplicado = false ORDER BY fecha, id_pago');

    const clientesMap = new Map<string, ClienteDB>();
    for (const cli of resCli.rows as unknown as ClienteDB[]) {
      clientesMap.set(cli.id_cliente, cli);
    }

    const pagosPorCredito = new Map<string, PagoDB[]>();
    for (const p of resPag.rows as unknown as PagoDB[]) {
      if (!pagosPorCredito.has(p.id_credito)) {
        pagosPorCredito.set(p.id_credito, []);
      }
      pagosPorCredito.get(p.id_credito)!.push(p);
    }

    const fechaLimite = new Date(new Date(fechaCorte + 'T00:00:00Z').getTime() + diasVentana * 86400000)
      .toISOString()
      .slice(0, 10);

    const cuotas = [];
    let suma = new Decimal(0);

    for (const c of resCred.rows as unknown as CreditoDB[]) {
      const cli = clientesMap.get(c.id_cliente);
      if (!cli) continue;
      const pagos = pagosPorCredito.get(c.id_credito) || [];
      const estado = calcularEstadoCreditoPuro(c, cli, pagos, fechaCorte);
      if (estado.estaCancelado || estado.esIncobrable) continue;

      for (const p of estado.planAmortizacion) {
        if (p.estado !== 'pagada' && p.fechaVencimiento >= fechaCorte && p.fechaVencimiento <= fechaLimite) {
          cuotas.push({
            idCredito: c.id_credito,
            cliente: estado.cliente.nombre_completo,
            numeroCuota: p.numero,
            fechaVencimiento: p.fechaVencimiento,
            cuotaMonto: p.cuota.valor
          });
          suma = suma.plus(p.cuota.valor);
        }
      }
    }

    return {
      fechaCorte,
      diasVentana,
      totalCuotas: cuotas.length,
      montoTotalExigible: suma.toFixed(2),
      cuotas: cuotas.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
    };
  }

  static async obtenerEstadoCartera(fechaCorte: string = '2026-10-31'): Promise<{
    fechaCorte: string;
    carteraActivaTotal: string;
    carteraEnMora: string;
    porcentajeMora: number;
    carteraEnRiesgo: string;
    porcentajeRiesgo: number;
    desglosePorTramo: Array<{ tramo: string; nombre: string; monto: string; porcentaje: number }>;
    incobrablesPeriodo: { cantidad: number; montoTotal: string; creditos: string[] };
  }> {
    const db = await getDb();
    const resCred = await db.query('SELECT * FROM creditos ORDER BY id_credito');
    const resCli = await db.query('SELECT * FROM clientes');
    const resPag = await db.query('SELECT * FROM pagos WHERE duplicado = false ORDER BY fecha, id_pago');

    const clientesMap = new Map<string, ClienteDB>();
    for (const cli of resCli.rows as unknown as ClienteDB[]) {
      clientesMap.set(cli.id_cliente, cli);
    }

    const pagosPorCredito = new Map<string, PagoDB[]>();
    for (const p of resPag.rows as unknown as PagoDB[]) {
      if (!pagosPorCredito.has(p.id_credito)) {
        pagosPorCredito.set(p.id_credito, []);
      }
      pagosPorCredito.get(p.id_credito)!.push(p);
    }

    let activaTotal = new Decimal(0);
    let moraTotal = new Decimal(0);
    let riesgoTotal = new Decimal(0);

    const montosPorTramo: Record<string, { nombre: string; monto: Decimal }> = {
      [TramoMora.MORA_1]: { nombre: 'Mora 1 (1 a 30 días)', monto: new Decimal(0) },
      [TramoMora.MORA_2]: { nombre: 'Mora 2 (31 a 60 días)', monto: new Decimal(0) },
      [TramoMora.MORA_3]: { nombre: 'Mora 3 (61 a 90 días)', monto: new Decimal(0) },
      [TramoMora.VENCIDO]: { nombre: 'Vencido (91 a 120 días)', monto: new Decimal(0) }
    };

    const incobrables: string[] = [];
    let incobrableTotal = new Decimal(0);

    for (const c of resCred.rows as unknown as CreditoDB[]) {
      const cli = clientesMap.get(c.id_cliente);
      if (!cli) continue;
      const pagos = pagosPorCredito.get(c.id_credito) || [];
      const estado = calcularEstadoCreditoPuro(c, cli, pagos, fechaCorte);

      if (estado.estaCancelado) continue;

      if (estado.esIncobrable) {
        incobrables.push(c.id_credito);
        incobrableTotal = incobrableTotal.plus(estado.saldoCapitalActual.valor);
        continue;
      }

      activaTotal = activaTotal.plus(estado.saldoCapitalActual.valor);

      if (estado.diasAtrasoMaximo > 0) {
        moraTotal = moraTotal.plus(estado.saldoCapitalActual.valor);
        const tramoKey = estado.tramoMaximo;
        if (montosPorTramo[tramoKey]) {
          montosPorTramo[tramoKey].monto = montosPorTramo[tramoKey].monto.plus(estado.saldoCapitalActual.valor);
        }
      }

      if (estado.diasAtrasoMaximo > 30 || c.reestructurado) {
        riesgoTotal = riesgoTotal.plus(estado.saldoCapitalActual.valor);
      }
    }

    const pctMora = activaTotal.isZero() ? 0 : moraTotal.dividedBy(activaTotal).times(100).toNumber();
    const pctRiesgo = activaTotal.isZero() ? 0 : riesgoTotal.dividedBy(activaTotal).times(100).toNumber();

    const desglosePorTramo = Object.entries(montosPorTramo).map(([tramo, info]) => ({
      tramo,
      nombre: info.nombre,
      monto: info.monto.toFixed(2),
      porcentaje: activaTotal.isZero() ? 0 : Number(info.monto.dividedBy(activaTotal).times(100).toFixed(2))
    }));

    return {
      fechaCorte,
      carteraActivaTotal: activaTotal.toFixed(2),
      carteraEnMora: moraTotal.toFixed(2),
      porcentajeMora: Number(pctMora.toFixed(2)),
      carteraEnRiesgo: riesgoTotal.toFixed(2),
      porcentajeRiesgo: Number(pctRiesgo.toFixed(2)),
      desglosePorTramo,
      incobrablesPeriodo: {
        cantidad: incobrables.length,
        montoTotal: incobrableTotal.toFixed(2),
        creditos: incobrables
      }
    };
  }

  static async obtenerCierreDiario(fechaCorte: string = '2026-10-31'): Promise<{
    fecha: string;
    desembolsos: { cantidad: number; totalCapital: string };
    recuperaciones: {
      totalRecaudado: string;
      porConcepto: {
        gastos: string;
        interesMoratorio: string;
        interesCorriente: string;
        capital: string;
      };
      cantidadPagos: number;
    };
  }> {
    const db = await getDb();
    const resDesemb = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(capital_centavos), 0) as total FROM creditos WHERE fecha = $1',
      [fechaCorte]
    );

    const resPagos = await db.query(
      'SELECT * FROM pagos WHERE fecha = $1 AND duplicado = false',
      [fechaCorte]
    );

    let totGastos = new Decimal(0);
    let totMora = new Decimal(0);
    let totInteres = new Decimal(0);
    let totCapital = new Decimal(0);
    let totalRecaudado = new Decimal(0);

    for (const r of resPagos.rows as unknown as PagoDB[]) {
      totGastos = totGastos.plus(new Decimal(r.gastos_centavos || 0).dividedBy(100));
      totMora = totMora.plus(new Decimal(r.mora_centavos || 0).dividedBy(100));
      totInteres = totInteres.plus(new Decimal(r.interes_centavos || 0).dividedBy(100));
      totCapital = totCapital.plus(new Decimal(r.capital_centavos || 0).dividedBy(100));
      totalRecaudado = totalRecaudado.plus(new Decimal(r.monto_centavos).dividedBy(100));
    }

    const countDesemb = Number(resDesemb.rows[0].count);
    const sumDesemb = new Decimal(String(resDesemb.rows[0].total)).dividedBy(100).toFixed(2);

    return {
      fecha: fechaCorte,
      desembolsos: {
        cantidad: countDesemb,
        totalCapital: sumDesemb
      },
      recuperaciones: {
        totalRecaudado: totalRecaudado.toFixed(2),
        porConcepto: {
          gastos: totGastos.toFixed(2),
          interesMoratorio: totMora.toFixed(2),
          interesCorriente: totInteres.toFixed(2),
          capital: totCapital.toFixed(2)
        },
        cantidadPagos: resPagos.rows.length
      }
    };
  }

  static async obtenerCierreMensual(anio: number = 2026, mes: number = 10): Promise<{
    periodo: string;
    desembolsos: { cantidad: number; totalCapital: string };
    recuperaciones: {
      totalRecaudado: string;
      porConcepto: {
        gastos: string;
        interesMoratorio: string;
        interesCorriente: string;
        capital: string;
      };
      cantidadPagos: number;
    };
  }> {
    const mesStr = mes.toString().padStart(2, '0');
    const prefijo = `${anio}-${mesStr}`;

    const db = await getDb();
    const resDesemb = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(capital_centavos), 0) as total 
       FROM creditos WHERE TO_CHAR(fecha, 'YYYY-MM') = $1`,
      [prefijo]
    );

    const resPagos = await db.query(
      `SELECT * FROM pagos WHERE TO_CHAR(fecha, 'YYYY-MM') = $1 AND duplicado = false`,
      [prefijo]
    );

    let totGastos = new Decimal(0);
    let totMora = new Decimal(0);
    let totInteres = new Decimal(0);
    let totCapital = new Decimal(0);
    let totalRecaudado = new Decimal(0);

    for (const r of resPagos.rows as unknown as PagoDB[]) {
      totGastos = totGastos.plus(new Decimal(r.gastos_centavos || 0).dividedBy(100));
      totMora = totMora.plus(new Decimal(r.mora_centavos || 0).dividedBy(100));
      totInteres = totInteres.plus(new Decimal(r.interes_centavos || 0).dividedBy(100));
      totCapital = totCapital.plus(new Decimal(r.capital_centavos || 0).dividedBy(100));
      totalRecaudado = totalRecaudado.plus(new Decimal(r.monto_centavos).dividedBy(100));
    }

    const countDesemb = Number(resDesemb.rows[0].count);
    const sumDesemb = new Decimal(String(resDesemb.rows[0].total)).dividedBy(100).toFixed(2);

    return {
      periodo: prefijo,
      desembolsos: {
        cantidad: countDesemb,
        totalCapital: sumDesemb
      },
      recuperaciones: {
        totalRecaudado: totalRecaudado.toFixed(2),
        porConcepto: {
          gastos: totGastos.toFixed(2),
          interesMoratorio: totMora.toFixed(2),
          interesCorriente: totInteres.toFixed(2),
          capital: totCapital.toFixed(2)
        },
        cantidadPagos: resPagos.rows.length
      }
    };
  }

  static async registrarPagoConPrelacion(params: {
    idCredito: string;
    monto: Dinero;
    fechaPago: string;
    canal: string;
    claveIdempotencia: string;
  }): Promise<{
    exito: boolean;
    claveIdempotencia: string;
    yaProcesado: boolean;
    resultado: ResultadoPago;
    estadoCreditoDespues: EstadoCreditoCalculado;
  }> {
    const db = await getDb();

    const pagoExistente = await db.query(
      'SELECT * FROM pagos WHERE clave_idempotencia = $1',
      [params.claveIdempotencia]
    );

    if (pagoExistente.rows.length > 0) {
      const p = pagoExistente.rows[0] as unknown as PagoDB;
      const estadoActual = await this.obtenerEstadoCredito(params.idCredito, params.fechaPago);
      return {
        exito: true,
        claveIdempotencia: params.claveIdempotencia,
        yaProcesado: true,
        resultado: {
          pagadoGastos: new Dinero(new Decimal(p.gastos_centavos || 0).dividedBy(100).toFixed(2)),
          pagadoInteresMoratorio: new Dinero(new Decimal(p.mora_centavos || 0).dividedBy(100).toFixed(2)),
          pagadoInteresCorriente: new Dinero(new Decimal(p.interes_centavos || 0).dividedBy(100).toFixed(2)),
          pagadoCapital: new Dinero(new Decimal(p.capital_centavos || 0).dividedBy(100).toFixed(2)),
          excedente: new Dinero(new Decimal(p.excedente_centavos || 0).dividedBy(100).toFixed(2))
        },
        estadoCreditoDespues: estadoActual
      };
    }

    const estadoAntes = await this.obtenerEstadoCredito(params.idCredito, params.fechaPago);
    if (estadoAntes.esIncobrable) {
      throw new Error(`El crédito ${params.idCredito} está declarado INCOBRABLE. No admite pagos.`);
    }

    if (!estadoAntes.proximaCuota) {
      throw new Error(`El crédito ${params.idCredito} ya está completamente cancelado.`);
    }

    const totalExigible = estadoAntes.proximaCuota.totalExigible;
    if (!params.monto.esIgual(totalExigible)) {
      throw new Error(
        `Monto no exacto. El monto ingresado fue Q${params.monto.valor}, pero el monto exacto exigible para la cuota ${estadoAntes.proximaCuota.numero} es Q${totalExigible.valor}.`
      );
    }

    const deuda: DeudaCuota = {
      gastos: estadoAntes.proximaCuota.gastos,
      interesMoratorio: estadoAntes.proximaCuota.interesMoratorio,
      interesCorriente: estadoAntes.proximaCuota.interesCorriente,
      capital: estadoAntes.proximaCuota.capital
    };

    const procesador = new ProcesadorDePagos();
    const resultado = procesador.procesar(params.monto, deuda);

    const montoCentavos = Math.round(new Decimal(params.monto.valor).times(100).toNumber());
    const gastosCentavos = Math.round(new Decimal(resultado.pagadoGastos.valor).times(100).toNumber());
    const moraCentavos = Math.round(new Decimal(resultado.pagadoInteresMoratorio.valor).times(100).toNumber());
    const interesCentavos = Math.round(new Decimal(resultado.pagadoInteresCorriente.valor).times(100).toNumber());
    const capitalCentavos = Math.round(new Decimal(resultado.pagadoCapital.valor).times(100).toNumber());
    const excedenteCentavos = Math.round(new Decimal(resultado.excedente.valor).times(100).toNumber());

    await db.query(
      `INSERT INTO pagos (
        clave_idempotencia, id_credito, fecha, monto_centavos, canal,
        gastos_centavos, mora_centavos, interes_centavos, capital_centavos, excedente_centavos, duplicado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
      [
        params.claveIdempotencia,
        params.idCredito,
        params.fechaPago,
        montoCentavos,
        params.canal,
        gastosCentavos,
        moraCentavos,
        interesCentavos,
        capitalCentavos,
        excedenteCentavos
      ]
    );

    const estadoDespues = await this.obtenerEstadoCredito(params.idCredito, params.fechaPago);

    return {
      exito: true,
      claveIdempotencia: params.claveIdempotencia,
      yaProcesado: false,
      resultado,
      estadoCreditoDespues: estadoDespues
    };
  }
}
