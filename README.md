# Microservicio 4 — Perfil de Jugador

| Microservicio | Rol | Puerto | Qué se consulta |
|---|---|---|---|
| MS1 – Catálogo de juegos (Python + MySQL) | Traducir `juego_id` a nombre real del juego | 8001 | `GET /juegos/{id}` |
| MS2 – Partidas jugadas (Java + PostgreSQL) | Partidas en las que participó el jugador | 8002 | `GET /partidas`, `GET /partidas/{id}` |
| MS3 – Membresías y reservas (Node.js + MongoDB) | Plan y reservas del jugador | 8003 | `GET /clientes` |

Este microservicio corre en el puerto **8004**.

## Tecnologías

- Node.js 20 + Express 4
- `cors` para habilitar el consumo desde el frontend (AWS Amplify)
- `swagger-ui-express` + `yamljs` para la documentación OpenAPI
- Docker (`node:20-alpine`)

## Endpoints

### `GET /perfil?nombre_jugador={nombre}`

Devuelve la ficha consolidada del jugador. El parámetro `nombre_jugador` es **obligatorio**; sin él responde `400`.

Ejemplo:

```bash
curl "http://localhost:8004/perfil?nombre_jugador=Ana%20Torres"
```

Respuesta `200`:

```json
{
  "jugador": "Ana Torres",
  "membresia": "premium",
  "reservas": [
    { "mesa": 4, "horario": "2026-09-10 18:00", "estado": "confirmada" }
  ],
  "partidas": [
    {
      "id": 1,
      "juego_id": 5,
      "fecha": "2026-08-20",
      "resultado": "ganó",
      "juego_nombre": "Catan"
    }
  ]
}
```

Respuesta `400`:

```json
{ "error": "Falta el parámetro nombre_jugador" }
```

### `GET /perfil/lista`

Devuelve la lista de nombres de jugadores (tomados de los clientes de MS3). Útil para poblar un selector en el frontend.

```json
["Ana Torres", "Luis Pérez", "María Gómez"]
```

Si MS3 no responde, devuelve `[]`.

### `GET /api-docs`

Documentación Swagger UI generada desde `perfil-jugador.yaml`.

## Cómo funciona `/perfil`

1. **MS3 (membresías):** llama a `GET /clientes` y busca al cliente cuyo nombre coincide con `nombre_jugador` (comparación sin distinguir mayúsculas ni espacios en los extremos). De ahí saca `plan` y `reservas`.
2. **MS2 (partidas):** llama a `GET /partidas`, luego pide el detalle de cada una con `GET /partidas/{id}` y se queda con las partidas cuya lista `jugadores` incluye al jugador.
3. **MS1 (catálogo):** por cada partida llama a `GET /juegos/{juego_id}` y agrega el campo `juego_nombre` con el `titulo` del juego.
4. Combina todo en un único JSON.

### Tolerancia a fallos (mock)

Todas las llamadas HTTP pasan por `fetchSeguro`, que devuelve `null` si el microservicio no responde o responde con error. En ese caso se usan **datos mock**, de modo que el servicio se puede probar sin depender de que los otros tres estén levantados:

- MS3 caído → membresía `premium` con una reserva de ejemplo.
- MS2 caído → dos partidas de ejemplo.
- MS1 caído → `juego_nombre` con el formato `Juego #<id> (mock)`.

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `8004` | Puerto en el que escucha el servicio |
| `CATALOGO_URL` | `http://localhost:8001` | URL base de MS1 |
| `PARTIDAS_URL` | `http://localhost:8002` | URL base de MS2 |
| `MEMBRESIAS_URL` | `http://localhost:8003` | URL base de MS3 |

> **Importante:** dentro de Docker o en las VMs de producción `localhost` **no** apunta a los otros microservicios. Configura siempre estas variables con la IP/host o nombre de servicio correspondiente.

## Ejecución local

```bash
npm install
npm start
```

Con URLs personalizadas:

```bash
CATALOGO_URL=http://localhost:8001 \
PARTIDAS_URL=http://localhost:8002 \
MEMBRESIAS_URL=http://localhost:8003 \
npm start
```

Servicio: <http://localhost:8004> — Swagger: <http://localhost:8004/api-docs>

> Requiere Node.js 20 o superior (usa `fetch` nativo y `swagger-jsdoc` exige Node ≥ 20).

## Docker

```bash
docker build -t usuario/perfil-jugador .

docker run -d --name perfil-jugador -p 8004:8004 \
  -e CATALOGO_URL=http://<host-ms1>:8001 \
  -e PARTIDAS_URL=http://<host-ms2>:8002 \
  -e MEMBRESIAS_URL=http://<host-ms3>:8003 \
  usuario/perfil-jugador
```

Subir a Docker Hub:

```bash
docker push usuario/perfil-jugador
```

### Ejemplo con docker-compose

```yaml
services:
  perfil-jugador:
    image: usuario/perfil-jugador
    ports:
      - "8004:8004"
    environment:
      CATALOGO_URL: http://catalogo-juegos:8001
      PARTIDAS_URL: http://partidas-jugadas:8002
      MEMBRESIAS_URL: http://membresias-reservas:8003
```

## Estructura del proyecto

```
.
├── Dockerfile
├── index.js
├── package.json
├── package-lock.json
├── perfil-jugador.yaml   # documentación OpenAPI (Swagger)
└── README.md
```
