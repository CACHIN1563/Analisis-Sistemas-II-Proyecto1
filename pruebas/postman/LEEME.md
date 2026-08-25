# Colección de Postman — Semana 6

Nueve peticiones precargadas contra el contrato del SGMC: 2 casos exitosos
(200 y 201) y 7 casos de error, cada uno con su prueba automática (`pm.test`)
que verifica el código HTTP y que el `status` dentro del cuerpo coincide.

## Puesta en marcha

1. Levante el servidor simulado:
   ```bash
   cd ../../solucion   # o starter, una vez completados los TODO
   npx @stoplight/prism-cli mock openapi.yaml
   ```
2. En Postman: **File → Import** → seleccione ambos archivos de esta carpeta
   (`SGMC-Semana6.postman_collection.json` y `SGMC-Local.postman_environment.json`).
3. Seleccione el environment **«SGMC · Local (Prism)»** en la esquina superior derecha.
4. Ejecute las peticiones una por una, o use **Collection Runner** para correrlas todas.

## La cabecera `Prefer`

Cuando una operación define varias respuestas posibles para el mismo método
(por ejemplo 404, 409, 422, 429 y 500), Prism no puede adivinar cuál quiere
usted probar. La cabecera `Prefer: code=XXX` se lo indica explícitamente.
Sin ella, Prism siempre responde con el primer caso exitoso que encuentre.

Esto incluye los casos exitosos: `POST /pagos` define tanto 200 (reintento)
como 201 (registro nuevo), así que incluso la petición «201 · Pago
registrado» lleva `Prefer: code=201` — de lo contrario Prism responde 200.
