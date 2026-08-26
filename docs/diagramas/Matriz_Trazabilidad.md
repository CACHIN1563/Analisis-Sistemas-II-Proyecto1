
## MATRIZ DE TRAZABILIDAD

| Requisito | Caso de Uso | Clase/Módulo |
|-----------|-------------|--------------|
| **R1:** Registrar y consultar clientes | Registrar Cliente | `Cliente` |
| **R2:** Solicitar crédito | Solicitar Crédito | `SolicitudCredito` |
| **R3:** Otorgar créditos con plan de cuotas | Desembolsar Crédito | `Credito`, `PlanAmortizacion` |
| **R4:** Registrar pagos aplicando prelación | Registrar Pago | `Pago`, `PagoDistribucion` |
| **R5:** Calcular mora e interés moratorio | Calcular Mora | `Credito`, `Cuota` |
| **R6:** Representación del dinero | Todos los casos | `Dinero` (Value Object) |
| **R7:** Ciclo de vida del crédito | Todos los casos | `Credito`, `EstadoRegistro` |
| **R8:** Idempotencia en pagos | Registrar Pago | `Pago` |
| **R9:** Reversibilidad de tramos de mora | Calcular Mora | `Credito` |
| **R10:** Interés en suspenso (90+ días) | Calcular Mora | `Credito` |
| **R11:** Cartera en riesgo | Consultar Cartera | `Cierre`, `CarteraRiesgo` |
| **R12:** Anatocismo (prohibición) | Calcular Mora | `Cuota`, `Credito` |
| **R13:** Chain of Responsibility | Registrar Pago | `PrelacionPago` |
| **R14:** Cierre mensual | Generar Cierre | `Cierre` |
