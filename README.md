# Sistema de Gestión de Microcrédito — Crédito Vecino, S. A.

**Proyecto 1 - Arquitectura y diseño de componentes**  
**Curso:** Análisis de Sistemas II (037) - Universidad Mariano Gálvez de Guatemala  
**Sección:** "B"  
**Modalidad:** Sabatina - Proyecto Grupal  

### Integrantes del Equipo
* Sergio Leonel Santos Ruano (7690-23-433)
* Emersson Steve Alvizures Palma (7690-23-12526)
* Carlos Fernando Cachin Montealegre (7690-23-17107)
* José Javier Escobar Meletz (7690-23-5367)

---

## 1. Descripción del Proyecto

Este repositorio contiene la Fase 1 del proyecto integrador para la fintech **Crédito Vecino, S. A.** 
El objetivo principal de esta fase es establecer el **núcleo de cálculo financiero ejecutable** (Walking Skeleton) aplicando los principios SOLID, GRASP y patrones de diseño (GoF), utilizando un estilo de **Arquitectura Hexagonal**.

El diseño de este motor se centra en la exactitud matemática y la inmutabilidad de las operaciones monetarias para evitar errores de redondeo y punto flotante. Asimismo, cumple estrictamente con el marco legal aplicable en Guatemala:
* **Decreto 25-2016:** Ley de Entidades de Microfinanzas.
* **Resolución JM-47-2022:** Reglamento para la Administración del Riesgo de Crédito.
* Prohibición legal de **anatocismo** (capitalización de intereses moratorios).

## 2. Estructura del Repositorio

Cumpliendo con los lineamientos del Anexo C del enunciado, el proyecto se estructura de la siguiente manera:

```text
/
├── README.md             # Descripción, ejecución y herramientas IA
├── package.json          # Scripts de ejecución (npm test)
├── tsconfig.json         # Configuración de TypeScript en modo strict
├── src/dominio/          # Núcleo puro de dominio (E4) - Sin dependencias externas
├── tests/                # Pruebas unitarias de invariantes y casos de referencia
└── docs/                 # Carpeta contenedora de entregables documentales
    ├── adr/              # Registros de decisiones de arquitectura (ADR)
    ├── api/              # Especificaciones y contratos OpenAPI
    └── diagramas/        # Diagramas editables (UML, C4 en Mermaid/PlantUML)
```

## 3. Stack Tecnológico Obligatorio

* **Runtime:** Node.js 20 LTS o superior.
* **Lenguaje:** TypeScript (`strict: true`).
* **Framework de pruebas:** Vitest.
* **Librería de Dinero:** `decimal.js` (para la gestión de dinero exacto en centavos).

## 4. Instrucciones de Instalación y Ejecución

Al tratarse exclusivamente del **núcleo de dominio puro** (Fase 1), este proyecto no requiere levantar un servidor HTTP (Express) ni conectarse a una base de datos (PostgreSQL). Toda la verificación de la arquitectura, diseño y reglas de negocio se realiza a través de las pruebas unitarias.

### 4.1. Requisitos Previos
* [Node.js](https://nodejs.org/es/) (Versión 20 LTS recomendada).
* Git instalado en tu entorno local.

### 4.2. Instalación
Abre tu terminal, ubícate en la carpeta donde deseas guardar el proyecto y ejecuta:

```bash
# Clonar el repositorio localmente
git clone https://github.com/CACHIN1563/Analisis-Sistemas-II-Proyecto1.git

# Entrar al directorio del proyecto
cd Analisis-Sistemas-II-Proyecto1

# Instalar todas las dependencias necesarias
npm install
```

### 4.3. Ejecución del Núcleo Ejecutable (Pruebas)
Para validar que el "Walking Skeleton" reproduce exactamente los datos del caso de referencia (Sección 6.4.1 y 6.8.1) y que no se viola ninguna de las invariantes del dominio, ejecuta el script de pruebas automatizadas:

```bash
npx vitest run
```
*Salida esperada:* La consola ejecutará los archivos dentro de la carpeta `/tests` en milisegundos, evaluando el objeto `Dinero`, los cálculos de `Mora` y el patrón de `Plan de Amortización`. Deberás visualizar un mensaje indicando que todas las pruebas pasaron exitosamente (`✓ X passed`).

---

## 5. Declaración de Herramientas de Inteligencia Artificial (IA)

En cumplimiento con la sección 13 de Integridad Académica del curso, declaramos que durante el desarrollo de este proyecto se utilizaron herramientas de Inteligencia Artificial bajo el rol de asistentes de apoyo a la programación y diseño. Específicamente:

* **Google Gemini / Antigravity IDE:** Utilizado como asistente interactivo para la validación de la sintaxis estricta de TypeScript, la correcta implementación de la librería `decimal.js` para evitar el uso del `Number` nativo en el Objeto de Valor `Dinero`, y como apoyo para generar las plantillas de diagramas y la estructuración de carpetas inicial.
* Todo el código de negocio, decisiones arquitectónicas y lógica financiera fue revisado, comprendido y validado manualmente por el equipo de trabajo para garantizar el fiel cumplimiento del enunciado.

### GLOSARIO
* [GLOSARIO](https://nodejs.org/es/) 
