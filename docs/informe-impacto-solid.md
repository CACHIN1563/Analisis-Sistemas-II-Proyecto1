# Informe de Impacto SOLID (Entregable E6)

A continuación, se presenta el análisis técnico de la evolución del núcleo del sistema (Proyecto 2), detallando cómo se aplicaron los principios SOLID para incorporar los nuevos requisitos comerciales sin afectar la estabilidad del código heredado del Proyecto 1.

## 1. Principio Abierto/Cerrado (OCP)
El diseño se mantuvo **abierto a la extensión, pero cerrado a la modificación**. Como evidencia principal, la clase original `CalculadoraMora` no sufrió alteraciones para soportar la mora escalonada. En su lugar, se implementó el Patrón Strategy mediante la interfaz `IPoliticaMora`, permitiendo inyectar nuevas reglas de negocio (como `PoliticaPlana` y `PoliticaEscalonada`). Esto garantiza que futuros cambios en las políticas de cobro no impacten el motor de cálculo matemático subyacente.

## 2. Principio de Sustitución de Liskov (LSP)
Para validar el cumplimiento de este principio, se desarrolló la clase `PoliticaRetroactiva` como una batería de prueba exclusiva. Se comprobó mediante la suite de pruebas que el sistema es capaz de intercambiar entre las tres políticas (`Plana`, `Escalonada`, `Retroactiva`) utilizando la misma interfaz `IPoliticaMora`, sin alterar el comportamiento esperado del sistema. Todas cumplen el contrato retornando valores exactos tipo `Dinero` y respetando las precondiciones.

## 3. Principio de Responsabilidad Única (SRP)
Con el fin de evitar el antipatrón de "Clase Dios", se refactorizó el código separando las responsabilidades en módulos independientes:
- La lógica para determinar el tramo de mora se aisló en `clasificacion-tramo.ts`.
- La regla comercial para aplicar el recargo de Q25 se encapsuló en `gasto-gestion-cobro.ts`.
- La resolución de qué política aplicar según la fecha del crédito se asignó a `catalogo-politicas.ts`.
Esta división asegura que cada archivo tenga una única razón para cambiar.

## 4. Invariantes y Suspensión de Devengo (CP-04)
Se protegió la integridad de las reglas de negocio asegurando que los invariantes del sistema no se rompan. Específicamente, se implementó la transición correcta hacia la suspensión del devengo (CP-04.2). El sistema detecta cuando un crédito supera el día 90 y detiene la acumulación de interés corriente, trasladando los montos a la cuenta de "interés en suspenso". Esto mantiene la coherencia del estado del crédito y evita reportar utilidades no percibidas.

## 5. Oráculo de Pruebas y Determinismo
La evolución del núcleo se validó mediante un enfoque estricto en pruebas de regresión. Se logró replicar con exactitud matemática los casos de uso propuestos (M-1 a M-5), incluyendo el cálculo preciso de Q1,047.76 para el pago total del caso M-5. Asimismo, el desglose de la cartera en riesgo arrojó un resultado exacto del 7.00%. Todo esto fue posible gracias al uso de `decimal.js`, garantizando la precisión financiera exigida.
