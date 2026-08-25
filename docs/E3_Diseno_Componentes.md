# E3: Diseño de componentes

## 1. Introducción

Este documento presenta el diseño de componentes del Sistema de Gestión de Microcrédito. El alcance implementado es el dominio financiero: representación monetaria, planes de amortización, mora, prelación de pagos, ciclo de vida del crédito e indicadores de cartera. No se implementan servidor HTTP, persistencia ni interfaces de usuario.

## 2. Objetivo de E3

El objetivo es descomponer el sistema en responsabilidades comprensibles y demostrar con código y pruebas la aplicación de SOLID, GRASP, alta cohesión, bajo acoplamiento y cuatro patrones GoF: Strategy, Chain of Responsibility, State y Builder. `Dinero` se reconoce adicionalmente como Value Object, sin contarlo como patrón GoF del entregable.

## 3. Descomposición en módulos y responsabilidad única

| Módulo | Responsabilidad | Evidencia actual |
|---|---|---|
| Originación | Controlar aprobación, rechazo, anulación y desembolso previo a la vida activa del crédito. | `estado-credito.ts`, mediante `ContextoEstadoCredito` y sus estados. |
| Cálculo financiero | Representar importes y generar planes de cuotas con una estrategia intercambiable. | `dinero.ts` y `plan-amortizacion.ts`. |
| Cartera y cobros | Calcular mora, clasificar atraso y distribuir pagos por prelación. | `calculadora-mora.ts` y `prelacion-pago.ts`. |
| Cierres | Obtener cartera activa, cartera en riesgo y porcentaje de riesgo para una colección recibida. | `cartera.ts`. Es un cálculo de indicadores; todavía no existe una entidad de cierre contable persistido. |
| Contratos/API | Definir formas de intercambio entre componentes sin infraestructura. | Interfaces TypeScript `CuotaPlan`, `EstrategiaAmortizacion`, `DeudaCuota`, `ResultadoPago`, `CreditoCartera` y `ReporteCartera`. No existe API HTTP en este alcance. |

## 4. Interfaces y contratos entre componentes

`EstrategiaAmortizacion` recibe capital, tasa mensual y cantidad de cuotas, y devuelve `CuotaPlan[]`. `PlanAmortizacionBuilder` depende de ese contrato, no de una fórmula concreta. `DeudaCuota` y `ResultadoPago` delimitan la entrada y salida de `ProcesadorDePagos`. `CreditoCartera` y `ReporteCartera` separan el cálculo de indicadores de cualquier repositorio. `EstadoCreditoState` define las operaciones posibles del ciclo de vida; los estados concretos aceptan las propias y heredan el rechazo de las demás. `HistorialEstadoCredito` define la evidencia de cada cambio: estado anterior, estado nuevo, fecha, actor y motivo.

Los contratos son internos y sin efectos de infraestructura. Las fechas se reciben como parámetros. Los importes atraviesan los contratos como `Dinero`; las tasas son razones numéricas, no importes monetarios.

## 5. Diseño detallado del cálculo financiero

El cliente configura `PlanAmortizacionBuilder` con `Dinero`, tasa mensual, plazo entero y una `EstrategiaAmortizacion`. `build()` valida presencia y dominio de los datos y delega en la estrategia. `AmortizacionFrancesa` usa `decimal.js` para la fórmula de cuota fija. Cada resultado monetario se materializa como `Dinero`, que redondea a dos decimales. En la última fila la amortización se iguala al saldo inicial; por ello la suma de amortizaciones coincide con el capital y el saldo termina exactamente en cero. El Builder no repite la fórmula.

La tasa usa el tipo `number` por compatibilidad con el diseño existente, pero se convierte inmediatamente a `Decimal` dentro del algoritmo. Los capitales, cuotas, intereses y saldos nunca se representan como `number`.

## 6. Aplicación de SOLID

| Principio | Archivo y participante | Evidencia y justificación | Limitación real |
|---|---|---|---|
| SRP | `dinero.ts`, `Dinero` | Encapsula valor, moneda, redondeo y operaciones monetarias; no calcula planes ni mora. | Contiene validación y aritmética porque ambas sostienen la misma responsabilidad monetaria. |
| OCP | `plan-amortizacion.ts`, `EstrategiaAmortizacion` | Una nueva modalidad puede agregarse implementando la interfaz sin modificar el Builder. | Solo está implementada la modalidad francesa. |
| LSP | `estado-credito.ts`, implementaciones de `EstadoCreditoState` | Cada estado puede ocupar el contrato y responder a todas las operaciones; las no válidas fallan uniformemente desde la clase base. | El rechazo mediante excepción forma parte explícita del contrato de transiciones. |
| ISP | `plan-amortizacion.ts`, `EstrategiaAmortizacion`; `prelacion-pago.ts`, `DeudaCuota` | Los consumidores reciben contratos pequeños y enfocados, sin operaciones de persistencia o transporte. | `EstadoCreditoState` es deliberadamente más amplio porque modela el protocolo completo de estados. |
| DIP | `PlanAmortizacionBuilder` y `EstrategiaAmortizacion` | El constructor del plan depende de la abstracción inyectada mediante `setEstrategia`. | `ProcesadorDePagos` arma internamente su cadena fija, apropiada porque la prelación es una regla normativa del caso. |

## 7. Aplicación de GRASP

- **Information Expert:** `AmortizacionFrancesa` posee la fórmula y datos necesarios para producir cuotas; cada State conoce las transiciones que admite.
- **Creator:** `PlanAmortizacionBuilder` crea el plan después de reunir y validar sus parámetros; `ProcesadorDePagos` crea y enlaza los manejadores de la prelación.
- **Polymorphism:** `EstrategiaAmortizacion` y `EstadoCreditoState` sustituyen decisiones centrales basadas en cadenas o `switch` por despacho polimórfico.
- **High Cohesion:** cálculo del plan, mora, cobro, cartera y estados se encuentran en archivos separados por motivo de cambio.
- **Low Coupling:** los módulos intercambian Value Objects e interfaces; no dependen de HTTP, base de datos ni reloj del sistema.

## 8. Patrones de diseño

### 8.1 Strategy

**Problema.** Variar el algoritmo de amortización sin alterar quien valida y solicita el plan. **Ubicación:** `src/dominio/plan-amortizacion.ts`. **Participantes:** `EstrategiaAmortizacion` (Strategy), `AmortizacionFrancesa` (ConcreteStrategy) y `PlanAmortizacionBuilder` (cliente/contexto). **Funcionamiento:** el Builder recibe la estrategia y llama `generarPlan`. **Ventajas:** extensibilidad y prueba aislada. **Consecuencia:** agrega una abstracción aunque hoy exista una sola estrategia. Refuerza OCP, DIP y Polymorphism.

### 8.2 Chain of Responsibility

**Problema.** Aplicar obligatoriamente el pago a gastos, interés moratorio, interés corriente y capital. **Ubicación:** `src/dominio/prelacion-pago.ts`. **Participantes:** `ManejadorPago`, `CobroGastos`, `CobroInteresMoratorio`, `CobroInteresCorriente`, `CobroCapital` y `ProcesadorDePagos`. **Funcionamiento:** cada manejador consume hasta su deuda y pasa el remanente. **Ventajas:** cada escalón queda aislado y la secuencia es visible. **Consecuencia:** el resultado es mutable durante el recorrido y seguir el flujo requiere conocer la cadena. Favorece SRP y High Cohesion; la cadena fija preserva la regla de negocio.

### 8.3 State

**Problema.** Evitar condicionales dispersos para transiciones y pagos permitidos. **Ubicación:** `src/dominio/estado-credito.ts`. **Participantes:** `ContextoEstadoCredito`, `EstadoCreditoState`, `EstadoCreditoBase`, `HistorialEstadoCredito` y los nueve estados concretos. **Funcionamiento:** el contexto delega la operación al objeto estado, que cambia el estado cuando se cumplen las condiciones; la clase base rechaza operaciones inválidas. Los estados `rechazado`, `anulado`, `cancelado` e `incobrable` son terminales y heredan todos los rechazos. **Ventajas:** reglas locales, estados terminales seguros y extensión localizada. **Consecuencia:** aumenta el número de clases. Aplica OCP, LSP, Polymorphism e Information Expert.

`aplicarPago` recibe el saldo de capital y los días de atraso resultantes. Si el saldo es cero exacto pasa a `cancelado`; con saldo positivo y cero días pasa a `vigente`; con saldo positivo y días mayores que cero permanece en `en_mora`. Tanto los días como el saldo resultante se validan para impedir negativos. `EnMoraState.registrarAtraso(0, ...)` también regulariza el crédito. Si se detectan 121 días directamente desde vigente, se registran sucesivamente `vigente → en_mora` y `en_mora → incobrable`, sin ocultar el deterioro intermedio.

El estado `en_mora` no equivale a un tramo. Mora 1, Mora 2, Mora 3 y Vencido son clasificaciones reversibles calculadas por `CalculadoraMora` a partir de `ContextoEstadoCredito.diasAtraso`. Por ejemplo, un pago parcial puede reducir 45 a 10 días: el State continúa `en_mora`, pero la clasificación cambia de Mora 2 a Mora 1. Al llegar a cero días retorna a `vigente`.

Cada cambio agrega un `HistorialEstadoCredito` con estado anterior, estado nuevo, copia de la fecha recibida, actor o proceso y motivo. El actor predeterminado es `sistema`, pero las operaciones públicas permiten indicar uno real. El arreglo interno nunca se expone: el getter devuelve nuevas entradas y nuevas copias de las fechas. Una operación inválida lanza la excepción antes de llamar `cambiarEstado`, por lo que no contamina el historial.

### 8.4 Builder

**Problema.** Impedir planes construidos con parámetros ausentes o inválidos. **Ubicación:** `src/dominio/plan-amortizacion.ts`. **Participantes:** `PlanAmortizacionBuilder`, `Dinero`, `EstrategiaAmortizacion` y `CuotaPlan`. **Funcionamiento:** los setters encadenables capturan los datos; `build()` valida capital positivo, tasa no negativa, plazo entero positivo y estrategia obligatoria, y luego delega. **Ventajas:** construcción legible y validación centralizada. **Consecuencia:** el objeto Builder es mutable y no debe compartirse concurrentemente. Se relaciona con Creator, SRP y DIP.

### 8.5 Value Object adicional

**Problema.** Evitar importes primitivos, mezcla de monedas y mutación accidental. **Ubicación:** `src/dominio/dinero.ts`. **Participante:** `Dinero`. **Funcionamiento:** guarda un `Decimal` redondeado y una `Moneda`; cada operación devuelve una instancia nueva. **Ventajas:** precisión decimal, igualdad por valor e invariantes compartidos. **Consecuencia:** crea objetos adicionales y exige convertir entradas a `string` o `Decimal`. Apoya Low Coupling e Information Expert. Es un patrón de dominio, no uno de los cuatro GoF contabilizados.

## 9. Cohesión y acoplamiento por módulo

| Módulo | Cohesión | Acoplamiento |
|---|---|---|
| Originación | Alta: solo ciclo de vida e invariantes de transición. | Depende de `Dinero` para verificar saldo; no depende de infraestructura. |
| Cálculo financiero | Alta: aritmética monetaria y generación del plan. | Strategy desacopla Builder de la fórmula concreta; `decimal.js` queda encapsulado. |
| Cartera y cobros | Alta: mora y distribución de pagos tienen componentes separados. | Comparte `Dinero` y contratos estructurales; no conoce almacenamiento. |
| Cierres | Media-alta: `Cartera` produce exclusivamente indicadores. | Recibe `CreditoCartera[]`; no consulta repositorios. |
| Contratos/API | Alta: interfaces de datos sin comportamiento ajeno. | Son contratos TypeScript internos; aún no hay contrato HTTP implementado en la raíz. |

## 10. Relación entre diseño, código y pruebas

Los diagramas `E3_*.mmd` usan participantes del código. `plan-amortizacion.test.ts` compara celda por celda las cinco columnas de las 12 cuotas del caso base y además verifica la suma de amortizaciones y el saldo final. `estado-builder.test.ts` cubre State, historial, Builder y la regularización integrada Mora 2 → Mora 1 → vigente; `mora-pagos.test.ts` demuestra clasificación y Chain of Responsibility; `dinero.test.ts` prueba el Value Object; `cartera.test.ts` prueba indicadores. Las pruebas usan fechas proporcionadas, por lo que el dominio no depende de la fecha del sistema.

## 11. Conclusión

El diseño implementa los cuatro patrones GoF solicitados con comportamiento ejecutable y evidencia unitaria. La separación por contratos mantiene el dominio independiente de infraestructura y permite evolucionar algoritmos y estados de forma localizada. El alcance no pretende afirmar componentes inexistentes: la API, la persistencia y un cierre contable persistido permanecen como trabajo posterior.
