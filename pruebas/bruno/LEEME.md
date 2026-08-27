# Colección de Bruno — Semana 6

Misma cobertura que la colección de Postman (2 casos exitosos + 7 de error,
con pruebas automáticas), en el formato nativo de Bruno.

## Por qué Bruno además de Postman

Bruno guarda cada petición como un archivo `.bru` de texto plano, pensado
para vivir dentro del repositorio y revisarse con `git diff` como cualquier
otro archivo de código — no depende de una cuenta en la nube. Es coherente
con el criterio de herramientas locales y gratuitas del curso (el mismo que
recomienda Ollama en vez de un LLM en la nube para datos sensibles).

## Puesta en marcha

**Con la aplicación de escritorio:**
1. Instale Bruno (gratuito): https://www.usebruno.com
2. **Open Collection** → seleccione la carpeta `sgmc-semana6/`.
3. Seleccione el environment **local** (arriba a la derecha).
4. Levante Prism (ver LEEME.md de la carpeta postman) y ejecute las peticiones.

**Con el CLI (sin interfaz gráfica), útil para automatizar:**
```bash
npm install -g @usebruno/cli
cd sgmc-semana6
bru run --env local -r
```
Debe reportar 9 peticiones y 21 pruebas en verde.
