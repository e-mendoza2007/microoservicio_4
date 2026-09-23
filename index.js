const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8004;
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./perfil-jugador.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const CATALOGO_URL = process.env.CATALOGO_URL || 'http://localhost:8001';
const PARTIDAS_URL = process.env.PARTIDAS_URL || 'http://localhost:8002';
const MEMBRESIAS_URL = process.env.MEMBRESIAS_URL || 'http://localhost:8003';

async function fetchSeguro(url) {
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch (error) {
    console.log(`No se pudo conectar a ${url}`);
    return null;
  }
}

function norm(s) {
  return s?.trim().toLowerCase();
}


app.get('/perfil', async (req, res) => {
  const nombre = req.query.nombre_jugador;
  if (!nombre) {
    return res.status(400).json({ error: 'Falta el parámetro nombre_jugador' });
  }

  //Uso de microservicio 3
  let membresia = { plan: 'premium', reservas: [{ mesa: 4, horario: '2026-09-10 18:00', estado: 'confirmada' }] };

  const listaClientes = await fetchSeguro(`${MEMBRESIAS_URL}/clientes`);
  if (listaClientes) {
    for (const cliente of listaClientes) {
      if (norm(cliente.nombre) === norm(nombre)) {
        membresia = { plan: cliente.plan, reservas: cliente.reservas };
      }
    }
  }

  //Uso de microservicio 2
  let partidas = [];

  const partidasDelJugador = await fetchSeguro(`${PARTIDAS_URL}/partidas?jugador=${encodeURIComponent(nombre)}`);
  if (partidasDelJugador) {
    partidas = partidasDelJugador;
  }

  

  //Uso de microservicio 1
  const partidasConNombreJuego = [];
  for (const partida of partidas) {
    const juego = await fetchSeguro(`${CATALOGO_URL}/juegos/${partida.juego_id}`);
    const nombreJuego = juego ? juego.titulo : `Juego #${partida.juego_id} (mock)`;
    partidasConNombreJuego.push({ ...partida, juego_nombre: nombreJuego });
  }

  res.json({
    jugador: nombre,
    membresia: membresia.plan,
    reservas: membresia.reservas,
    partidas: partidasConNombreJuego
  });
});

app.get('/perfil/lista', async (req, res) => {
  const listaClientes = await fetchSeguro(`${MEMBRESIAS_URL}/clientes`);
  const nombres = listaClientes ? listaClientes.map(c => c.nombre) : [];
  res.json(nombres);
});

app.listen(PORT, () => {
  console.log(`Microservicio 4 (Perfil de jugador) corriendo en puerto ${PORT}`);
});