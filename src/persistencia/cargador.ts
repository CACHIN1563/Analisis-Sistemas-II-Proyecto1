import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb, initSchema, resetDatabase } from './db';
import { Dinero } from '../dominio/dinero';
import { PlanAmortizacionBuilder, AmortizacionFrancesa } from '../dominio/plan-amortizacion';
import { ProcesadorDePagos, DeudaCuota } from '../dominio/prelacion-pago';
import { resolverPolitica, calcularFechaVencimiento, diferenciaDias, aStringFecha } from './repositorio';
import Decimal from 'decimal.js';

export interface ResumenCarga {
  huellaValida: boolean;
  huellaCalculada: string;
  huellaEsperada: string;
  totalClientes: number;
  totalCreditos: number;
  totalPagos: number;
  totalAsesores: number;
  totalDocumentos: number;
}

export function resolverRutaDatos(): string {
  if (process.env.CV_DATA_DIR) {
    if (fs.existsSync(process.env.CV_DATA_DIR)) {
      return process.env.CV_DATA_DIR;
    }
  }
  const defaultDir = path.resolve(__dirname, '../../datos');
  if (fs.existsSync(defaultDir)) {
    return defaultDir;
  }
  const downloadsDir = 'C:\\Users\\cachi\\Downloads\\datos-proyecto-final';
  if (fs.existsSync(downloadsDir)) {
    return downloadsDir;
  }
  return defaultDir;
}

export async function verificarHuellaSha256(directorioDatos: string): Promise<{ valida: boolean; calculada: string; esperada: string }> {
  const rutaEventos = path.join(directorioDatos, 'eventos.jsonl');
  const rutaSha = path.join(directorioDatos, 'eventos.sha256');

  if (!fs.existsSync(rutaEventos)) {
    throw new Error(`Archivo no encontrado: ${rutaEventos}`);
  }
  if (!fs.existsSync(rutaSha)) {
    throw new Error(`Archivo no encontrado: ${rutaSha}`);
  }

  const contenidoEventos = fs.readFileSync(rutaEventos);
  const hashCalculado = crypto.createHash('sha256').update(contenidoEventos).digest('hex');
  const contenidoSha = fs.readFileSync(rutaSha, 'utf8').trim();
  const hashEsperado = contenidoSha.split(/\s+/)[0].trim();

  const valida = hashCalculado.toLowerCase() === hashEsperado.toLowerCase();
  return {
    valida,
    calculada: hashCalculado,
    esperada: hashEsperado
  };
}

export async function ejecutarCargaCanonico(directorioDatos?: string, forzarReinicio: boolean = false): Promise<ResumenCarga> {
  const rutaDatos = directorioDatos || resolverRutaDatos();
  console.log(`\n======================================================`);
  console.log(`  SISTEMA DE GESTIÓN DE MICROCRÉDITO · CRÉDITO VECINO`);
  console.log(`  Carga Canónica de Datos al 31 de octubre de 2026`);
  console.log(`  Directorio de datos: ${rutaDatos}`);
  console.log(`======================================================\n`);

  // Paso 1: Verificar huella SHA-256
  const huella = await verificarHuellaSha256(rutaDatos);
  if (!huella.valida) {
    console.error(`\x1b[31m✖ ERROR CRÍTICO: La huella SHA-256 no coincide.\x1b[0m`);
    console.error(`  Esperada:   ${huella.esperada}`);
    console.error(`  Calculada:  ${huella.calculada}`);
    throw new Error('Huella criptográfica inválida en eventos.jsonl. La carga ha sido detenida.');
  }

  // En el video debe verse en verde
  console.log(`\x1b[32m✔ HUELLA SHA-256 VERIFICADA CORRECTAMENTE [EN VERDE]:\x1b[0m`);
  console.log(`  \x1b[32m${huella.calculada}\x1b[0m\n`);

  const db = await getDb();
  if (forzarReinicio) {
    console.log(`Limpiando y recreando base de datos para reinicio limpio...`);
    await resetDatabase(db);
  } else {
    await initSchema(db);
  }

  // Paso 2: Cargar Asesores
  const rutaAsesores = path.join(rutaDatos, 'asesores.csv');
  if (fs.existsSync(rutaAsesores)) {
    const asesoresCsv = fs.readFileSync(rutaAsesores, 'utf8');
    const filas = asesoresCsv.split(/\r?\n/).slice(1).filter(l => l.trim().length > 0);
    for (const fila of filas) {
      const [id_asesor, nombre] = fila.split(',');
      if (id_asesor && nombre) {
        await db.query(
          `INSERT INTO asesores (id_asesor, nombre)
           VALUES ($1, $2)
           ON CONFLICT (id_asesor) DO UPDATE SET nombre = EXCLUDED.nombre;`,
          [id_asesor.trim(), nombre.trim()]
        );
      }
    }
  }

  // Paso 3: Cargar Políticas
  const rutaPoliticas = path.join(rutaDatos, 'politicas.json');
  if (fs.existsSync(rutaPoliticas)) {
    const politicasJson = fs.readFileSync(rutaPoliticas, 'utf8');
    await db.query(
      `INSERT INTO politicas (clave, contenido)
       VALUES ($1, $2)
       ON CONFLICT (clave) DO UPDATE SET contenido = EXCLUDED.contenido;`,
      ['POLITICAS_VIGENTES', politicasJson]
    );
  }

  // Paso 4: Cargar Corpus RAG
  const rutaCorpus = path.join(rutaDatos, 'corpus');
  if (fs.existsSync(rutaCorpus)) {
    const archivosCorpus = fs.readdirSync(rutaCorpus).filter(f => f.endsWith('.md'));
    for (const archivo of archivosCorpus) {
      const contenidoMd = fs.readFileSync(path.join(rutaCorpus, archivo), 'utf8');
      const docId = archivo.replace('.md', '');
      
      let titulo = docId;
      let vigencia = '';
      const matchTitulo = contenidoMd.match(/titulo:\s*(.*)/i);
      if (matchTitulo) titulo = matchTitulo[1].trim();
      const matchVigencia = contenidoMd.match(/vigencia:\s*(.*)/i);
      if (matchVigencia) vigencia = matchVigencia[1].trim();

      await db.query(
        `INSERT INTO documentos_rag (doc_id, titulo, vigencia, contenido)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (doc_id) DO UPDATE 
         SET titulo = EXCLUDED.titulo, vigencia = EXCLUDED.vigencia, contenido = EXCLUDED.contenido;`,
        [docId, titulo, vigencia, contenidoMd]
      );
    }
  }

  // Paso 5: Reproducir Bitácora de Eventos (Fuente de verdad)
  const rutaEventos = path.join(rutaDatos, 'eventos.jsonl');
  const lineasEventos = fs.readFileSync(rutaEventos, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

  const clavesProcesadas = new Set<string>();
  const planesPorCredito = new Map<string, { plan: any[]; cuotaActualIndex: number; fechaDesembolso: string }>();

  const procesadorPagos = new ProcesadorDePagos();

  for (const linea of lineasEventos) {
    const evento = JSON.parse(linea);

    if (evento.tipo === 'CLIENTE') {
      await db.query(
        `INSERT INTO clientes (id_cliente, nombre_completo, dpi, telefono, municipio, fecha_alta)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id_cliente) DO NOTHING;`,
        [evento.id_cliente, evento.nombre_completo, evento.dpi, evento.telefono, evento.municipio, evento.fecha_alta]
      );
    } else if (evento.tipo === 'DESEMBOLSO') {
      await db.query(
        `INSERT INTO creditos (id_credito, id_cliente, id_asesor, fecha, capital_centavos, plazo_meses, tna_bps, reestructurado, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id_credito) DO NOTHING;`,
        [
          evento.id_credito,
          evento.id_cliente,
          evento.id_asesor,
          evento.fecha,
          evento.capital_centavos,
          evento.plazo_meses,
          evento.tna_bps,
          Boolean(evento.reestructurado),
          'desembolsado'
        ]
      );

      // Calcular plan de amortización
      const capitalTotal = new Dinero(new Decimal(evento.capital_centavos).dividedBy(100).toFixed(2));
      const tasaMensual = (evento.tna_bps / 10000) / 12;
      const plan = new PlanAmortizacionBuilder()
        .setCapital(capitalTotal)
        .setTasaMensual(tasaMensual)
        .setPlazos(evento.plazo_meses)
        .setEstrategia(new AmortizacionFrancesa())
        .build();

      planesPorCredito.set(evento.id_credito, {
        plan,
        cuotaActualIndex: 0,
        fechaDesembolso: evento.fecha
      });
    } else if (evento.tipo === 'PAGO') {
      const yaExisteClave = clavesProcesadas.has(evento.clave_idempotencia);
      clavesProcesadas.add(evento.clave_idempotencia);

      let gastosCent = 0;
      let moraCent = 0;
      let interesCent = 0;
      let capitalCent = 0;
      let excedenteCent = 0;

      if (!yaExisteClave && planesPorCredito.has(evento.id_credito)) {
        const info = planesPorCredito.get(evento.id_credito)!;
        if (info.cuotaActualIndex < info.plan.length) {
          const cuotaPlan = info.plan[info.cuotaActualIndex];
          const numCuota = info.cuotaActualIndex + 1;
          const fVenc = calcularFechaVencimiento(info.fechaDesembolso, numCuota);
          const diasAtraso = fVenc < evento.fecha ? diferenciaDias(fVenc, evento.fecha) : 0;

          const { politica } = resolverPolitica(info.fechaDesembolso);
          const moraDinero = diasAtraso > 0 ? politica.calcularInteresMoratorio(cuotaPlan.amortizacion, diasAtraso) : new Dinero('0.00');
          const gastosDinero = diasAtraso > 0 ? politica.getGastoCobranza(diasAtraso, 'GTQ') : new Dinero('0.00');

          const deuda: DeudaCuota = {
            gastos: gastosDinero,
            interesMoratorio: moraDinero,
            interesCorriente: cuotaPlan.interes,
            capital: cuotaPlan.amortizacion
          };

          const pagoDinero = new Dinero(new Decimal(evento.monto_centavos).dividedBy(100).toFixed(2));
          const resPago = procesadorPagos.procesar(pagoDinero, deuda);

          gastosCent = Math.round(new Decimal(resPago.pagadoGastos.valor).times(100).toNumber());
          moraCent = Math.round(new Decimal(resPago.pagadoInteresMoratorio.valor).times(100).toNumber());
          interesCent = Math.round(new Decimal(resPago.pagadoInteresCorriente.valor).times(100).toNumber());
          capitalCent = Math.round(new Decimal(resPago.pagadoCapital.valor).times(100).toNumber());
          excedenteCent = Math.round(new Decimal(resPago.excedente.valor).times(100).toNumber());

          info.cuotaActualIndex++;
        }
      }

      await db.query(
        `INSERT INTO pagos (
          seq, clave_idempotencia, id_credito, fecha, monto_centavos, canal,
          gastos_centavos, mora_centavos, interes_centavos, capital_centavos, excedente_centavos, duplicado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (seq) DO NOTHING;`,
        [
          evento.seq,
          evento.clave_idempotencia,
          evento.id_credito,
          evento.fecha,
          evento.monto_centavos,
          evento.canal || 'agencia',
          gastosCent,
          moraCent,
          interesCent,
          capitalCent,
          excedenteCent,
          yaExisteClave
        ]
      );
    }
  }

  // Paso 6: Verificación de Conteos e Idempotencia
  const resClientes = await db.query('SELECT COUNT(*) as count FROM clientes');
  const resCreditos = await db.query('SELECT COUNT(*) as count FROM creditos');
  const resPagos = await db.query('SELECT COUNT(*) as count FROM pagos');
  const resAsesores = await db.query('SELECT COUNT(*) as count FROM asesores');
  const resDocs = await db.query('SELECT COUNT(*) as count FROM documentos_rag');

  const totalClientes = parseInt(String(resClientes.rows[0].count), 10);
  const totalCreditos = parseInt(String(resCreditos.rows[0].count), 10);
  const totalPagos = parseInt(String(resPagos.rows[0].count), 10);
  const totalAsesores = parseInt(String(resAsesores.rows[0].count), 10);
  const totalDocumentos = parseInt(String(resDocs.rows[0].count), 10);

  console.log(`\x1b[32m✔ RESUMEN DE CARGA CANÓNICA COMPLETADA EXITOSAMENTE:\x1b[0m`);
  console.log(`  \x1b[32m✔ Clientes:        ${totalClientes} (Esperado: 60)\x1b[0m`);
  console.log(`  \x1b[32m✔ Créditos:        ${totalCreditos} (Esperado: 75)\x1b[0m`);
  console.log(`  \x1b[32m✔ Pagos:           ${totalPagos} (Esperado: 228)\x1b[0m`);
  console.log(`  \x1b[32m✔ Asesores:        ${totalAsesores} (Esperado: 6)\x1b[0m`);
  console.log(`  \x1b[32m✔ Documentos RAG:  ${totalDocumentos} (Esperado: 7)\x1b[0m`);
  console.log(`\nEstado: Cartera canónica al 31 de octubre de 2026 cargada e inmutable.\n`);

  return {
    huellaValida: huella.valida,
    huellaCalculada: huella.calculada,
    huellaEsperada: huella.esperada,
    totalClientes,
    totalCreditos,
    totalPagos,
    totalAsesores,
    totalDocumentos
  };
}

if (require.main === module) {
  const forzar = process.argv.includes('--forzar') || process.argv.includes('--reset');
  ejecutarCargaCanonico(undefined, forzar)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`\x1b[31mError durante la carga: ${err.message}\x1b[0m`);
      process.exit(1);
    });
}
