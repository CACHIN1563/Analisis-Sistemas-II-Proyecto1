# Entregable E1: Investigación de Usuario

## 1. Personas Fundamentadas

A continuación se presentan las tres personas principales que interactúan con el Sistema de Gestión de Microcrédito (Crédito Vecino S.A.).

### Persona 1: El Cliente (Marta Xicará)
| Campo | Contenido |
| :--- | :--- |
| **Nombre y foto** | Marta Xicará (Dueña de una pequeña tienda de abarrotes). |
| **Rol y contexto** | Cliente de microcrédito. Revisa su estado de cuenta esporádicamente desde su negocio, normalmente mientras atiende clientes. |
| **Dispositivo y conectividad** | Teléfono Android de gama baja con pantalla pequeña. Conexión mediante datos móviles (prepago), a veces sin saldo. |
| **Objetivos** | "Quiero saber exactamente cuánto debo este mes y cuándo me toca pagar, para apartar el dinero de la venta diaria." |
| **Frustraciones** | Se frustra cuando el banco le da un papel lleno de números y porcentajes que no entiende. Teme que le cobren multas sorpresa. |
| **Alfabetización digital** | Básica. Usa WhatsApp y Facebook, pero no está acostumbrada a aplicaciones bancarias complejas. Teme presionar un botón equivocado y "arruinar algo". |
| **Relación con la mora** | Sabe que si se atrasa le cobran más, pero no entiende la fórmula matemática. Percibe la mora como un castigo, no como un interés devengado. |
| **Cita representativa** | *"Necesito que me enseñen la cuenta clara, porque según mi cuaderno yo ya había abonado algo este mes que pasó."* |

### Persona 2: El Asesor de Crédito (Byron)
| Campo | Contenido |
| :--- | :--- |
| **Nombre y foto** | Byron (Asesor de campo y cobrador). |
| **Rol y contexto** | Visita entre 8 a 12 clientes al día en motocicleta. Registra pagos y verifica estados de cuenta estando de pie, bajo el sol, a menudo con una sola mano libre. |
| **Dispositivo y conectividad** | Teléfono Android de gama media provisto por la empresa. Señal intermitente o nula en zonas alejadas. Alto brillo en pantalla por el sol. |
| **Objetivos** | Registrar los cobros lo más rápido posible sin cometer errores para cumplir su cuota diaria de visitas. |
| **Frustraciones** | Se desespera cuando la aplicación se queda "cargando" por falta de señal justo después de ingresar un pago, dejándolo con la duda de si se registró o no. |
| **Alfabetización digital** | Intermedia. Usa aplicaciones móviles todo el día, pero necesita interfaces rápidas con botones grandes (objetivos táctiles claros). |
| **Relación con la mora** | Entiende los tramos, pero odia tener que calcular a mano cuánto de la cuota del cliente se va a mora y cuánto a capital para explicarle al cliente. |
| **Cita representativa** | *"Con este sol apenas veo la pantalla, necesito botones grandes y que el sistema calcule el recargo por mí para no discutir con el cliente."* |

### Persona 3: La Gerencia (Comité de Crédito)
| Campo | Contenido |
| :--- | :--- |
| **Nombre y foto** | Licenciada Carmen (Gerente de Riesgos). |
| **Rol y contexto** | Toma decisiones estratégicas desde la oficina central basándose en los indicadores consolidados de toda la agencia. |
| **Dispositivo y conectividad** | Computadora portátil (Laptop) o monitor de escritorio. Conexión Wi-Fi de alta velocidad y estable. |
| **Objetivos** | Monitorear la salud financiera de la empresa de un vistazo rápido y detectar qué porcentaje de la cartera está en riesgo real. |
| **Frustraciones** | Perder tiempo exportando datos a Excel para calcular porcentajes que el sistema debería darle automáticamente. |
| **Alfabetización digital** | Alta. Acostumbrada a dashboards complejos, tablas dinámicas y reportes financieros. |
| **Relación con la mora** | Su enfoque no es el cliente individual, sino el volumen total. Distingue perfectamente entre "Cartera en Mora" (atraso general) y "Cartera en Riesgo" (>30 días). |
| **Cita representativa** | *"No me sirve ver una lista interminable de clientes; necesito ver el porcentaje exacto de cartera en riesgo agrupada por tramo para decidir si frenamos los desembolsos."* |

---

## 2. Journey Map (Flujo Principal de Originación y Cobro)

**Actor:** Marta Xicará (Cliente) y Byron (Asesor)
**Escenario:** Solicitud de un crédito nuevo, desembolso, atraso y cobro de la cuota con mora escalonada.

| Etapa | 1. Solicitud | 2. Simulación | 3. Desembolso | 4. Atraso y Sorpresa | 5. Registro de Pago |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Acción** | Byron visita a Marta y captura su DPI y monto deseado en el sistema. | Byron le muestra a Marta el plan de pagos generado en su celular. | Marta recibe el dinero y firma. El sistema le envía un SMS con su primera fecha de pago. | Marta tiene un imprevisto y se atrasa 45 días. Entra a su app web y descubre que su multa subió. | Byron llega a cobrar. El sistema desglosa los Q1,047.76 (incluyendo mora y gastos fijos). |
| **Emoción** | Esperanza / Ansiedad | Claridad / Confianza | Alegría | Confusión / Preocupación | Alivio / Resignación |
| **Puntos de dolor** | Miedo a que le rechacen el crédito por un error de tipeo del asesor. | Si los números en pantalla son muy pequeños, Marta no confiará en el plan. | Si el sistema se cae, el desembolso no se refleja a tiempo. | El cambio repentino de tramo de mora sin un aviso claro genera sensación de estafa. | Poca señal del asesor al guardar el pago puede causar cobros dobles si presiona el botón dos veces. |

---

## 3. Momentos Críticos (Errores de interfaz que cuestan dinero)

A través de la investigación, el equipo ha identificado 4 momentos donde un mal diseño UX/UI impactaría directamente en las finanzas del cliente o de la empresa:

1. **Ambigüedad en la Captura del Monto (Solicitud):** Si la interfaz móvil de Byron no separa claramente los miles con comas (ej. teclear 100000 en lugar de 10000), un toque accidental debido al tamaño reducido de los botones podría generar una solicitud de crédito por un monto irreal, comprometiendo fondos o causando rechazos automáticos.
2. **Confusión entre Cartera en Mora y en Riesgo (Gerencia):** Si el tablero gerencial rotula con colores similares o agrupa incorrectamente la "Cartera en Mora" (21.75%) y la "Cartera en Riesgo" (7.00%), el comité de crédito podría tomar decisiones drásticas basadas en el número equivocado, frenando operaciones innecesariamente.
3. **Pérdida de Señal al Registrar el Pago (Cobro en Campo):** Si Byron presiona "Registrar Pago" de Q1,047.76 y la app no da *feedback* visual inmediato de "Cargando", Byron podría presionar el botón repetidas veces pensando que no funcionó. Sin un diseño que bloquee el botón y dependa de la idempotencia del núcleo, el cliente recibiría un cobro doble en su estado de cuenta.
4. **[OBLIGATORIO] Descubrimiento del salto de tramo de mora (Cliente):** El momento más crítico es el día 31 de atraso. Si la interfaz no le advierte a Marta en el día 29 o 30 mediante una notificación o un banner rojo en su pantalla principal (*"Mañana su mora sube al Tramo 2 y se sumarán Q25 de cobranza"*), Marta se enterará del recargo punitivo hasta que Byron llegue a cobrarle el día 45. Enterarse "después" en lugar de "antes" rompe la confianza y genera disputas legales o que el cliente abandone el pago por considerarlo un robo.
