// Aquí vive TODO el estado del debate. Como no hay sockets, las pantallas
// preguntan por este estado con peticiones HTTP normales (polling).
const { NUM_RONDAS } = require('../config/env')
const gemini = require('./gemini.service')
const storage = require('./storage.service')

// estado: 'inactivo' | 'en_curso' | 'terminado' | 'error'
let debate = cargarInicial()

function cargarInicial() {
  const guardado = storage.leer()

  if (!guardado) {
    return { id: 0, estado: 'inactivo', pensando: null, historial: [], error: null, veredicto: null }
  }

  // Si el servidor se cayó a mitad del debate, o el debate anterior terminó en
  // error, se empieza limpio: así no reaparece un error viejo ya solucionado.
  // (id + 1 hace que las pantallas abiertas se redibujen desde cero.)
  if (guardado.estado === 'en_curso' || guardado.estado === 'error') {
    return { id: guardado.id + 1, estado: 'inactivo', pensando: null, historial: [], error: null, veredicto: null }
  }

  return guardado
}

function persistir() {
  storage.guardar(debate)
}

// Devuelve solo lo nuevo (desde la posición "desde") para no reenviar todo cada vez.
function obtenerEstado(desde = 0) {
  return {
    id: debate.id,
    estado: debate.estado,
    pensando: debate.pensando,
    error: debate.error,
    veredicto: debate.veredicto || null,
    total: debate.historial.length,
    totalRondas: NUM_RONDAS,
    nuevas: debate.historial.slice(desde)
  }
}

async function correrDebate(ladoInicial) {
  let ladoActual = null

  try {
    let ultimoMensaje = null // el primero en hablar abre el debate sin responder a nadie

    // Habla primero el lado que inició el debate; el otro responde.
    const orden = ladoInicial === 'derecha' ? ['derecha', 'izquierda'] : ['izquierda', 'derecha']

    for (let ronda = 1; ronda <= NUM_RONDAS; ronda++) {
      for (const lado of orden) {
        debate.pensando = lado
        ladoActual = lado // para saber qué API key falló si hay un error
        const texto = await gemini.generarRespuesta(ultimoMensaje, lado)
        ultimoMensaje = texto

        debate.historial.push({ ronda, lado, texto })
        persistir()
      }
    }

    // Al final, un jurado decide quién ganó. Si esto falla, el debate igual termina bien.
    debate.pensando = 'juez'
    persistir()
    try {
      debate.veredicto = await gemini.generarVeredicto(debate.historial)
    } catch (error) {
      console.error('Error en el veredicto:', error)
      debate.veredicto = { ganador: null, razon: 'No se pudo generar el veredicto: ' + gemini.mensajeAmigable(error, 'juez') }
    }

    debate.estado = 'terminado'
  } catch (error) {
    console.error('Error en el debate:', error)
    debate.estado = 'error'
    debate.error = gemini.mensajeAmigable(error, ladoActual)
  } finally {
    debate.pensando = null
    persistir()
  }
}

// ladoInicial: el lado de la pantalla que pulsó "Iniciar" (habla primero).
// Devuelve false si ya había un debate corriendo.
function iniciar(ladoInicial) {
  if (debate.estado === 'en_curso') return false

  debate = {
    id: debate.id + 1, // las pantallas usan el id para saber que empezó uno nuevo
    estado: 'en_curso',
    pensando: null,
    historial: [],
    error: null,
    veredicto: null
  }
  persistir()

  correrDebate(ladoInicial) // sin await: corre en segundo plano y la petición responde ya
  return true
}

module.exports = { obtenerEstado, iniciar }
