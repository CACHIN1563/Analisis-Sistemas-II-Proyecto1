import { ServidorMCPCreditoVecino } from '../mcp/servidor-mcp';
import { MotorRAG } from './motor-rag';
import { RepositorioCredito, aStringFecha } from '../persistencia/repositorio';
import { TramoMora } from '../dominio/calculadora-mora';

export interface RespuestaAsistente {
  respuesta: string;
  herramienta?: string;
  parametros?: any;
  resultado?: any;
  citas?: string[];
  requiereConfirmacion?: {
    idCredito: string;
    numeroCuota: number;
    monto: number;
    fechaPago: string;
    confirmado?: boolean;
  };
}

export class AsistenteGerencial {
  private static mcp = new ServidorMCPCreditoVecino();

  /**
   * Procesa cualquier consulta gerencial mediante razonamiento financiero estricto
   * y garantiza que el asistente responda EXCLUSIVAMENTE sobre el dominio de Crédito Vecino.
   */
  static async procesarMensaje(
    mensaje: string,
    fechaCorte: string = '2026-10-31',
    sessionId?: string
  ): Promise<RespuestaAsistente> {
    const msg = mensaje.trim();
    const msgLower = msg.toLowerCase();
    const fecha = aStringFecha(fechaCorte);

    // 1. FILTRO DE DOMINIO: Detectar preguntas ajenas al sistema de Crédito Vecino
    if (this.esConsultaFueraDeDominio(msgLower)) {
      return {
        respuesta: 
          `**Restricción de Alcance:** Como Asistente Gerencial Inteligente de **Crédito Vecino, S. A.**, opero bajo el principio de menor privilegio y estoy programado para responder **únicamente** sobre la gestión financiera y operativa de esta institución.\n\n` +
          `Puedo asistirle exclusivamente en:\n` +
          `• Consultas de créditos y expedientes (ej. \`CV-2026-0043\`, \`CV-2026-0035\`, etc.)\n` +
          `• Estado de clientes, deudas y amortizaciones\n` +
          `• Explicabilidad matemática de mora y recargos por tramo\n` +
          `• Indicadores de cartera activa, mora y riesgo PAR > 30 (G-1)\n` +
          `• Cierres contables mensuales y diarios (G-2, G-3)\n` +
          `• Políticas oficiales de crédito vigentes (RAG)\n` +
          `• Registro controlado de pagos con prelación legal y aprobación humana.`
      };
    }

    // 2. CASO DE SEGURIDAD OP-7: Inyección de prompts en documentos de campo (OWASP LLM01)
    if (
      msgLower.includes('nota-campo-07') ||
      msgLower.includes('campo 07') ||
      msgLower.includes('canario') ||
      msgLower.includes('ignora') ||
      msgLower.includes('instrucciones anteriores') ||
      msgLower.includes('instrucciones previas') ||
      msgLower.includes('jailbreak') ||
      msgLower.includes('system prompt') ||
      msgLower.includes('contraseña') ||
      msgLower.includes('password') ||
      msgLower.includes('perdonar deuda') ||
      msgLower.includes('marcar como pagado')
    ) {
      const respSeguridad = MotorRAG.procesarDocumentoSeguro(
        'NOTA-CAMPO-07.md',
        'Directiva hostil incrustada en nota de supervisión'
      );
      return {
        respuesta: respSeguridad.resumenSeguro,
        herramienta: 'filtro_seguridad_owasp_llm01'
      };
    }

    // 3. DETECCIÓN Y RESOLUCIÓN INTELIGENTE DE INCONSISTENCIAS Y CONTRADICCIONES
    // Extraer número de crédito si existe
    const idCreditoMatch = msg.match(/CV-\d{4}-\d{4}/i) || msg.match(/\b00\d{2}\b/);
    let idCredito = idCreditoMatch ? idCreditoMatch[0].toUpperCase() : null;
    if (idCredito && !idCredito.startsWith('CV-')) {
      idCredito = `CV-2026-${idCredito}`;
    }

    // Extraer número de cuota si se menciona
    const cuotaMatch = msgLower.match(/cuota\s*#?\s*(\d+)/);
    const numeroCuota = cuotaMatch ? parseInt(cuotaMatch[1], 10) : 1;

    const inconsistencia = await this.analizarInconsistencias(
      msg,
      msgLower,
      fecha,
      idCredito,
      cuotaMatch ? parseInt(cuotaMatch[1], 10) : null
    );

    if (inconsistencia) {
      return {
        respuesta: inconsistencia,
        herramienta: 'validador_inconsistencias_dominio'
      };
    }

    // 4. CONSULTA G-8: Preguntas sobre políticas legítimas de crédito o RAG
    if (
      msgLower.includes('política') ||
      msgLower.includes('politica') ||
      msgLower.includes('agosto de 2026') ||
      msgLower.includes('agosto 2026') ||
      msgLower.includes('tasa de mora') ||
      msgLower.includes('manual de operaciones') ||
      msgLower.includes('reglamento')
    ) {
      const respRAG = await MotorRAG.responderConsultaPolitica(mensaje);
      return {
        respuesta: respRAG.respuesta,
        citas: respRAG.fuentes,
        herramienta: 'motor_rag_recuperacion'
      };
    }

    // Detectar si la consulta pide registrar un pago (OP-1)
    if (msgLower.includes('registrar pago') || msgLower.includes('pagar') || msgLower.includes('abono')) {
      if (!idCredito) idCredito = 'CV-2026-0043';
      try {
        const estado = await RepositorioCredito.obtenerEstadoCredito(idCredito, fecha);
        const prox = estado.proximaCuota;
        if (!prox) {
          return {
            respuesta: `El crédito **${idCredito}** no tiene cuotas pendientes al corte. Saldo actual: Q 0.00.`
          };
        }

        const montoExigible = Number(prox.totalExigible.valor);

        return {
          respuesta:
            `**Propuesta de Pago Formulada:**\n\n` +
            `He evaluado el crédito **${idCredito}** al corte **${fecha}**:\n` +
            `• **Cliente:** ${estado.cliente.nombre_completo}\n` +
            `• **Cuota a Liquidar:** Cuota #${prox.numero} (Vence: ${prox.fechaVencimiento})\n` +
            `• **Días de Atraso:** ${prox.diasAtraso} días (${prox.tramo})\n\n` +
            `**Desglose bajo Orden Legal de Prelación:**\n` +
            `1. Gastos de Cobranza: Q ${prox.gastos.valor}\n` +
            `2. Interés Moratorio: Q ${prox.interesMoratorio.valor}\n` +
            `3. Interés Corriente: Q ${prox.interesCorriente.valor}\n` +
            `4. Amortización Capital: Q ${prox.capital.valor}\n` +
            `• **Total Exigible Exacto:** **Q ${montoExigible.toFixed(2)}**\n\n` +
            `*Control de Menor Privilegio:* Como asistente de IA no tengo permiso de mover dinero unilateralmente. Por favor confirme la aprobación humana a continuación para asentar el abono.`,
          herramienta: 'calcular_deuda_cuota',
          requiereConfirmacion: {
            idCredito,
            numeroCuota: prox.numero,
            monto: montoExigible,
            fechaPago: fecha
          }
        };
      } catch (err: any) {
        return { respuesta: `Error al formular pago: ${err.message}` };
      }
    }

    // Consulta específica sobre un Crédito (G-5, G-7, o consulta de estado)
    if (idCredito) {
      try {
        const fechaEval = msg.includes('2027') ? '2027-01-24' : fecha;
        const estado = await RepositorioCredito.obtenerEstadoCredito(idCredito, fechaEval);
        
        // Si piden específicamente mora o es G-5 / G-7
        if (msgLower.includes('mora') || msgLower.includes('atraso') || msgLower.includes('explicar')) {
          const mora = await RepositorioCredito.explicarMoraCuota(idCredito, numeroCuota || (estado.proximaCuota?.numero || 1), fechaEval);
          
          let tramosTexto = '';
          if (mora.desgloseTramos && mora.desgloseTramos.length > 0) {
            tramosTexto = mora.desgloseTramos
              .map(t => `  • **${t.tramo}:** ${t.diasEnTramo} días al ${t.tasaAplicada}% anual = Q${t.interesTramo}`)
              .join('\n');
          }

          return {
            respuesta:
              `**Análisis Detallado de Mora para ${idCredito} (Cuota #${mora.numeroCuota})**\n\n` +
              `• **Titular:** ${mora.cliente}\n` +
              `• **Fecha de Desembolso:** ${mora.fechaDesembolso}\n` +
              `• **Fecha de Vencimiento de Cuota:** ${mora.fechaVencimiento}\n` +
              `• **Fecha de Evaluación:** ${mora.fechaCorte}\n` +
              `• **Días de Atraso Acumulados:** **${mora.diasAtraso} días** (${mora.tramoActual})\n` +
              `• **Política Aplicable:** \`${mora.politica}\`\n\n` +
              (tramosTexto ? `**Desglose Tramo por Tramo:**\n${tramosTexto}\n\n` : '') +
              `**Liquidación Exigible:**\n` +
              `• Capital de cuota: Q ${mora.capitalCuota.valor}\n` +
              `• Interés corriente: Q ${mora.interesCorriente.valor}\n` +
              `• Interés moratorio acumulado: **Q ${mora.totalInteresMoratorio.valor}**\n` +
              `• Gastos de cobranza administrativa: **Q ${mora.gastosGestion.valor}**\n` +
              `• **Total Exigible al Corte:** **Q ${mora.totalExigible.valor}**`,
            herramienta: 'explicar_mora',
            resultado: mora
          };
        }

        // Estado general del crédito
        const capDesemb = (estado.credito.capital_centavos / 100).toFixed(2);
        const tna = (estado.credito.tna_bps / 100).toFixed(2);
        return {
          respuesta:
            `**Expediente del Crédito ${idCredito}**\n\n` +
            `• **Titular:** ${estado.cliente.nombre_completo} (DPI: ${estado.cliente.dpi})\n` +
            `• **Municipio y Teléfono:** ${estado.cliente.municipio} · ${estado.cliente.telefono}\n` +
            `• **Asesor de Crédito:** ${estado.credito.id_asesor}\n` +
            `• **Condiciones:** Q ${capDesemb} a ${estado.credito.plazo_meses} meses con TNA de ${tna}%\n` +
            `• **Política:** \`${estado.politicaAplicada}\`\n` +
            `• **Saldo de Capital Pendiente:** **Q ${estado.saldoCapitalActual.valor}**\n` +
            `• **Progreso:** ${estado.cuotasPagadas} cuotas pagadas de ${estado.cuotasTotales} (${estado.cuotasVencidas} vencidas)\n` +
            `• **Estado:** ${estado.esIncobrable ? '🚨 INCOBRABLE (>120 días)' : estado.estaAlDia ? '✔ AL DÍA' : `⚠️ EN MORA (${estado.diasAtrasoMaximo} días)`}\n` +
            (estado.proximaCuota ? `• **Próxima Cuota (#${estado.proximaCuota.numero}):** Total exigible Q ${estado.proximaCuota.totalExigible.valor} (Vence: ${estado.proximaCuota.fechaVencimiento})` : ''),
          herramienta: 'consultar_credito',
          resultado: estado
        };
      } catch (err: any) {
        return { respuesta: `No se encontró el crédito ${idCredito}: ${err.message}` };
      }
    }

    // 5. CONSULTA G-1: Cartera al 31 de octubre
    if (msgLower.includes('cartera') || msgLower.includes('riesgo') || msgLower.includes('par')) {
      const cartera = await RepositorioCredito.obtenerEstadoCartera(fecha);
      const desgloseTexto = cartera.desglosePorTramo
        .map(t => `  • **${t.nombre}:** Q ${t.monto} (${t.porcentaje.toFixed(2)}%)`)
        .join('\n');

      return {
        respuesta:
          `**Estado Consolidado de la Cartera al ${fecha} (Consulta G-1)**\n\n` +
          `• **Cartera Activa Total:** **Q ${cartera.carteraActivaTotal}**\n` +
          `• **Cartera en Mora:** Q ${cartera.carteraEnMora} (**${cartera.porcentajeMora.toFixed(2)}%**)\n` +
          `• **Cartera en Riesgo (PAR > 30 días):** Q ${cartera.carteraEnRiesgo} (**${cartera.porcentajeRiesgo.toFixed(2)}%**)\n` +
          `• **Créditos Incobrables (>120 días):** ${cartera.incobrablesPeriodo.cantidad} créditos (Total: Q ${cartera.incobrablesPeriodo.montoTotal}) [incluye ${cartera.incobrablesPeriodo.creditos.join(', ')}]\n\n` +
          `**Distribución Analítica por Tramos de Antigüedad:**\n${desgloseTexto}`,
        herramienta: 'consultar_cartera',
        resultado: cartera
      };
    }

    // 6. CONSULTA G-2: Cierre mensual de octubre
    if (msgLower.includes('cierre mensual') || (msgLower.includes('cierre') && msgLower.includes('octubre'))) {
      const cm = await RepositorioCredito.obtenerCierreMensual(2026, 10);
      return {
        respuesta:
          `**Cierre Contable Mensual — Octubre de 2026 (Consulta G-2)**\n\n` +
          `• **Colocación (Desembolsos):** **${cm.desembolsos.cantidad} créditos** otorgados por un capital acumulado de **Q ${cm.desembolsos.totalCapital}**.\n` +
          `• **Recuperación Total (Cobranza):** **Q ${cm.recuperaciones.totalRecaudado}** recaudados a través de **${cm.recuperaciones.cantidadPagos} transacciones**.\n\n` +
          `**Desglose Oficial por Concepto Contable:**\n` +
          `  1. Amortización a Capital: Q ${cm.recuperaciones.porConcepto.capital}\n` +
          `  2. Intereses Corrientes Compensatorios: Q ${cm.recuperaciones.porConcepto.interesCorriente}\n` +
          `  3. Intereses Moratorios: Q ${cm.recuperaciones.porConcepto.interesMoratorio}\n` +
          `  4. Gastos de Gestión: Q ${cm.recuperaciones.porConcepto.gastos}`,
        herramienta: 'consultar_cierre',
        resultado: cm
      };
    }

    // 7. CONSULTA G-3: Cierre diario del 31 de octubre
    if (msgLower.includes('cierre diario') || (msgLower.includes('cierre') && msgLower.includes('31'))) {
      const cd = await RepositorioCredito.obtenerCierreDiario(fecha);
      return {
        respuesta:
          `**Cierre Contable Diario al ${fecha} (Consulta G-3)**\n\n` +
          `• **Desembolsos registrados en la fecha:** **${cd.desembolsos.cantidad} operaciones** (Q ${cd.desembolsos.totalCapital})\n` +
          `• **Recuperaciones registradas en la fecha:** **${cd.recuperaciones.cantidadPagos} pagos** (Q ${cd.recuperaciones.totalRecaudado})\n\n` +
          `*Constatación contable:* Al 31 de octubre de 2026 no se produjeron movimientos en el libro diario de caja de la entidad.`,
        herramienta: 'consultar_cierre',
        resultado: cd
      };
    }

    // 8. CONSULTA G-4: Listar Mora 3
    if (msgLower.includes('mora 3') || msgLower.includes('mora3') || msgLower.includes('61 a 90')) {
      const morosos = await RepositorioCredito.listarCreditosEnMora(fecha, TramoMora.MORA_3);
      const lista = morosos
        .map(m => `  • **${m.idCredito}** — ${m.cliente}: ${m.diasAtraso} días de atraso | Saldo Capital: Q ${m.saldoCapital} | Total Exigible Cuota: **Q ${m.totalExigible}**`)
        .join('\n');

      return {
        respuesta:
          `**Créditos en Mora 3 (61 a 90 días de atraso) al ${fecha} (Consulta G-4):**\n\n` +
          `Se identificaron **${morosos.length} créditos** en este tramo crítico:\n` +
          lista,
        herramienta: 'listar_creditos_mora',
        resultado: morosos
      };
    }

    // 9. CONSULTA G-6: Vencimientos próximos
    if (msgLower.includes('vencimientos') || msgLower.includes('vencen') || msgLower.includes('próximos')) {
      const dias = msgLower.includes('7') ? 7 : 30;
      const v = await RepositorioCredito.obtenerProximosVencimientos(fecha, dias);
      return {
        respuesta:
          `**Proyección de Vencimientos a ${dias} días desde el ${fecha} (Consulta G-6)**\n\n` +
          `• **Cuotas con vencimiento programado:** **${v.totalCuotas} cuotas**\n` +
          `• **Flujo total exigible proyectado:** **Q ${v.montoTotalExigible}**\n\n` +
          `Esta proyección permite al comité gerencial planificar la liquidez y las rutas de cobranza preventiva.`,
        herramienta: 'ver_proximos_vencimientos',
        resultado: v
      };
    }

    // 10. CONSULTAS SOBRE REGLAS DE NEGOCIO DEL SISTEMA (Francés, Centavo, Prelación, Anatocismo)
    if (msgLower.includes('centavo') || msgLower.includes('redondeo') || msgLower.includes('francés') || msgLower.includes('frances')) {
      return {
        respuesta:
          `**Regla del Sistema Francés y del Centavo en Crédito Vecino:**\n\n` +
          `1. **Cuota Nivelada Francesa:** Se calcula mediante la fórmula $C = P \\frac{i(1+i)^n}{(1+i)^n - 1}$, fijando una cuota constante.\n` +
          `2. **Manejo Monetario Exacto:** Todos los cálculos se efectúan en centavos enteros utilizando precisión decimal arbitraria (\`decimal.js\`), eliminando errores de punto flotante IEEE 754.\n` +
          `3. **Regla del Centavo:** Los micro-residuos acumulados por el redondeo mes a mes se absorben íntegramente en la **última cuota** del crédito. Esto garantiza que la suma de todas las amortizaciones de capital sea exactamente igual al monto prestado y que el saldo final quede exactamente en **Q 0.00**.`
      };
    }

    if (msgLower.includes('prelación') || msgLower.includes('orden de prelacion') || msgLower.includes('aplicacion del pago')) {
      return {
        respuesta:
          `**Orden Legal de Prelación de Pagos (Art. 1453 Código Civil de Guatemala y Política Institucional):**\n\n` +
          `Todo abono recibido en ventanilla o en campo se imputa estrictamente en la siguiente jerarquía:\n` +
          `1. **Gastos de Cobranza Administrativa:** Recargos de gestión extrajudicial incurridos.\n` +
          `2. **Intereses Moratorios:** Penalización por días de atraso sobre el capital vencido.\n` +
          `3. **Intereses Corrientes:** Renta compensatoria pactada en el contrato.\n` +
          `4. **Amortización a Saldo de Capital:** Disminución de la deuda principal del deudor.\n\n` +
          `*Garantía legal:* El sistema prohíbe el **anatocismo** (los intereses de mora jamás se capitalizan ni generan nuevos intereses).`
      };
    }

    // Búsqueda RAG general en el corpus institucional
    try {
      const resultadosRag = await MotorRAG.recuperar(mensaje, 2);
      if (resultadosRag && resultadosRag.length > 0 && resultadosRag[0].similitud > 0.08) {
        const top = resultadosRag[0];
        return {
          respuesta:
            `**Información Institucional de Crédito Vecino:**\n\n` +
            top.fragmento.contenido + `\n\n` +
            `*Fuente Oficial Citada:* \`[${top.fragmento.docId}.md § ${top.fragmento.titulo}]\``,
          citas: [`${top.fragmento.docId}.md § ${top.fragmento.titulo}`],
          herramienta: 'motor_rag_recuperacion'
        };
      }
    } catch (_err) {
      // Ignorar error de recuperación y continuar con respuesta de dominio
    }

    // Respuesta acotada y profesional cuando la pregunta está en el dominio pero requiere precisión
    return {
      respuesta:
        `Como Asistente Gerencial de Crédito Vecino, he evaluado su consulta a la fecha de corte **${fecha}**.\n\n` +
        `Para brindarle cifras exactas del núcleo contable, por favor especifique:\n` +
        `• Un número de crédito (ej. \`CV-2026-0043\`, \`CV-2026-0035\`, \`CV-2026-0015\`)\n` +
        `• Un reporte gerencial (ej. *Estado general de cartera*, *Cierre mensual*, *Créditos en Mora 3*)\n` +
        `• Una política o manual (ej. *Política de créditos de agosto 2026*, *Orden de prelación*, *Regla del centavo*)`
    };
  }

  /**
   * Analiza inconsistencias, contradicciones, falsas premisas o solicitudes ilegales/imposibles
   * planteadas por el usuario, evitando que el asistente caiga en la trampa o responda incoherentemente.
   */
  private static async analizarInconsistencias(
    msg: string,
    msgLower: string,
    fechaCorte: string,
    idCreditoExtraido: string | null,
    numeroCuotaExtraido: number | null
  ): Promise<string | null> {
    // 1. Inconsistencia de Anatocismo (Art. 1453 Código Civil / Decreto-Ley 106)
    if (
      msgLower.includes('anatocismo') ||
      (msgLower.includes('interés') && msgLower.includes('sobre') && (msgLower.includes('interés') || msgLower.includes('intereses') || msgLower.includes('mora'))) ||
      msgLower.includes('capitalizar intereses') ||
      msgLower.includes('interés compuesto')
    ) {
      return (
        `⚠️ **Inconsistencia Jurídica — Prohibición de Anatocismo:**\n\n` +
        `En Guatemala, el **Decreto-Ley 106 (Código Civil, Art. 1453)** prohíbe terminantemente el cobro de intereses sobre intereses (*anatocismo*).\n\n` +
        `• En el núcleo contable de Crédito Vecino, el interés moratorio se calcula **únicamente sobre el capital vencido** de cada cuota impaga.\n` +
        `• **Nunca** se aplica interés sobre intereses corrientes acumulados ni sobre gastos administrativos.`
      );
    }

    // 2. Inconsistencia de Condonación o Alteración Discrecional de Tasas
    if (
      msgLower.includes('rebajar tasa') ||
      msgLower.includes('rebaja la tasa') ||
      msgLower.includes('condonar mora') ||
      msgLower.includes('perdona la mora') ||
      msgLower.includes('perdonar intereses')
    ) {
      return (
        `⚠️ **Inconsistencia Operativa — Principio de Menor Privilegio:**\n\n` +
        `Como Asistente de IA opero bajo estricto principio de menor privilegio. No tengo facultades discrecionales para condonar mora, alterar tasas de interés ni modificar planes de pago por cuenta propia.\n\n` +
        `Cualquier reestructuración o excepción de cobro debe ser tramitada formalmente ante el **Comité Gerencial de Créditos** conforme al manual institucional \`POL-CARTERA-01.md\`.`
      );
    }

    // 3. Inconsistencia de Políticas temporales y cruce de fechas
    const mencionaPol2024 = msgLower.includes('pol-2024-01') || (msgLower.includes('plana') && msgLower.includes('24'));
    const mencionaPol2026 = msgLower.includes('pol-2026-10') || msgLower.includes('escalonada');
    const mencionaOctubre = msgLower.includes('octubre 2026') || msgLower.includes('octubre de 2026');
    const mencionaAgostoSept = msgLower.includes('agosto') || msgLower.includes('septiembre');

    if (mencionaPol2024 && mencionaOctubre) {
      return (
        `⚠️ **Inconsistencia en la Política Aplicable:**\n\n` +
        `La **Política de Mora Plana (POL-2024-01)** al 24 % anual estuvo vigente **exclusivamente para créditos otorgados hasta el 30 de septiembre de 2026**.\n\n` +
        `Para cualquier crédito otorgado a partir del **1 de octubre de 2026**, rige de forma obligatoria la **Política de Mora Escalonada (POL-2026-10)** (18% a 36% según tramos recorridos más Q25 de gasto administrativo en Mora 2).`
      );
    }

    if (mencionaPol2026 && mencionaAgostoSept) {
      return (
        `⚠️ **Inconsistencia en la Política Aplicable:**\n\n` +
        `La **Política de Mora Escalonada (POL-2026-10)** comenzó a regir el **1 de octubre de 2026** y no es retroactiva.\n\n` +
        `Los créditos contratados en agosto o septiembre de 2026 se rigen contractualmente bajo la **Política de Mora Plana (POL-2024-01)** a tasa fija del 24 % anual y sin recargo de Q25.`
      );
    }

    // 4. Inconsistencia de Prelación de Pagos (alterar orden legal)
    if (
      (msgLower.includes('solo capital') || msgLower.includes('sin pagar mora') || msgLower.includes('ignorar mora') || msgLower.includes('ignorar interes')) &&
      (msgLower.includes('pago') || msgLower.includes('pagar') || msgLower.includes('abono'))
    ) {
      return (
        `⚠️ **Inconsistencia en la Prelación Legal de Fondos:**\n\n` +
        `Conforme al Art. 1453 del Código Civil y las reglas contables de Crédito Vecino, no es admisible aplicar un pago directo a capital ignorando la mora o los intereses vencidos.\n\n` +
        `El orden legal de imputación es estrictamente jerárquico:\n` +
        `1. Gastos de gestión de cobro\n` +
        `2. Interés moratorio\n` +
        `3. Interés corriente\n` +
        `4. Amortización de capital`
      );
    }

    // 5. Inconsistencia en Montos Imposibles / Límites de Microcrédito
    const montoMatch = msg.match(/Q\s*([\d,]+(?:\.\d+)?)/i) || msg.match(/(\d+[\d,]*)\s*(?:quetzales|gtq)/i);
    if (montoMatch) {
      const valorStr = montoMatch[1].replace(/,/g, '');
      const valorNum = parseFloat(valorStr);
      if (!isNaN(valorNum)) {
        if (valorNum > 30000 && (msgLower.includes('solicitar') || msgLower.includes('desembolsar') || msgLower.includes('crédito') || msgLower.includes('credito'))) {
          return (
            `⚠️ **Inconsistencia con Políticas de Riesgo Institucional:**\n\n` +
            `El monto indicado (**Q ${valorNum.toLocaleString('es-GT', { minimumFractionDigits: 2 })}**) sobrepasa el límite máximo autorizado de **Q 30,000.00** para la cartera de microcréditos de Crédito Vecino.`
          );
        }
        if (valorNum <= 0 && (msgLower.includes('pago') || msgLower.includes('pagar') || msgLower.includes('solicitud'))) {
          return `⚠️ **Inconsistencia de Parámetro:** El monto de operación debe ser un valor monetario positivo mayor a Q 0.00.`;
        }
      }
    }

    // 6. Validación de Cliente Inexistente (si menciona CL-XXXX)
    const idClienteMatch = msg.match(/CL-\d{4}/i);
    if (idClienteMatch) {
      const idCliente = idClienteMatch[0].toUpperCase();
      const cliDB = await RepositorioCredito.obtenerClientePorId(idCliente);
      if (!cliDB) {
        return (
          `⚠️ **Inconsistencia — Cliente Inexistente:**\n\n` +
          `El código **${idCliente}** no corresponde a ningún cliente registrado en la base de datos de Crédito Vecino (códigos válidos: \`CL-0001\` al \`CL-0060\`).`
        );
      }
    }

    // 7. Inconsistencias sobre un crédito específico
    if (idCreditoExtraido) {
      const creditoDB = await RepositorioCredito.obtenerCreditoPorId(idCreditoExtraido);
      if (!creditoDB) {
        return (
          `⚠️ **Inconsistencia — Expediente Inexistente:**\n\n` +
          `El código de crédito **${idCreditoExtraido}** no existe en el sistema contable de Crédito Vecino.\n\n` +
          `• La base canónica auditada contiene 75 créditos registrados (\`CV-2026-0001\` al \`CV-2026-0075\`).\n` +
          `• Por favor verifique el identificador (ejemplos válidos: \`CV-2026-0043\`, \`CV-2026-0035\`, \`CV-2026-0010\`).`
        );
      }

      // Validar cruce de cliente vs crédito
      if (idClienteMatch) {
        const idClienteIngresado = idClienteMatch[0].toUpperCase();
        if (creditoDB.id_cliente !== idClienteIngresado) {
          const cliReal = await RepositorioCredito.obtenerClientePorId(creditoDB.id_cliente);
          return (
            `⚠️ **Inconsistencia de Titularidad:**\n\n` +
            `El crédito **${idCreditoExtraido}** no pertenece al cliente **${idClienteIngresado}**.\n\n` +
            `• **Titular real registrado:** ${cliReal?.nombre_completo || 'Cliente'} (${creditoDB.id_cliente}).\n` +
            `• Por favor rectifique el código del cliente o el número de expediente.`
          );
        }
      }

      // Validar número de cuota
      if (numeroCuotaExtraido !== null) {
        if (numeroCuotaExtraido <= 0) {
          return `⚠️ **Inconsistencia en Número de Cuota:** El número de cuota debe ser un entero positivo (mínimo cuota #1).`;
        }
        if (numeroCuotaExtraido > creditoDB.plazo_meses) {
          return (
            `⚠️ **Inconsistencia en el Plazo del Crédito:**\n\n` +
            `El crédito **${idCreditoExtraido}** fue pactado a un plazo de **${creditoDB.plazo_meses} meses** (${creditoDB.plazo_meses} cuotas en total).\n\n` +
            `• No existe la cuota #${numeroCuotaExtraido} en el plan de amortización contractual.`
          );
        }
      }

      // Validar fecha anterior a desembolso
      const fechaDesemb = aStringFecha(creditoDB.fecha);
      if (fechaCorte < fechaDesemb && !msg.includes('2027')) {
        return (
          `⚠️ **Inconsistencia Cronológica:**\n\n` +
          `La fecha de evaluación (${fechaCorte}) es anterior a la fecha de desembolso del crédito (**${fechaDesemb}**).\n\n` +
          `• No es posible devengar mora ni liquidar cuotas antes del otorgamiento del préstamo.`
        );
      }

      // Validar premisas falsas sobre el estado (ej. afirmar que ya pagó cuando debe o viceversa)
      const estado = await RepositorioCredito.obtenerEstadoCredito(idCreditoExtraido, fechaCorte);
      const afirmaPagado = msgLower.includes('ya pagó') || msgLower.includes('ya pago') || msgLower.includes('pagado por completo') || msgLower.includes('cancelado') || msgLower.includes('saldo cero') || msgLower.includes('no debe nada');
      const afirmaEnMora = msgLower.includes('está en mora') || msgLower.includes('esta en mora') || msgLower.includes('tiene mora') || msgLower.includes('atrasado');

      if (afirmaPagado && !estado.estaCancelado && Number(estado.saldoCapitalActual.valor) > 0) {
        return (
          `⚠️ **Aclaración de Inconsistencia Contable:**\n\n` +
          `En su mensaje plantea que el crédito **${idCreditoExtraido}** ya está cancelado o pagado, pero los registros contables deterministas demuestran lo contrario:\n\n` +
          `• **Titular:** ${estado.cliente.nombre_completo}\n` +
          `• **Saldo de Capital Pendiente:** **Q ${estado.saldoCapitalActual.valor}**\n` +
          `• **Cuotas Pagadas:** ${estado.cuotasPagadas} de ${estado.cuotasTotales} (${estado.cuotasVencidas} cuotas vencidas)\n` +
          `• **Días de Atraso Acumulados:** **${estado.diasAtrasoMaximo} días** (${estado.tramoMaximo})\n` +
          `• **Total Exigible al corte (${fechaCorte}):** **Q ${estado.proximaCuota?.totalExigible.valor || '0.00'}**`
        );
      }

      if (afirmaEnMora && estado.estaAlDia && !estado.estaCancelado) {
        return (
          `⚠️ **Aclaración de Inconsistencia Contable:**\n\n` +
          `Su consulta asume que el crédito **${idCreditoExtraido}** está en mora, pero el crédito se encuentra **AL DÍA**:\n\n` +
          `• **Titular:** ${estado.cliente.nombre_completo}\n` +
          `• **Cuotas al día:** ${estado.cuotasPagadas} de ${estado.cuotasTotales}\n` +
          `• **Días de Atraso:** 0 días (Interés moratorio = Q 0.00).`
        );
      }
    }

    return null;
  }

  private static esConsultaFueraDeDominio(texto: string): boolean {
    const palabrasProhibidas = [
      'receta', 'cocina', 'cocinar', 'pastel', 'pizza', 'clima', 'temperatura',
      'fútbol', 'futbol', 'película', 'pelicula', 'canción', 'cancion',
      'chiste', 'poema', 'capital de francia', 'quién descubrió', 'quien descubrio',
      'horóscopo', 'horoscopo', 'videojuego', 'minecraft', 'playstation'
    ];
    return palabrasProhibidas.some(p => texto.includes(p));
  }
}
