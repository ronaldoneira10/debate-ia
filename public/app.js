// Sin sockets: cada pantalla le pregunta al servidor cada 1.5 s "¿qué hay de nuevo?".
// Cada pantalla es UN lado del debate (izquierda o derecha).
const INTERVALO_MS = 1500

const btnIniciar = document.getElementById('btnIniciar')
const mensajesIzquierda = document.getElementById('mensajesIzquierda')
const mensajesDerecha = document.getElementById('mensajesDerecha')
const ronda = document.getElementById('ronda')
const pulso = document.getElementById('pulso')
const selector = document.getElementById('selector')
const selectorMensaje = document.getElementById('selectorMensaje')
const btnElegirIzq = document.getElementById('elegirIzquierda')
const btnElegirDer = document.getElementById('elegirDerecha')

// Identificador de ESTA pantalla (sessionStorage: cada pestaña es una pantalla distinta).
function crearId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
let clienteId = sessionStorage.getItem('clienteId')
if (!clienteId) {
  clienteId = crearId()
  sessionStorage.setItem('clienteId', clienteId)
}

let debateId = null // para detectar que empezó un debate nuevo
let vistos = 0 // cuántos mensajes ya se dibujaron
let ultimoEstado = null
let ultimoPensando = null
let miLado = null

const contenedorDe = (lado) => (lado === 'izquierda' ? mensajesIzquierda : mensajesDerecha)
const nombreDe = (lado) => (lado === 'izquierda' ? 'IA izquierda' : 'IA derecha')

function limpiarPantallas() {
  mensajesIzquierda.innerHTML = ''
  mensajesDerecha.innerHTML = ''
}

function quitarPensando() {
  document.querySelectorAll('.mensaje--pensando').forEach((el) => el.remove())
}

function mostrarPensando(lado) {
  quitarPensando()
  const burbuja = document.createElement('div')
  burbuja.className = 'mensaje mensaje--pensando'
  const p = document.createElement('p')
  p.textContent = `${nombreDe(lado)} está pensando su argumento…`
  burbuja.appendChild(p)

  const contenedor = contenedorDe(lado)
  contenedor.appendChild(burbuja)
  contenedor.scrollTop = contenedor.scrollHeight
}

function agregarMensaje(lado, texto, numRonda) {
  const contenedor = contenedorDe(lado)

  const burbuja = document.createElement('div')
  burbuja.className = 'mensaje'

  const etiqueta = document.createElement('span')
  etiqueta.className = 'mensaje-ronda'
  etiqueta.textContent = `Ronda ${numRonda}`

  const p = document.createElement('p')
  p.textContent = texto // textContent: el texto de la IA nunca se interpreta como HTML

  burbuja.append(etiqueta, p)
  contenedor.appendChild(burbuja)
  contenedor.scrollTop = contenedor.scrollHeight
}

function agregarError(mensaje) {
  const burbuja = document.createElement('div')
  burbuja.className = 'mensaje mensaje--error'
  const p = document.createElement('p')
  p.textContent = mensaje
  burbuja.appendChild(p)

  mensajesDerecha.appendChild(burbuja)
  mensajesDerecha.scrollTop = mensajesDerecha.scrollHeight
}

// ---------- Elegir lado ----------

async function unirse(lado) {
  try {
    const res = await fetch('/api/debate/unirse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lado, clienteId })
    })
    const data = await res.json()
    if (!res.ok) {
      sessionStorage.removeItem('lado')
      selectorMensaje.textContent = data.mensaje
      selector.hidden = false
      return false
    }
    miLado = lado
    sessionStorage.setItem('lado', lado)
    consultarEstado()
    return true
  } catch (error) {
    selectorMensaje.textContent = 'No se pudo conectar con el servidor.'
    selector.hidden = false
    return false
  }
}

btnElegirIzq.addEventListener('click', () => unirse('izquierda'))
btnElegirDer.addEventListener('click', () => unirse('derecha'))

let reuniendo = false

function actualizarLados(data) {
  miLado = data.miLado

  // Si el servidor se reinició y olvidó el lado, esta pantalla lo retoma sola.
  const guardado = sessionStorage.getItem('lado')
  if (!miLado && guardado && !reuniendo) {
    reuniendo = true
    unirse(guardado).finally(() => { reuniendo = false })
  }

  // Selector: se muestra mientras esta pantalla no tenga lado.
  selector.hidden = Boolean(miLado)
  btnElegirIzq.disabled = data.lados.izquierda
  btnElegirDer.disabled = data.lados.derecha

  // Resaltar "mi" lado
  document.getElementById('ladoIzquierda').classList.toggle('lado--mio', miLado === 'izquierda')
  document.getElementById('ladoDerecha').classList.toggle('lado--mio', miLado === 'derecha')
  document.getElementById('tagIzquierda').hidden = miLado !== 'izquierda'
  document.getElementById('tagDerecha').hidden = miLado !== 'derecha'

  // Indicadores de conexión
  const ci = document.getElementById('conexIzquierda')
  const cd = document.getElementById('conexDerecha')
  ci.textContent = `Izquierda: ${data.lados.izquierda ? 'conectada' : 'sin conectar'}`
  cd.textContent = `Derecha: ${data.lados.derecha ? 'conectada' : 'sin conectar'}`
  ci.classList.toggle('conexion--ok', data.lados.izquierda)
  cd.classList.toggle('conexion--ok', data.lados.derecha)
}

// ---------- Pantalla del debate ----------

const NOMBRE_POSTURA = {
  izquierda: 'IA izquierda · Trabajo humano',
  derecha: 'IA derecha · Inteligencia artificial'
}

function ocultarVeredicto() {
  document.getElementById('veredicto').hidden = true
}

function mostrarVeredicto(v) {
  const caja = document.getElementById('veredicto')
  const titulo = document.getElementById('veredictoTitulo')
  const razon = document.getElementById('veredictoRazon')

  caja.className = 'veredicto' + (v.ganador ? ` veredicto--${v.ganador}` : '')
  titulo.textContent = v.ganador ? `Ganó la ${NOMBRE_POSTURA[v.ganador]}` : 'Sin veredicto'
  razon.textContent = v.razon || ''
  caja.hidden = false
}

function actualizarPantalla(data) {
  actualizarLados(data)

  // ¿Empezó un debate nuevo (o el servidor se reinició)? Se dibuja desde cero.
  if (data.id !== debateId) {
    debateId = data.id
    vistos = 0
    limpiarPantallas()
    ocultarVeredicto()
    ultimoPensando = null
  }

  data.nuevas.forEach((entrada) => {
    quitarPensando()
    agregarMensaje(entrada.lado, entrada.texto, entrada.ronda)
    ultimoPensando = null
  })
  vistos = data.total

  // Indicador "pensando"
  if (data.estado === 'en_curso' && data.pensando && data.pensando !== 'juez' && data.pensando !== ultimoPensando) {
    mostrarPensando(data.pensando)
    ultimoPensando = data.pensando
  }
  if (data.estado !== 'en_curso' || data.pensando === 'juez') {
    quitarPensando()
    ultimoPensando = null
  }

  // Veredicto final
  if (data.veredicto) mostrarVeredicto(data.veredicto)

  // Botón y texto de estado
  const enCurso = data.estado === 'en_curso'
  const ambos = data.lados.izquierda && data.lados.derecha
  btnIniciar.disabled = enCurso || !miLado || !ambos
  pulso.hidden = !enCurso

  if (enCurso && data.pensando === 'juez') {
    ronda.textContent = 'El jurado está evaluando el debate…'
  } else if (enCurso) {
    ronda.textContent = `Ronda ${Math.min(Math.floor(data.total / 2) + 1, data.totalRondas)} de ${data.totalRondas}`
  } else if (data.estado === 'terminado') {
    ronda.textContent = 'Debate terminado'
  } else if (data.estado === 'error') {
    ronda.textContent = 'El debate se detuvo por un error'
    if (ultimoEstado !== 'error') agregarError(data.error)
  } else if (!miLado) {
    ronda.textContent = 'Elige qué lado es esta pantalla'
  } else if (!ambos) {
    ronda.textContent = 'Esperando que se conecte la otra pantalla…'
  } else {
    ronda.textContent = 'Listos. Cualquiera puede iniciar el debate'
  }

  ultimoEstado = data.estado
}

async function consultarEstado() {
  try {
    const res = await fetch(`/api/debate/estado?desde=${vistos}&clienteId=${encodeURIComponent(clienteId)}`)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    actualizarPantalla(await res.json())
  } catch (error) {
    ronda.textContent = 'Sin conexión con el servidor…'
  }
}

async function iniciarDebate() {
  btnIniciar.disabled = true
  try {
    const res = await fetch('/api/debate/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId })
    })
    // 409 = ya hay uno corriendo (lo inició la otra pantalla): no pasa nada.
    if (!res.ok && res.status !== 409) {
      const data = await res.json()
      ronda.textContent = data.mensaje
      return
    }
  } catch (error) {
    ronda.textContent = 'No se pudo iniciar el debate'
    return
  }
  consultarEstado()
}

btnIniciar.addEventListener('click', iniciarDebate)

// Si la URL trae ?lado=izquierda o ?lado=derecha, se une solo.
const ladoURL = new URLSearchParams(location.search).get('lado')
if (ladoURL === 'izquierda' || ladoURL === 'derecha') {
  unirse(ladoURL)
}

consultarEstado()
setInterval(consultarEstado, INTERVALO_MS)
