// Controla qué pantalla es el lado izquierdo y cuál el derecho.
// Cada pantalla se identifica con un clienteId (lo genera el navegador) y
// "avisa que sigue ahí" con cada consulta de estado (latido).
const LADOS = ['izquierda', 'derecha']
const TIMEOUT_MS = 6000 // sin latido por 6 s = pantalla desconectada

const participantes = { izquierda: null, derecha: null } // { clienteId, ultimoLatido }

function activo(lado) {
  const p = participantes[lado]
  return Boolean(p) && Date.now() - p.ultimoLatido < TIMEOUT_MS
}

function unirse(lado, clienteId) {
  if (!LADOS.includes(lado)) {
    return { ok: false, status: 400, mensaje: 'Lado inválido. Usa "izquierda" o "derecha".' }
  }
  if (!clienteId) {
    return { ok: false, status: 400, mensaje: 'Falta el clienteId.' }
  }

  // Si esta pantalla ya tenía el otro lado, lo libera.
  for (const l of LADOS) {
    if (l !== lado && participantes[l] && participantes[l].clienteId === clienteId) {
      participantes[l] = null
    }
  }

  if (activo(lado) && participantes[lado].clienteId !== clienteId) {
    return { ok: false, status: 409, mensaje: `El lado ${lado} ya está ocupado por otra pantalla.` }
  }

  participantes[lado] = { clienteId, ultimoLatido: Date.now() }
  return { ok: true }
}

// Registra el latido y devuelve el lado de esa pantalla (o null si no tiene).
function latido(clienteId) {
  if (!clienteId) return null
  for (const lado of LADOS) {
    if (participantes[lado] && participantes[lado].clienteId === clienteId) {
      participantes[lado].ultimoLatido = Date.now()
      return lado
    }
  }
  return null
}

function estadoLados() {
  return { izquierda: activo('izquierda'), derecha: activo('derecha') }
}

function ambosConectados() {
  return activo('izquierda') && activo('derecha')
}

module.exports = { unirse, latido, estadoLados, ambosConectados }
