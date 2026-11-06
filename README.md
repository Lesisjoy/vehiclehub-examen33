# VehicleHub — Examen 3.3

Frontend de catálogo automotriz para la práctica **Tema 3 — Integración IPv6 entre servicios distribuidos** de Escalamiento de Redes, TecNM Campus Pachuca.

VehicleHub se despliega en Vercel y consume dos APIs FastAPI mediante funciones serverless del mismo origen. El navegador nunca se conecta directamente a EC2 ni a MySQL.

## Arquitectura

```text
Navegador HTTPS
      |
      v
Vercel (frontend + proxy /api)
      | HTTP público controlado
      +-------------------------+
      v                         v
FastAPI autos :5000       FastAPI motos :8000
      | IPv6 + Peering          | IPv6 + Peering
      +-------------+-----------+
                    v
               MySQL :3306
```

- `GET /api/automoviles` reenvía la solicitud a `API_AUTOS_URL`.
- `GET /api/motocicletas` reenvía la solicitud a `API_MOTOS_URL`.
- Cada API FastAPI debe consultar MySQL mediante IPv6 y su ruta `pcx-...` de VPC Peering.
- MySQL `:3306` no debe estar expuesto públicamente.
- El navegador solo solicita rutas relativas `/api/...`, por lo que no depende de CORS con EC2.

## Funcionalidad

- Automóviles como categoría inicial y cambio independiente a motocicletas.
- Datos exclusivamente reales; no existen catálogos ficticios ni fallbacks simulados.
- Normalización de arreglos directos y objetos con `automoviles`, `motocicletas`, `vehiculos`, `datos`, `data` o `items`.
- Búsqueda instantánea por marca/modelo y ordenamiento local.
- Estados completos de carga, éxito, vacío, error y reintento.
- Una categoría puede funcionar aunque la otra API esté fuera de línea.
- Actualización manual sin caché para demostrar cambios hechos en MySQL.
- Renderizado seguro de datos remotos mediante `textContent`.

## Variables de entorno

Copia `.env.example` como `.env.local` únicamente para desarrollo local:

```dotenv
API_AUTOS_URL=http://IP_PUBLICA_EC2_ALUMNO2:5000/api/automoviles
API_MOTOS_URL=http://IP_PUBLICA_EC2_ALUMNO3:8000/api/motocicletas
API_AUTOS_KEY=REEMPLAZAR_POR_SECRETO_DEL_ALUMNO2
API_PROXY_TOKEN=REEMPLAZAR_POR_SECRETO_LARGO
```

`API_AUTOS_KEY` protege la API de automóviles. `API_PROXY_TOKEN` se mantiene como la clave compartida de motocicletas. Ambas se envían desde las funciones de Vercel mediante `X-API-Key`; nunca llegan al navegador ni se guardan en Git.

Si una instancia EC2 cambia de IPv4 pública después de `Stop/Start`:

1. Obtén la nueva IPv4 pública.
2. Actualiza `API_AUTOS_URL` o `API_MOTOS_URL` en **Vercel → Project → Settings → Environment Variables**.
3. Ejecuta un nuevo despliegue de producción.
4. Prueba el endpoint proxy correspondiente y la categoría en la interfaz.

## Desarrollo y pruebas

Requisitos: Node.js 24 o una versión compatible con `fetch`, `Response` y el runner de pruebas nativo.

```bash
npm install
npm run check
npm test
```

Para probar las funciones serverless localmente se recomienda Vercel CLI:

```bash
vercel dev
```

Un servidor estático permite revisar el diseño, pero las rutas `/api` requieren `vercel dev` o un despliegue real.

## Publicación en GitHub y Vercel

1. Crea un repositorio nuevo, por ejemplo `vehiclehub-examen33`.
2. Inicializa Git en esta carpeta, confirma los archivos y sube la rama principal.
3. Importa el repositorio como un proyecto nuevo en Vercel.
4. Agrega `API_AUTOS_URL`, `API_AUTOS_KEY`, `API_MOTOS_URL` y `API_PROXY_TOKEN` en los entornos necesarios.
5. Despliega y confirma que el proyecto sea público si se usará como evidencia o portafolio.
6. Prueba:
   - `/api/automoviles`
   - `/api/motocicletas`
   - cambio entre ambas categorías
   - botón **Actualizar datos**

## Contrato esperado de las APIs

Las APIs pueden responder con un arreglo directo:

```json
[{ "id": 1, "marca": "...", "modelo": "..." }]
```

O con una colección reconocida:

```json
{ "automoviles": [{ "id": 1, "marca": "..." }] }
```

Campos soportados de forma especial: `id`, `vehiculo_id`, `tipo`, `marca`, `modelo`, `anio`/`año`, `color` y `precio`. Otros valores escalares se muestran de forma complementaria sin inventar información ausente.

La API de automóviles debe obtener sus datos mediante `sp_automoviles()` y la API de motocicletas mediante `sp_motocicletas()`.

## Evidencias pendientes de la práctica

No se incluyen capturas ficticias. Durante la demostración se recomienda obtener evidencia de:

- Catálogo de automóviles con registros reales.
- Catálogo de motocicletas con registros reales.
- Respuesta de ambos endpoints proxy de Vercel.
- Cambio en MySQL visible después de pulsar **Actualizar datos**.
- Estado de error con una API detenida y recuperación al encenderla.
- Reglas de seguridad sin exposición pública de MySQL `:3306`.
- Rutas IPv6 de las VPC remotas apuntando al peering `pcx-...`.

## Seguridad

- No versionar `.env.local`, tokens, claves AWS, contraseñas MySQL ni IPv4 privadas.
- Restringir los Security Groups de EC2 a los puertos mínimos necesarios.
- Validar `X-API-Key` en ambas APIs si se configura `API_PROXY_TOKEN`.
- Los proxies aceptan solo `GET`, usan timeout, `Cache-Control: no-store` y no reenvían mensajes internos del origen.

## Estructura

```text
index.html
styles.css
app.js
data.js
api/
  _proxy.js
  automoviles.js
  motocicletas.js
test/
  data.test.js
  proxy.test.js
.env.example
.gitignore
package.json
README.md
```
