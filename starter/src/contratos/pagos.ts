/**
 * pagos.ts — contrato del recurso Pago.   ***VERSIÓN DE TALLER***
 *
 * Caso de uso: RegistrarPago (puerto primario del Proyecto 1).
 * Es el endpoint más delicado del Sistema: mueve dinero, se puede reintentar,
 * y su resultado depende de la prelación de la sección 6.6 del enunciado del P1.
 *
 * El archivo COMPILA y GENERA tal como está, pero el contrato está incompleto.
 * Complete los cinco TODO. Después de cada uno ejecute:
 *     npm run generar && npm run validar
 * y observe cómo cambia openapi.yaml.
 */

import { z } from "zod";
import { CreditoId, Dinero, FechaISO, InstanteISO, MontoDecimal } from "./comunes.ts";

/* ------------------------------------------------------------------ */
/* Petición                                                            */
/* ------------------------------------------------------------------ */

// TODO 1 · Enumere los medios de pago del negocio.
// Pregunta guía: ¿por qué una enumeración cerrada y no un `string` libre?
// ¿Agregar un medio nuevo mañana rompe a los clientes que ya consumen la API?
export const MedioDePago = z
  .enum(["efectivo", "transferencia", "agente_bancario"])
  .meta({ id: "MedioDePago", description: "Canal por el que se recibió el pago" });

// TODO 2 · Complete la petición: monto (Dinero), fechaPago (FechaISO),
// medio (MedioDePago) y una referencia opcional de máximo 40 caracteres.
// Pregunta guía: la fecha del pago, ¿la envía el cliente o la toma el servidor
// de su reloj? Piense en el puerto Reloj del P1 y en pruebas reproducibles.
export const RegistrarPagoRequest = z
  .object({
    monto: Dinero,
    fechaPago: z.string().date(),
    medio: MedioDePago,
    referencia: z.string().max(40).optional()
  })
  .meta({ id: "RegistrarPagoRequest" });

/* ------------------------------------------------------------------ */
/* Respuesta                                                           */
/* ------------------------------------------------------------------ */

// TODO 3 · Devuelva el desglose del pago, rubro por rubro, en el ORDEN DE
// PRELACIÓN (sección 6.6 del enunciado del Proyecto 1).
// Pregunta guía: si la respuesta solo dijera { ok: true }, ¿qué le explica el
// asesor al cliente que abonó Q500 y ve que su saldo casi no bajó?
export const AplicacionDelPago = z
  .object({
    gastos: Dinero,
    interesMoratorio: Dinero,
    interesCorriente: Dinero,
    capital: Dinero,
    excedente: Dinero
  })
  .meta({
    id: "AplicacionDelPago",
    description: "Desglose del pago en el orden de prelación: gastos → moratorio → corriente → capital.",
  });

export const EstadoCredito = z
  .enum(["vigente", "en_mora", "cancelado", "reestructurado", "incobrable"])
  .meta({ id: "EstadoCredito" });

// TODO 4 · Modele el tramo de mora (sección 6.7 del enunciado).
// Recuerde: el ESTADO es en_mora; el TRAMO es una clasificación DERIVADA de los
// días de atraso, y se mueve en ambas direcciones.
export const TramoMora = z
  .enum(["vigente", "mora_1_30", "mora_31_60", "mora_61_90", "incobrable"])
  .meta({ id: "TramoMora", description: "Clasificación derivada de los días de atraso" });

// TODO 5 · Complete la respuesta del pago registrado. Debe permitir que el
// cliente distinga una respuesta nueva de la REPRODUCCIÓN de un pago ya
// registrado con la misma clave de idempotencia.
export const PagoRegistrado = z
  .object({
    pagoId: z.string().meta({ example: "PG-2026-000731" }),
    creditoId: CreditoId,
    recibidoEn: InstanteISO,
    montoRecibido: Dinero,
    aplicacion: AplicacionDelPago,
    saldoCapitalDespues: Dinero,
    estadoCredito: EstadoCredito,
    tramoMora: TramoMora,
    diasAtraso: z.number().int().min(0),
    reproducido: z.boolean().meta({ description: "True si es la respuesta a un reintento, False si es un pago nuevo", example: false })

  })
  .meta({ id: "PagoRegistrado" });
