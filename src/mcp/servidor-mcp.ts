import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { RepositorioCredito } from '../persistencia/repositorio';
import { TramoMora } from '../dominio/calculadora-mora';
import { Dinero } from '../dominio/dinero';

export const EsquemasHerramientas = {
  consultar_credito: z.object({
    id_credito: z.string().describe('ID del crédito (ej. CV-2026-0030)'),
    fecha_corte: z.string().default('2026-10-31').describe('Fecha de corte en formato YYYY-MM-DD')
  }),

  calcular_deuda_cuota: z.object({
    id_credito: z.string().describe('ID del crédito (ej. CV-2026-0043)'),
    numero_cuota: z.number().int().positive().optional().describe('Número de cuota (opcional, por defecto la próxima cuota pendiente)'),
    fecha_corte: z.string().default('2026-10-31').describe('Fecha de corte en formato YYYY-MM-DD')
  }),

  explicar_mora: z.object({
    id_credito: z.string().describe('ID del crédito (ej. CV-2026-0030 o CV-2026-0410)'),
    numero_cuota: z.number().int().positive().describe('Número de cuota a evaluar'),
    fecha_corte: z.string().describe('Fecha de corte (YYYY-MM-DD), permite fechas futuras')
  }),

  listar_creditos_mora: z.object({
    fecha_corte: z.string().default('2026-10-31').describe('Fecha de corte en formato YYYY-MM-DD'),
    tramo: z.enum([
      'Mora 1 (1-30 días)',
      'Mora 2 (31-60 días)',
      'Mora 3 (61-90 días)',
      'Vencido (91-120 días)'
    ]).optional().describe('Filtro opcional por tramo de mora')
  }),

  ver_proximos_vencimientos: z.object({
    fecha_corte: z.string().default('2026-10-31').describe('Fecha de inicio del conteo (YYYY-MM-DD)'),
    dias_ventana: z.number().int().positive().default(30).describe('Ventana de días hacia adelante (ej. 7 o 30)')
  }),

  consultar_cartera: z.object({
    fecha_corte: z.string().default('2026-10-31').describe('Fecha de corte de los indicadores (YYYY-MM-DD)')
  }),

  consultar_cierre: z.object({
    tipo: z.enum(['diario', 'mensual']).describe('Tipo de cierre a consultar'),
    fecha: z.string().optional().describe('Fecha para cierre diario (YYYY-MM-DD, ej. 2026-10-31)'),
    anio: z.number().int().optional().describe('Año para cierre mensual (ej. 2026)'),
    mes: z.number().int().min(1).max(12).optional().describe('Mes para cierre mensual (1-12, ej. 10)')
  }),

  registrar_pago: z.object({
    id_credito: z.string().describe('ID del crédito a pagar (ej. CV-2026-0043)'),
    monto: z.string().describe('Monto a pagar en Quetzales (ej. 636.87)'),
    fecha_pago: z.string().default('2026-10-31').describe('Fecha de la transacción (YYYY-MM-DD)'),
    canal: z.enum(['agencia', 'campo', 'transferencia']).default('agencia').describe('Canal de recaudación'),
    clave_idempotencia: z.string().describe('Clave única de idempotencia generada por el cliente'),
    aprobacion_humana_confirmada: z.boolean().default(false).describe('Flag obligatorio de confirmación humana previa')
  })
};

export class ServidorMCPCreditoVecino {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'servidor-mcp-credito-vecino',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.configurarHerramientas();
  }

  private configurarHerramientas() {
    // 1. Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'consultar_credito',
            description: 'Devuelve estado, saldo, días de atraso, tramo, cuotas pagadas y vencidas, y próxima cuota de un crédito.',
            inputSchema: {
              type: 'object',
              properties: {
                id_credito: { type: 'string', description: 'ID del crédito' },
                fecha_corte: { type: 'string', description: 'Fecha de corte (YYYY-MM-DD)' }
              },
              required: ['id_credito']
            }
          },
          {
            name: 'calcular_deuda_cuota',
            description: 'Calcula el desglose exigible de una cuota: gastos, mora, interés corriente, capital y total exigible.',
            inputSchema: {
              type: 'object',
              properties: {
                id_credito: { type: 'string', description: 'ID del crédito' },
                numero_cuota: { type: 'number', description: 'Número de cuota (opcional)' },
                fecha_corte: { type: 'string', description: 'Fecha de corte (YYYY-MM-DD)' }
              },
              required: ['id_credito']
            }
          },
          {
            name: 'explicar_mora',
            description: 'Explica detalladamente la mora de una cuota: capital en mora y desglose por tramos recorridos (días, tasas y montos). Permite fechas futuras.',
            inputSchema: {
              type: 'object',
              properties: {
                id_credito: { type: 'string', description: 'ID del crédito' },
                numero_cuota: { type: 'number', description: 'Número de cuota' },
                fecha_corte: { type: 'string', description: 'Fecha de corte (YYYY-MM-DD)' }
              },
              required: ['id_credito', 'numero_cuota', 'fecha_corte']
            }
          },
          {
            name: 'listar_creditos_mora',
            description: 'Lista créditos en mora con días de atraso, tramo y saldo; filtrable por tramo (ej. Mora 3).',
            inputSchema: {
              type: 'object',
              properties: {
                fecha_corte: { type: 'string', description: 'Fecha de corte (YYYY-MM-DD)' },
                tramo: { type: 'string', description: 'Filtro por tramo opcional' }
              }
            }
          },
          {
            name: 'ver_proximos_vencimientos',
            description: 'Lista cuotas que vencen en una ventana de días (ej. 7 o 30 días) y monto total exigible.',
            inputSchema: {
              type: 'object',
              properties: {
                fecha_corte: { type: 'string', description: 'Fecha de inicio (YYYY-MM-DD)' },
                dias_ventana: { type: 'number', description: 'Ventana de días (7 o 30)' }
              }
            }
          },
          {
            name: 'consultar_cartera',
            description: 'Devuelve cartera activa, cartera en mora, cartera en riesgo por tramo e incobrables del período.',
            inputSchema: {
              type: 'object',
              properties: {
                fecha_corte: { type: 'string', description: 'Fecha de corte (YYYY-MM-DD)' }
              }
            }
          },
          {
            name: 'consultar_cierre',
            description: 'Devuelve los desembolsos y recuperaciones desglosadas por concepto (gastos, mora, interés, capital), diario o mensual.',
            inputSchema: {
              type: 'object',
              properties: {
                tipo: { type: 'string', enum: ['diario', 'mensual'] },
                fecha: { type: 'string', description: 'Para diario: YYYY-MM-DD' },
                anio: { type: 'number', description: 'Para mensual: año' },
                mes: { type: 'number', description: 'Para mensual: mes (1-12)' }
              },
              required: ['tipo']
            }
          },
          {
            name: 'registrar_pago',
            description: '[ACCIÓN SENSIBLE] Registra un pago sobre un crédito aplicando prelación estricta e idempotencia. REQUIERE APROBACIÓN HUMANA EXPLÍCITA.',
            inputSchema: {
              type: 'object',
              properties: {
                id_credito: { type: 'string' },
                monto: { type: 'string' },
                fecha_pago: { type: 'string' },
                canal: { type: 'string', enum: ['agencia', 'campo', 'transferencia'] },
                clave_idempotencia: { type: 'string' },
                aprobacion_humana_confirmada: { type: 'boolean' }
              },
              required: ['id_credito', 'monto', 'clave_idempotencia']
            }
          }
        ]
      };
    });

    // 2. Ejecución de herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const res = await this.ejecutarHerramienta(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }
        ]
      };
    });
  }

  public async ejecutarHerramienta(nombre: string, args: any): Promise<any> {
    try {
      switch (nombre) {
        case 'consultar_credito': {
          const params = EsquemasHerramientas.consultar_credito.parse(args);
          const estado = await RepositorioCredito.obtenerEstadoCredito(params.id_credito, params.fecha_corte);
          return {
            id_credito: estado.credito.id_credito,
            cliente: estado.cliente.nombre_completo,
            saldo_capital: estado.saldoCapitalActual.valor,
            dias_atraso: estado.diasAtrasoMaximo,
            tramo: estado.tramoMaximo,
            cuotas_pagadas: estado.cuotasPagadas,
            cuotas_vencidas: estado.cuotasVencidas,
            es_incobrable: estado.esIncobrable,
            proxima_cuota: estado.proximaCuota ? {
              numero: estado.proximaCuota.numero,
              fecha_vencimiento: estado.proximaCuota.fechaVencimiento,
              dias_atraso: estado.proximaCuota.diasAtraso,
              total_exigible: estado.proximaCuota.totalExigible.valor
            } : null
          };
        }

        case 'calcular_deuda_cuota': {
          const params = EsquemasHerramientas.calcular_deuda_cuota.parse(args);
          const estado = await RepositorioCredito.obtenerEstadoCredito(params.id_credito, params.fecha_corte);
          const numCuota = params.numero_cuota || (estado.proximaCuota?.numero ?? 1);
          const mora = await RepositorioCredito.explicarMoraCuota(params.id_credito, numCuota, params.fecha_corte);
          const cuotaPlan = estado.planAmortizacion.find(c => c.numero === numCuota);

          return {
            id_credito: params.id_credito,
            numero_cuota: numCuota,
            gastos: mora.gastosGestion.valor,
            interes_moratorio: mora.totalInteresMoratorio.valor,
            interes_corriente: cuotaPlan?.interes.valor || '0.00',
            capital: mora.capitalEnMora.valor,
            total_exigible: mora.totalExigible.valor
          };
        }

        case 'explicar_mora': {
          const params = EsquemasHerramientas.explicar_mora.parse(args);
          const exp = await RepositorioCredito.explicarMoraCuota(params.id_credito, params.numero_cuota, params.fecha_corte);
          return {
            id_credito: exp.idCredito,
            numero_cuota: exp.numeroCuota,
            capital_en_mora: exp.capitalEnMora.valor,
            politica: exp.politica,
            dias_atraso_total: exp.diasAtraso,
            desglose_por_tramo: exp.tramosRecorridos.map(t => ({
              tramo: t.tramo,
              dias: t.dias,
              tasa_anual_pct: t.tasaNominalAnual * 100,
              recargo: t.monto.valor
            })),
            gastos_gestion: exp.gastosGestion.valor,
            total_mora: exp.totalInteresMoratorio.valor,
            total_exigible: exp.totalExigible.valor
          };
        }

        case 'listar_creditos_mora': {
          const params = EsquemasHerramientas.listar_creditos_mora.parse(args || {});
          const tramoEnum = params.tramo ? (params.tramo as TramoMora) : undefined;
          const morosos = await RepositorioCredito.listarCreditosEnMora(params.fecha_corte, tramoEnum);
          return {
            fecha_corte: params.fecha_corte,
            filtro_tramo: params.tramo || 'Todos',
            total_encontrados: morosos.length,
            creditos: morosos
          };
        }

        case 'ver_proximos_vencimientos': {
          const params = EsquemasHerramientas.ver_proximos_vencimientos.parse(args || {});
          return await RepositorioCredito.obtenerProximosVencimientos(params.fecha_corte, params.dias_ventana);
        }

        case 'consultar_cartera': {
          const params = EsquemasHerramientas.consultar_cartera.parse(args || {});
          return await RepositorioCredito.obtenerEstadoCartera(params.fecha_corte);
        }

        case 'consultar_cierre': {
          const params = EsquemasHerramientas.consultar_cierre.parse(args);
          if (params.tipo === 'diario') {
            const fecha = params.fecha || '2026-10-31';
            return await RepositorioCredito.obtenerCierreDiario(fecha);
          } else {
            const anio = params.anio || 2026;
            const mes = params.mes || 10;
            return await RepositorioCredito.obtenerCierreMensual(anio, mes);
          }
        }

        case 'registrar_pago': {
          const params = EsquemasHerramientas.registrar_pago.parse(args);

          // Control de Menor Privilegio y Aprobación Humana Obligatoria
          if (!params.aprobacion_humana_confirmada) {
            // No se ejecuta: se devuelve una propuesta estructurada para que la interfaz pida confirmación
            const estado = await RepositorioCredito.obtenerEstadoCredito(params.id_credito, params.fecha_pago);
            return {
              requiere_aprobacion_humana: true,
              mensaje: 'ACCIÓN SENSIBLE: El registro de pagos requiere confirmación humana explícita antes de debitar fondos.',
              propuesta: {
                id_credito: params.id_credito,
                monto_solicitado: params.monto,
                monto_exigible_calculado: estado.proximaCuota?.totalExigible.valor || '0.00',
                clave_idempotencia: params.clave_idempotencia,
                cuota_a_pagar: estado.proximaCuota?.numero,
                desglose_estimado: {
                  gastos: estado.proximaCuota?.gastos.valor,
                  mora: estado.proximaCuota?.interesMoratorio.valor,
                  interes: estado.proximaCuota?.interesCorriente.valor,
                  capital: estado.proximaCuota?.capital.valor
                }
              }
            };
          }

          // Si el usuario confirmó la aprobación humana:
          const resultado = await RepositorioCredito.registrarPagoConPrelacion({
            idCredito: params.id_credito,
            monto: new Dinero(params.monto),
            fechaPago: params.fecha_pago,
            canal: params.canal,
            claveIdempotencia: params.clave_idempotencia
          });

          return {
            pago_aplicado: true,
            idempotente_reintento: resultado.yaProcesado,
            clave_idempotencia: resultado.claveIdempotencia,
            desglose_prelacion: {
              gastos_pagados: resultado.resultado.pagadoGastos.valor,
              mora_pagada: resultado.resultado.pagadoInteresMoratorio.valor,
              interes_pagado: resultado.resultado.pagadoInteresCorriente.valor,
              capital_pagado: resultado.resultado.pagadoCapital.valor,
              excedente: resultado.resultado.excedente.valor
            },
            nuevo_saldo_capital: resultado.estadoCreditoDespues.saldoCapitalActual.valor,
            cuotas_pagadas: resultado.estadoCreditoDespues.cuotasPagadas
          };
        }

        default:
          throw new Error(`Herramienta no reconocida: ${nombre}`);
      }
    } catch (error: any) {
      return {
        error: true,
        tipo_error: error.name || 'ErrorDeNegocio',
        mensaje: error.message
      };
    }
  }

  public async iniciarStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP Crédito Vecino conectado vía Stdio.');
  }
}

if (require.main === module) {
  const mcpServer = new ServidorMCPCreditoVecino();
  mcpServer.iniciarStdio().catch(err => {
    console.error('Error al iniciar servidor MCP:', err);
    process.exit(1);
  });
}

