import { getDb } from '../src/persistencia/db';

async function main() {
  const db = await getDb();
  const queryArg = process.argv.slice(2).join(' ').trim();

  // Si el usuario pasó una consulta SQL directa
  if (queryArg.toUpperCase().startsWith('SELECT') || queryArg.toUpperCase().startsWith('WITH')) {
    console.log(`\n\x1b[36m▶ Ejecutando consulta SQL:\x1b[0m ${queryArg}\n`);
    const res = await db.query(queryArg);
    console.table(res.rows);
    console.log(`\x1b[32m✔ Total de registros devueltos:\x1b[0m ${res.rows.length}\n`);
    return;
  }

  // Si pasó el nombre de una tabla específica
  const tablasValidas = ['clientes', 'creditos', 'pagos', 'asesores', 'documentos_rag', 'politicas', 'carga_metadata'];
  if (tablasValidas.includes(queryArg.toLowerCase())) {
    const tabla = queryArg.toLowerCase();
    console.log(`\n\x1b[36m▶ Registros en la tabla:\x1b[0m ${tabla.toUpperCase()}\n`);
    const res = await db.query(`SELECT * FROM ${tabla} LIMIT 25`);
    console.table(res.rows);
    const countRes = await db.query(`SELECT COUNT(*) as total FROM ${tabla}`);
    console.log(`\x1b[32m✔ Mostrando primeros 25 de un total de ${countRes.rows[0].total} registros.\x1b[0m\n`);
    return;
  }

  // Por defecto: Resumen General de la Base de Datos PGlite
  console.log('\n======================================================');
  console.log('       EXPLORADOR DE BASE DE DATOS CRÉDITO VECINO');
  console.log('               Motor: PGlite (PostgreSQL 16)');
  console.log('======================================================\n');

  const conteos: Array<{ Tabla: string; Registros: number; Descripción: string }> = [];

  for (const t of tablasValidas) {
    try {
      const r = await db.query(`SELECT COUNT(*) as c FROM ${t}`);
      conteos.push({
        Tabla: t,
        Registros: Number(r.rows[0].c),
        Descripción: 
          t === 'clientes' ? 'Expedientes de clientes (DPI, teléfono, municipio)' :
          t === 'creditos' ? 'Contratos de microcrédito otorgados' :
          t === 'pagos' ? 'Cobranza y abonos con prelación legal' :
          t === 'asesores' ? 'Asesores de campo en ruta' :
          t === 'documentos_rag' ? 'Documentos vectorizados para RAG' :
          t === 'politicas' ? 'Políticas versionadas (POL-2024-01 / POL-2026-10)' : 'Huella criptográfica SHA-256'
      });
    } catch {
      // Ignorar si aún no existe
    }
  }

  console.log('\x1b[33m📊 RESUMEN DE TABLAS Y CONTEO DE FILAS:\x1b[0m');
  console.table(conteos);

  console.log('\n\x1b[36m🔍 MUESTRA DE PRIMEROS 5 CLIENTES:\x1b[0m');
  const cliSample = await db.query('SELECT id_cliente, nombre_completo, dpi, municipio, telefono FROM clientes LIMIT 5');
  console.table(cliSample.rows);

  console.log('\n\x1b[36m🔍 MUESTRA DE PRIMEROS 5 CRÉDITOS:\x1b[0m');
  const credSample = await db.query('SELECT id_credito, id_cliente, (capital_centavos/100.0) as capital_gtq, plazo_meses, (tna_bps/100.0) as tna_pct, estado FROM creditos LIMIT 5');
  console.table(credSample.rows);

  console.log('\n\x1b[32m💡 CÓMO USAR ESTE EXPLORADOR:\x1b[0m');
  console.log('  1. Ver una tabla completa:  \x1b[33mnpm run db creditos\x1b[0m (o clientes, pagos, asesores)');
  console.log('  2. Ejecutar un SELECT libre: \x1b[33mnpm run db "SELECT * FROM creditos WHERE id_cliente = \'CL-0060\'"\x1b[0m\n');
}

main().catch(console.error);

