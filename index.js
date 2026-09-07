const express = require('express');
const app = express();
const PORT = process.env.PORT || 8004;

// URLs de los otros microservicios (variables de entorno, nunca hardcodear localhost en producción)
const CATALOGO_URL = process.env.CATALOGO_URL || 'http://localhost:8001';
const PARTIDAS_URL = process.env.PARTIDAS_URL || 'http://localhost:8002';
const MEMBRESIAS_URL = process.env.MEMBRESIAS_URL || 'http://localhost:8003';

// Función helper: hace un fetch con manejo de error (si el micro no responde, devuelve null)
async function fetchSeguro(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.log(`No se pudo conectar a ${url}:`, error.message);
    return null;
  }
}

app.get('/perfil/:nombre_jugador', async (req, res) => {
  const nombre = req.params.nombre_jugador;

  // Datos MOCK por ahora (mientras los otros micros no estén listos)
  // Cuando existan de verdad, esto se reemplaza por las llamadas fetchSeguro()
  const partidas = await fetchSeguro(`${PARTIDAS_URL}/partidas?jugador=${nombre}`) || [
    { id: 1, juego_id: 5, fecha: '2026-08-20', resultado: 'ganó' },
    { id: 2, juego_id: 3, fecha: '2026-08-25', resultado: 'perdió' }
  ];

  const membresia = await fetchSeguro(`${MEMBRESIAS_URL}/clientes/${nombre}`) || {
    plan: 'premium',
    reservas: [{ mesa: 4, horario: '2026-09-10 18:00', estado: 'confirmada' }]
  };

  // Para cada partida, traducimos juego_id a nombre real del juego (mock también)
  const partidasConNombreJuego = await Promise.all(
    partidas.map(async (p) => {
      const juego = await fetchSeguro(`${CATALOGO_URL}/juegos/${p.juego_id}`) || { titulo: `Juego #${p.juego_id} (mock)` };
      return { ...p, juego_nombre: juego.titulo };
    })
  );

  // Respuesta consolidada
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