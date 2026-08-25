/**
 * cartera.ts — contrato del recurso Cartera en riesgo.   ***VERSIÓN DE TALLER***
 *
 * Caso de uso: ConsultarCarteraEnRiesgo (puerto primario del Proyecto 1).
 * Es una consulta: GET, seguro e idempotente por definición del método (RFC 9110).
 */

import { z } from "zod";
import { Dinero, FechaISO } from "./comunes.ts";

export const TramoCartera = z.object({
  tramo: z.enum(["mora_1", "mora_2", "mora_3", "vencido"]),
  creditos: z.int().min(0).meta({ example: 3 }),
  saldoCapital: Dinero,
});

// TODO 6 · Los parámetros de consulta.
// Pregunta guía: ¿la fecha de corte debe ser obligatoria u opcional con valor
// "hoy" por omisión? ¿Qué pasa con la reproducibilidad de una auditoría si el
// servidor decide la fecha?
export const CarteraEnRiesgoQuery = z
  .object({
    fechaCorte: FechaISO,
    // … complete: incluirReestructurados …
  })
  .meta({ id: "CarteraEnRiesgoQuery" });

// TODO 7 · La respuesta del indicador.
// Pregunta guía: ¿qué segundo dato es OBLIGATORIO devolver junto al porcentaje
// para que la gerencia no decida sobre una ilusión? (sección 6.8 del enunciado).
export const CarteraEnRiesgoResponse = z
  .object({
    fechaCorte: FechaISO,
    carteraActiva: Dinero,
    saldoEnRiesgo: Dinero,
    porcentajeEnRiesgo: z.number().min(0).max(1).meta({ example: 0.07 }),
    // … complete: dadoPorIncobrableEnElPeriodo, porTramo …
  })
  .meta({ id: "CarteraEnRiesgoResponse" });
