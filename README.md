# Sistema de Gestión de Microcrédito con Asistente Gerencial Inteligente
### Crédito Vecino, S. A. — Proyecto Final
**Curso:** Análisis de Sistemas II (037) — Universidad Mariano Gálvez de Guatemala  
**Ciclo:** Segundo Semestre 2026 — Sección "B"  
**Modalidad:** Proyecto Grupal  

---

### Integrantes del Equipo (Grupo No. 2)
* **Sergio Leonel Santos Ruano** (7690-23-433) — [SergioLSantosR](https://github.com/SergioLSantosR)
* **Emersson Steve Alvizures Palma** (7690-23-12526) — [SteveAlvizures](https://github.com/SteveAlvizures)
* **Carlos Fernando Cachin Montealegre** (7690-23-17107) — [CACHIN1563](https://github.com/CACHIN1563)
* **José Javier Escobar Meletz** (7690-23-5367) — [JavMan2205](https://github.com/JavMan2205)

---

### Enlaces de Entrega Oficial (Entregables Sección 6 y 7)

* **Video de Defensa Oficial (Sección 7):**  
  👉 `[ENLACE_AL_VIDEO_DE_DEFENSA_AQUI]` *(Espacio reservado para enlace de YouTube / Drive / Loom)*

* **Documento Técnico de Arquitectura, RAG y Evals (PDF):**  
  👉 `[docs/PF_AsistenteGerencial_Grupo02.pdf]` *(Espacio reservado para el archivo PDF final conforme a la Sección 6.2)*

---

## 1. Visión General del Sistema

El **Proyecto Final de Crédito Vecino, S. A.** consolida y evoluciona el núcleo de cálculo financiero (Proyecto 1 y 2) integrándolo con:
1. **Interfaz Web Completa (React 19 + TypeScript + Vite + Tailwind CSS):** Implementación responsiva fiel de las 7 pantallas prototipadas en Figma.
2. **Capa de Persistencia y Carga Canónica (PGlite / PostgreSQL WASM):** Base de datos embebida con verificación criptográfica SHA-256 e idempotencia estricta.
3. **Servidor MCP (Model Context Protocol):** 8 herramientas con contratos Zod, principio de menor privilegio y confirmación humana obligatoria (Human-in-the-Loop) para operaciones transaccionales.
4. **Motor RAG con Citación Formal y Defensa OWASP LLM01:** Recuperación semántica de políticas institucionales (`POL-2024-01.md` a `POL-2026-10.md`), citación de fuentes y resistencia activa a inyección de instrucciones en notas de campo (`NOTA-CAMPO-07.md`).
5. **Asistente Gerencial Inteligente:** Razonamiento formal en el dominio de microcrédito, refutación activa de premisas falsas y consultas analíticas en lenguaje natural.

---

## 2. Estructura del Repositorio (Anexo C)

El repositorio sigue una arquitectura en capas desacoplada y modular:

```text
.
├── datos/                          # Paquete de datos canónico inmutable al 31-oct-2026
│   ├── asesores.csv                # Catálogo de 6 asesores de campo
│   ├── clientes.csv                # 60 clientes registrados
│   ├── creditos.csv                # 75 créditos colocados
│   ├── pagos.csv                   # 228 pagos históricos
│   ├── eventos.jsonl               # Bitácora fuente de verdad para repetición
│   ├── eventos.sha256              # Huella criptográfica canónica
│   ├── politicas.json              # Parámetros institucionales vigentes
│   └── corpus/                     # Documentos Markdown para el motor RAG
├── docs/                           # Documentación técnica y diagramas de arquitectura
│   ├── diagramas/                  # Diagramas C4 y arquitectura del sistema
│   └── informe-impacto-solid.md    # Justificación de principios SOLID
├── src/
│   ├── api/                        # Servidor HTTP REST (Express 5 + CORS + Middlewares)
│   │   └── servidor.ts             # Endpoints para interfaz web y herramientas
│   ├── dominio/                    # NÚCLEO PURO FINANCIERO (Proyecto 1 - Incremental)
│   │   ├── dinero.ts               # Manejo de dinero en centavos enteros con decimal.js
│   │   ├── plan-amortizacion.ts    # Sistema Francés con cuota nivelada y regla del centavo
│   │   ├── calculadora-mora.ts     # Cálculo de mora plana y escalonada por tramos
│   │   ├── prelacion-pago.ts       # Orden legal Art. 1453 (Gastos -> Mora -> Interés -> Capital)
│   │   └── estado-credito.ts       # Máquina de estados finitos del ciclo crediticio
│   ├── mcp/                        # SERVIDOR MCP (Model Context Protocol)
│   │   └── servidor-mcp.ts         # 8 herramientas MCP con validación Zod y Human-in-the-Loop
│   ├── persistencia/               # Base de datos embebida PGlite y cargador canónico
│   │   ├── db.ts                   # Conexión y esquema relacional PostgreSQL WASM
│   │   ├── cargador.ts             # Verificador SHA-256 e importador idempotente
│   │   └── repositorio.ts          # Consultas y agregaciones de cartera, cierres y moras
│   └── rag/                        # MOTOR RAG Y ASISTENTE INTELIGENTE
│       ├── motor-rag.ts            # Chunking, embeddings TF-IDF, similitud y citación formal
│       ├── seguridad.ts            # Filtro contra Prompt Injection (OWASP LLM01)
│       └── asistente-gerencial.ts  # Orquestador del asistente y refutación de incoherencias
├── tests/                          # SUITE AUTOMATIZADA DE PRUEBAS (Vitest)
│   ├── carga.test.ts               # Verificación SHA-256 e idempotencia del cargador
│   ├── mcp.test.ts                 # Contratos y comportamiento del servidor MCP
│   ├── evals/evals.test.ts         # Evaluaciones formales E6 de consultas gerenciales
│   └── *.test.ts                   # Pruebas unitarias del núcleo financiero (77 pruebas totales)
├── web/                            # APLICACIÓN WEB SPA (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── api/client.ts           # Cliente HTTP conectado a la API de Crédito Vecino
│   │   ├── components/             # 7 Pantallas implementadas según prototipo de Figma
│   │   │   ├── PortalPerfiles.tsx  # Portal de acceso por perfil (Asesor, Cliente, Gerente)
│   │   │   ├── SolicitudCredito.tsx# Originación y simulación francesa (OP-3)
│   │   │   ├── RegistroPago.tsx    # Cobranza con prelación, idempotencia y HITL (OP-1, OP-2)
│   │   │   ├── DetalleCredito.tsx  # Estado de cuenta de clientes
│   │   │   ├── PlanAmortizacion.tsx# Tabla de cuotas niveladas y regla del centavo
│   │   │   ├── DetalleMora.tsx     # Explicabilidad tramo a tramo (G-5, G-7)
│   │   │   ├── TableroGerencial.tsx# Indicadores PAR>30 y salud de cartera (G-1, G-4)
│   │   │   ├── Cierres.tsx         # Cierres contables diario y mensual (G-2, G-3)
│   │   │   └── ChatGerencial.tsx   # Panel lateral del Asistente IA con memoria
│   │   ├── App.tsx                 # Enrutamiento de vistas y responsividad
│   │   └── main.tsx                # Punto de entrada de la UI
│   ├── index.html
│   └── package.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 3. Modelo de Lenguaje y Herramientas de IA Empleadas

En cumplimiento con la Sección 11 del enunciado de cátedra:

### 3.1. Modelo de Lenguaje Base y Orquestación
* **Modelo Utilizado:** **Google Gemini 2.5 Pro** / **Claude 3.5 Sonnet** integrado mediante el estándar **Model Context Protocol (MCP)**.
* **Orquestación de Herramientas:** El Asistente Gerencial interactúa con el sistema a través del servidor MCP local (`src/mcp/servidor-mcp.ts`). El LLM no calcula matemáticas por su cuenta ni consulta directamente la base de datos: razona sobre las intenciones del usuario, delega el cálculo a las funciones deterministas del núcleo financiero y expone la respuesta con citas formales.
* **Control de Dominio y Refutación de Premisas:** Se diseñó una capa de validación semántica que detecta contradicciones lógicas (e.g., reclamos de cuotas inexistentes, solicitudes de anatocismo o aseveraciones de que un crédito con deuda ya está cancelado), refutando la falsedad con datos auditables del núcleo.

### 3.2. Herramientas de Asistencia Utilizadas por el Equipo
* **Antigravity AI (Google DeepMind):** Empleado como asistente de programación en pair programming para acelerar el tipado estricto en TypeScript, el diseño de contratos Zod, la configuración de PGlite en WebAssembly y la implementación de componentes React responsivos con Tailwind CSS.
* **Figma & Figma Make:** Prototipado y diseño de interfaz de usuario de las 7 pantallas del Proyecto 2.
* **Node.js & Vitest:** Harness de pruebas automatizadas y evaluación continua de invariantes financieras.

---

## 4. Instrucciones de Instalación y Puesta en Marcha

### 4.1. Requisitos Previos
* **Node.js:** Versión 20 LTS o superior (`node -v`).
* **npm:** Versión 9 o superior (`npm -v`).
* **Git:** Para control de versiones.

### 4.2. Instalación de Dependencias
Ejecute en la raíz del proyecto para instalar las dependencias del backend y del frontend:
```bash
# 1. Dependencias del backend, núcleo, MCP y base de datos
npm install

# 2. Dependencias de la interfaz de usuario web
npm --prefix web install
```

### 4.3. Carga Canónica de Datos y Verificación Criptográfica SHA-256
Ejecute el cargador canónico para validar la huella del archivo `eventos.jsonl` e inicializar la base de datos PGlite:
```bash
npm run cargar
```
*Salida esperada:*
```text
======================================================
  SISTEMA DE GESTIÓN DE MICROCRÉDITO · CRÉDITO VECINO
  Carga Canónica de Datos al 31 de octubre de 2026
  Directorio de datos: ./datos
======================================================

✔ HUELLA SHA-256 VERIFICADA CORRECTAMENTE [EN VERDE]:
  e2d46283de8578f19ea2eb14ace283573ebb729aaa0e9b0e65f80a348e4b9d50

✔ RESUMEN DE CARGA CANÓNICA COMPLETADA EXITOSAMENTE:
  ✔ Clientes:        60 (Esperado: 60)
  ✔ Créditos:        75 (Esperado: 75)
  ✔ Pagos:           228 (Esperado: 228)
  ✔ Asesores:        6 (Esperado: 6)
  ✔ Documentos RAG:  7 (Esperado: 7)

Estado: Cartera canónica al 31 de octubre de 2026 cargada e inmutable.
```

### 4.4. Ejecución de la Suite de Pruebas Automatizadas (Entregable E6)
Para ejecutar la suite completa de 77 pruebas unitarias, de integración y evaluaciones formales (Evals):
```bash
npm test
```
*Resultado garantizado:* **11 suites de pruebas ejecutadas, 77 pruebas pasadas (100% éxito)**.

### 4.5. Levantamiento de la Aplicación en Modo Desarrollo o Producción

#### Opción A: Modo Producción Unificado (Recomendado)
```bash
# Compilar la aplicación web
npm run build:web

# Iniciar servidor unificado (API + Frontend en puerto 3001)
npm start
```
Abra en su navegador: **`http://localhost:3001`**

#### Opción B: Modo Desarrollo con Hot Reload (HMR)
En dos terminales separadas:
* **Terminal 1 (Backend API):**
  ```bash
  npm run dev
  ```
  *Escuchando en `http://localhost:3001`*

* **Terminal 2 (Frontend React + Vite):**
  ```bash
  npm run dev:web
  ```
  *Escuchando en `http://localhost:5173`*

---

## 5. Variables de Entorno

El sistema incluye valores predeterminados seguros para ejecución local inmediata, configurables mediante archivo `.env` o variables de shell:

| Variable | Descripción | Valor Predeterminado | Obligatoria |
|:---|:---|:---:|:---:|
| `PORT` | Puerto de escucha del servidor Express (API y web unificada) | `3001` | No |
| `CV_DATA_DIR` | Ruta al directorio del paquete de datos canónico | `./datos` | No |
| `CV_DB_PATH` | Directorio de almacenamiento persistente de PGlite | `./src/persistencia/data` | No |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) | `development` | No |

---

## 6. Mapeo de Operaciones y Consultas Evaluadas

| Clave | Descripción de la Operación / Consulta | Componente / Herramienta |
|:---:|:---|:---|
| **OP-1** | Pago cuota 1 de `CV-2026-0043` (Q561.87) con prelación legal | `RegistroPago.tsx` / `registrar_pago` (HITL) |
| **OP-2** | Explicación detallada de mora de `CV-2026-0035` (Q288.05) | `DetalleMora.tsx` / `explicar_mora` |
| **OP-3** | Simulación de crédito nivelado francés (Q10,000 / 12m / 36%) | `SolicitudCredito.tsx` / `simular_credito` |
| **OP-4** | Reintento de pago con clave de idempotencia existente | `RegistroPago.tsx` / Middleware Idempotencia |
| **OP-5** | Rechazo por monto inexacto en `CV-2026-0061` | `RegistroPago.tsx` / Validación de Pago Exacto |
| **OP-6** | Bloqueo estricto de pago en crédito incobrable `CV-2026-0015` | `RegistroPago.tsx` / Control de Incobrables |
| **OP-7** | Neutralización de Prompt Injection en `NOTA-CAMPO-07.md` | `MotorRAG` / Filtro OWASP LLM01 |
| **G-1** | Tablero de cartera al 31-oct-2026 (PAR>30 = 11.93%) | `TableroGerencial.tsx` / `consultar_cartera` |
| **G-2** | Cierre mensual de octubre 2026 (Colocación: Q41k / Recaudo: Q36.5k) | `Cierres.tsx` / `consultar_cierre` |
| **G-3** | Cierre diario del 31 de octubre de 2026 (0 movimientos) | `Cierres.tsx` / `consultar_cierre` |
| **G-4** | Identificación de 7 créditos en Mora 3 (61-90 días) | `TableroGerencial.tsx` / `listar_creditos_mora` |
| **G-5** | Explicación de estado y cuota 3 de `CV-2026-0030` (65 días atraso) | `DetalleCredito.tsx` / `consultar_credito` |
| **G-6** | Proyección de cuotas por vencer en ventana de 7 y 30 días | `TableroGerencial.tsx` / `ver_proximos_vencimientos` |
| **G-7** | Cálculo a fecha futura (24-ene-2027) con mora escalonada | `ChatGerencial.tsx` / `explicar_mora` |
| **G-8** | RAG con citación formal de políticas institucionales | `ChatGerencial.tsx` / `MotorRAG` |

---

## 7. Declaración de Integridad y Regla de Incrementalidad

* **Regla de Incrementalidad:** El núcleo financiero implementado en el Proyecto 1 no fue reescrito. Las funciones de cálculo, redondeo por centavo y amortización francesa alimentan directamente el repositorio de persistencia, el servidor MCP y las pantallas de la interfaz web.
* **Control de Calidad:** Las 77 pruebas automatizadas garantizan que no existan discrepancias entre las cifras emitidas por el núcleo financiero y lo presentado en pantalla o respondido por el Asistente Gerencial Inteligente.
