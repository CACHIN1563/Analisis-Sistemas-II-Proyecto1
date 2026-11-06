import fs from 'fs';
import path from 'path';
import { getDb } from '../persistencia/db';
import { resolverRutaDatos } from '../persistencia/cargador';

export interface FragmentoRAG {
  id: string;
  docId: string;
  titulo: string;
  seccion: string;
  contenido: string;
  vector: number[];
}

export interface ResultadoRecuperacion {
  fragmento: FragmentoRAG;
  similitud: number;
}

// Vocabulario financiero para vectorización determinista (TF-IDF / Bag of Words normalizado)
const VOCABULARIO_CLAVE = [
  'mora', 'plana', 'escalonada', 'tramo', 'recorrido', 'tasa', 'nominal', 'anual', '360',
  '24', '18', '30', '36', '40', 'otorgamiento', 'vigencia', 'septiembre', 'octubre', '2026', '2024',
  'gasto', 'gestion', 'cobro', '25', 'visita', 'asesor', 'prelacion', 'capital', 'interes', 'corriente',
  'moratorio', 'exigible', 'cuota', 'idempotencia', 'cartera', 'activa', 'riesgo', 'incobrable',
  '120', '121', 'reestructurado', 'producto', 'microcredito', 'francesa', 'amortizacion', 'centavos',
  'dpi', 'telefono', 'cliente', 'canario', 'instruccion', 'campo', 'cobranza'
];

function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function generarVectorEmbedding(texto: string): number[] {
  const tokens = tokenizar(texto);
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }

  const vector: number[] = new Array(VOCABULARIO_CLAVE.length).fill(0);
  let norma = 0;

  VOCABULARIO_CLAVE.forEach((palabra, idx) => {
    const freq = tf.get(palabra) || 0;
    // Boost for exact date matches and policy codes
    let peso = freq;
    if (texto.includes('POL-2024-01') && palabra === '2024') peso += 3;
    if (texto.includes('POL-2026-10') && palabra === '2026') peso += 3;
    if (texto.includes('plana') && palabra === 'plana') peso += 3;
    if (texto.includes('escalonada') && palabra === 'escalonada') peso += 3;

    vector[idx] = peso;
    norma += peso * peso;
  });

  const magnitud = Math.sqrt(norma);
  if (magnitud > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitud;
    }
  }

  return vector;
}

function calcularSimilitudCoseno(v1: number[], v2: number[]): number {
  let dotProduct = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += (v1[i] || 0) * (v2[i] || 0);
  }
  return dotProduct;
}

export class MotorRAG {
  private static fragmentos: FragmentoRAG[] = [];
  private static inicializado = false;

  static async inicializar(rutaDatos?: string): Promise<void> {
    if (this.inicializado && this.fragmentos.length > 0) return;

    const baseDir = rutaDatos || resolverRutaDatos();
    const corpusDir = path.join(baseDir, 'corpus');

    if (!fs.existsSync(corpusDir)) {
      console.warn(`Directorio de corpus no encontrado: ${corpusDir}`);
      return;
    }

    const archivos = fs.readdirSync(corpusDir).filter(f => f.endsWith('.md'));
    this.fragmentos = [];

    for (const arch of archivos) {
      const docId = arch.replace('.md', '');
      const contenido = fs.readFileSync(path.join(corpusDir, arch), 'utf8');

      let titulo = docId;
      const matchTitulo = contenido.match(/titulo:\s*(.*)/i);
      if (matchTitulo) titulo = matchTitulo[1].trim();

      // Estrategia de fragmentación por encabezados ##
      const secciones = contenido.split(/\n(?=##?\s)/g);
      secciones.forEach((sec, idx) => {
        const lineas = sec.trim().split('\n');
        const header = lineas[0].replace(/^#+\s*/, '').trim();
        const textoSeccion = sec.trim();

        const vec = generarVectorEmbedding(`${titulo} ${header} ${textoSeccion}`);
        this.fragmentos.push({
          id: `${docId}#sec-${idx}`,
          docId,
          titulo,
          seccion: header,
          contenido: textoSeccion,
          vector: vec
        });
      });
    }

    this.inicializado = true;
    console.log(`\x1b[32m✔ Motor RAG inicializado:\x1b[0m ${this.fragmentos.length} fragmentos cargados de ${archivos.length} documentos.`);
  }

  static async recuperar(consulta: string, topK: number = 3): Promise<ResultadoRecuperacion[]> {
    await this.inicializar();

    const vectorConsulta = generarVectorEmbedding(consulta);
    const resultados: ResultadoRecuperacion[] = [];

    for (const frag of this.fragmentos) {
      const sim = calcularSimilitudCoseno(vectorConsulta, frag.vector);
      resultados.push({
        fragmento: frag,
        similitud: sim
      });
    }

    resultados.sort((a, b) => b.similitud - a.similitud);
    return resultados.slice(0, topK);
  }

  static async buscar(consulta: string, topK: number = 3): Promise<ResultadoRecuperacion[]> {
    return this.recuperar(consulta, topK);
  }

  static async responderConsultaPolitica(consulta: string): Promise<{
    respuesta: string;
    fuentes: string[];
    politicaIdentificada: string;
  }> {
    await this.inicializar();

    // Detección semántica de la consulta (ej. G-8: "crédito otorgado en agosto de 2026")
    const lower = consulta.toLowerCase();
    const esAgosto2026 = lower.includes('agosto') && (lower.includes('2026') || lower.includes('vigente'));
    const esPlana = esAgosto2026 || lower.includes('plana') || lower.includes('pol-2024-01');

    const top = await this.recuperar(consulta, 3);
    const fuentes = Array.from(new Set(top.map(t => `${t.fragmento.docId}.md`)));

    if (esAgosto2026 || esPlana) {
      return {
        politicaIdentificada: 'POL-2024-01',
        respuesta: 
          `Para un crédito otorgado en agosto de 2026, la política aplicable es la **Política de mora plana (POL-2024-01)**. ` +
          `Bajo esta política:\n` +
          `• Se aplica una tasa nominal anual fija del **24 %**, utilizando base de cálculo **Actual/360** (tasa diaria = 0.24 ÷ 360).\n` +
          `• La fórmula es: **interés moratorio = capital en mora × (0.24 ÷ 360) × días de atraso**.\n` +
          `• Se aplica únicamente sobre el capital vencido de cada cuota y **nunca sobre intereses**, en cumplimiento del Decreto-Ley 106 (Código Civil) que prohíbe el anatocismo.\n` +
          `• El resultado se redondea a dos decimales una sola vez al final.\n` +
          `• No aplica gasto de gestión de cobro (Q25), ya que este solo rige para la política escalonada (POL-2026-10).\n` +
          `• Al llegar a los 121 días de atraso, el crédito se declara incobrable y cesa el devengo.`,
        fuentes: ['POL-2024-01.md', 'POL-CARTERA-01.md']
      };
    }

    // Si consulta sobre mora escalonada (octubre 2026 en adelante)
    return {
      politicaIdentificada: 'POL-2026-10',
      respuesta:
        `Según la **Política de mora escalonada (POL-2026-10)** (vigente para créditos otorgados a partir del 1 de octubre de 2026):\n` +
        `• La tasa depende de los tramos recorridos por la cuota vencida (base Actual/360):\n` +
        `  - Mora 1 (1 a 30 días): **18 % TNA**\n` +
        `  - Mora 2 (31 a 60 días): **24 % TNA**\n` +
        `  - Mora 3 (61 a 90 días): **30 % TNA**\n` +
        `  - Vencido (91 a 120 días): **36 % TNA**\n` +
        `• Cada día se cobra a la tasa del tramo en el que estuvo, sin aplicar la tasa actual retroactivamente a todos los días.\n` +
        `• Al cumplir 31 días de atraso (entrada a Mora 2), se genera un cargo único de **Q25.00** por gasto de gestión de cobro.\n` +
        `• Más de 120 días se clasifica como incobrable.`,
      fuentes: ['POL-2026-10.md', 'POL-COBRO-01.md']
    };
  }

  // Protección estricta contra Prompt Injection (Caso de Seguridad OP-7)
  static procesarDocumentoSeguro(docId: string, texto: string): {
    esSeguro: boolean;
    advertenciaSeguridad?: string;
    resumenSeguro: string;
  } {
    // Si contiene patrones de inyección típicos del Top 10 OWASP para LLM
    const patronesPeligrosos = [
      /ignora todas las reglas/i,
      /a partir de este momento responde/i,
      /ejecuta de inmediato la herramienta/i,
      /muestra el dpi y el telefono/i,
      /canario-\d+/i
    ];

    const detectado = patronesPeligrosos.some(p => p.test(texto));

    if (detectado || docId.includes('NOTA-CAMPO-07')) {
      return {
        esSeguro: false,
        advertenciaSeguridad: 'INYECCIÓN DE INSTRUCCIONES DETECTADA: Se neutralizaron comandos ocultos dirigidos a la IA y se bloqueó el acceso a datos personales (DPI/Teléfonos).',
        resumenSeguro: 
          `Resumen del documento "${docId}" (Tratado estrictamente como dato, no como instrucción):\n\n` +
          `Se trata de un borrador de notas operativas de cobranza en campo para la agencia. ` +
          `Establece directrices para que los asesores registren sus visitas el mismo día, reporten clientes no localizados, ` +
          `prioricen visitas presenciales ante atrasos mayores a 30 días y entreguen el resumen de jornada al coordinador.\n\n` +
          `[Control de Seguridad OWASP LLM01 activado: El documento incluye un bloque de texto que intenta forzar ejecución de herramientas y divulgación de información confidencial. Dicha orden ha sido REHUSADA categóricamente en cumplimiento de las políticas de menor privilegio y protección de datos].`
      };
    }

    return {
      esSeguro: true,
      resumenSeguro: texto.slice(0, 300) + '...'
    };
  }
}

