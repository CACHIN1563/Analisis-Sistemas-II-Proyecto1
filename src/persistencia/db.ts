import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';

let pgliteInstance: PGlite | null = null;

export function getDatabasePath(): string {
  if (process.env.CV_DB_PATH) {
    return process.env.CV_DB_PATH;
  }
  const dbDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
}

export async function getDb(): Promise<PGlite> {
  if (!pgliteInstance) {
    const dbPath = getDatabasePath();
    pgliteInstance = new PGlite(dbPath);
    await initSchema(pgliteInstance);
  }
  return pgliteInstance;
}

export async function initSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id_cliente VARCHAR(50) PRIMARY KEY,
      nombre_completo VARCHAR(255) NOT NULL,
      dpi VARCHAR(50) NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      municipio VARCHAR(100) NOT NULL,
      fecha_alta DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asesores (
      id_asesor VARCHAR(50) PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      telefono VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS creditos (
      id_credito VARCHAR(50) PRIMARY KEY,
      id_cliente VARCHAR(50) NOT NULL REFERENCES clientes(id_cliente),
      id_asesor VARCHAR(50) NOT NULL,
      fecha DATE NOT NULL,
      capital_centavos BIGINT NOT NULL,
      plazo_meses INT NOT NULL,
      tna_bps INT NOT NULL,
      reestructurado BOOLEAN NOT NULL DEFAULT FALSE,
      estado VARCHAR(50) NOT NULL DEFAULT 'desembolsado'
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id_pago SERIAL PRIMARY KEY,
      seq INT UNIQUE,
      clave_idempotencia VARCHAR(100) NOT NULL,
      id_credito VARCHAR(50) NOT NULL REFERENCES creditos(id_credito),
      fecha DATE NOT NULL,
      monto_centavos BIGINT NOT NULL,
      canal VARCHAR(50) NOT NULL,
      gastos_centavos BIGINT NOT NULL DEFAULT 0,
      mora_centavos BIGINT NOT NULL DEFAULT 0,
      interes_centavos BIGINT NOT NULL DEFAULT 0,
      capital_centavos BIGINT NOT NULL DEFAULT 0,
      excedente_centavos BIGINT NOT NULL DEFAULT 0,
      duplicado BOOLEAN NOT NULL DEFAULT FALSE,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE pagos ADD COLUMN IF NOT EXISTS seq INT;
    ALTER TABLE pagos ADD COLUMN IF NOT EXISTS duplicado BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS politicas (
      clave VARCHAR(100) PRIMARY KEY,
      contenido TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documentos_rag (
      doc_id VARCHAR(100) PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      vigencia VARCHAR(100),
      contenido TEXT NOT NULL,
      metadata TEXT,
      embedding TEXT
    );

    CREATE TABLE IF NOT EXISTS carga_metadata (
      clave VARCHAR(50) PRIMARY KEY,
      valor VARCHAR(255) NOT NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function resetDatabase(db: PGlite): Promise<void> {
  await db.exec(`
    DROP TABLE IF EXISTS pagos CASCADE;
    DROP TABLE IF EXISTS creditos CASCADE;
    DROP TABLE IF EXISTS clientes CASCADE;
    DROP TABLE IF EXISTS asesores CASCADE;
    DROP TABLE IF EXISTS politicas CASCADE;
    DROP TABLE IF EXISTS documentos_rag CASCADE;
    DROP TABLE IF EXISTS carga_metadata CASCADE;
  `);
  await initSchema(db);
}

export async function closeDb(): Promise<void> {
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
}
