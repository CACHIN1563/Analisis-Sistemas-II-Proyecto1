/**
 * Crédito Vecino, S. A. — Sistema de Gestión de Microcrédito (SGMC)
 * Semana 6 · Taller de diseño de APIs y contratos
 *
 * comunes.ts — piezas del contrato que se reutilizan en todos los recursos.
 *
 * Regla del curso: el esquema Zod es la ÚNICA fuente de verdad del contrato.
 * De aquí salen (1) la validación en tiempo de ejecución, (2) los tipos de
 * TypeScript y (3) el documento OpenAPI. Nunca se escriben por separado.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 1. Dinero en el contrato                                            */
/* ------------------------------------------------------------------ */

/**
 * Un importe monetario NUNCA viaja como número JSON.
 * JSON no distingue enteros de flotantes y el parser del cliente lo convertirá
 * a un double IEEE-754: 1004.62 deja de ser 1004.62.
 * Convención del Sistema: cadena decimal de punto fijo con 2 decimales
 * exactos, más el código de moneda ISO 4217.
 */
export const MontoDecimal = z
  .string()
  .regex(/^-?\d{1,13}\.\d{2}$/, "Debe ser decimal de punto fijo con 2 decimales, p. ej. '1004.62'")
  .meta({ description: "Importe como cadena decimal con 2 decimales exactos", example: "1004.62" });

export const Moneda = z
  .literal("GTQ")
  .meta({ description: "Código ISO 4217. El Sistema opera únicamente en quetzales.", example: "GTQ" });

export const Dinero = z
  .object({
    valor: MontoDecimal,
    moneda: Moneda,
  })
  .meta({
    id: "Dinero",
    description:
      "Objeto de Valor monetario. La representación en el contrato es de cadena; internamente el núcleo usa decimal.js o centavos enteros.",
  });

/* ------------------------------------------------------------------ */
/* 2. Fechas                                                           */
/* ------------------------------------------------------------------ */

export const FechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD (RFC 3339, perfil de fecha completa)")
  .meta({ description: "Fecha calendario en formato AAAA-MM-DD", example: "2026-08-22" });

export const InstanteISO = z
  .string()
  .meta({ description: "Instante en formato RFC 3339 con zona horaria", example: "2026-08-22T09:15:00-06:00" });

/* ------------------------------------------------------------------ */
/* 3. Identificadores                                                  */
/* ------------------------------------------------------------------ */

export const CreditoId = z
  .string()
  .regex(/^C-\d{3,8}$/)
  .meta({ description: "Identificador del crédito", example: "C-004" });

export const IdempotencyKey = z
  .uuid()
  .meta({
    description:
      "Clave de idempotencia generada por el cliente (UUID v4). Reintentar el mismo pago con la misma clave no debe cobrar dos veces.",
    example: "5b0b9e2e-6a1f-4a5c-9c1e-0d6d1a1f0b3a",
  });

/* ------------------------------------------------------------------ */
/* 4. Errores — RFC 9457 (Problem Details for HTTP APIs)               */
/* ------------------------------------------------------------------ */

/**
 * RFC 9457 obsoleta a la RFC 7807. Media type: application/problem+json.
 * Campos estándar: type, title, status, detail, instance. Todo lo demás es
 * una "extensión" del problema: aquí agregamos `errores` para la validación
 * campo por campo y `traceId` para poder rastrear el caso en los logs.
 */
export const ErrorDeCampo = z.object({
  campo: z.string().meta({ example: "monto.valor" }),
  mensaje: z.string().meta({ example: "Debe ser decimal de punto fijo con 2 decimales" }),
});

export const ProblemDetails = z
  .object({
    type: z
      .url()
      .meta({
        description: "URI que identifica el TIPO de problema. Es el identificador estable, no el mensaje.",
        example: "https://api.creditovecino.gt/problemas/clave-idempotencia-reutilizada",
      }),
    title: z.string().meta({ example: "Clave de idempotencia reutilizada con otro contenido" }),
    status: z.int().min(400).max(599).meta({ example: 409 }),
    detail: z
      .string()
      .optional()
      .meta({
        description: "Explicación específica de ESTA ocurrencia. Nunca debe incluir datos sensibles de otro cliente.",
        example: "La clave 5b0b9e2e… se usó antes con un monto distinto.",
      }),
    instance: z
      .string()
      .optional()
      .meta({ description: "URI de la ocurrencia concreta", example: "/creditos/C-004/pagos" }),
    traceId: z.string().optional().meta({ example: "01J9Z4T8Q2" }),
    errores: z.array(ErrorDeCampo).optional(),
  })
  .meta({
    id: "ProblemDetails",
    description: "Cuerpo de error uniforme del Sistema, conforme a la RFC 9457 (application/problem+json).",
  });

/* ------------------------------------------------------------------ */
/* 5. Paginación                                                       */
/* ------------------------------------------------------------------ */

export const Paginacion = z
  .object({
    limite: z.int().min(1).max(200).default(50),
    cursor: z.string().optional().meta({ description: "Cursor opaco devuelto por la página anterior" }),
  })
  .meta({ id: "Paginacion" });
