const express = require('express');
const app = express();
const PORT = process.env.PORT || 8004;


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

app.get('/perfil/:nombre_jugador', async (req, res) => {
  const nombre = req.params.nombre_jugador;

  //Uso de microservicio 3
  let membresia = { plan: 'premium', reservas: [{ mesa: 4, horario: '2026-09-10 18:00', estado: 'confirmada' }] }; // valor por defecto (mock)

  const listaClientes = await fetchSeguro(`${MEMBRESIAS_URL}/clientes`);
  if (listaClientes) {
   
    for (const cliente of listaClientes) {
      if (cliente.nombre === nombre) {
        membresia = { plan: cliente.plan, reservas: cliente.reservas };
      }
    }
  }

  //Uso de microservicio 2
  let partidas = [
    { id: 1, juego_id: 5, fecha: '2026-08-20', resultado: 'ganó' },
    { id: 2, juego_id: 3, fecha: '2026-08-25', resultado: 'perdió' }
  ]; 

  const listaPartidas = await fetchSeguro(`${PARTIDAS_URL}/partidas`);
  if (listaPartidas) {

     for (const partidaResumida of listaPartidas) {
      const partidaCompleta = await fetchSeguro(`${PARTIDAS_URL}/partidas/${partidaResumida.id}`);

      if (partidaCompleta && partidaCompleta.jugadores && partidaCompleta.jugadores.includes(nombre)) {
        partidasDelJugador.push(partidaCompleta);
      }
    }

    partidas = partidasDelJugador; 
  }
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

app.listen(PORT, () => {
  console.log(`Microservicio 4 (Perfil de jugador) corriendo en puerto ${PORT}`);
});