const { obtenerCliente } = require('../config/gemini')
const { GEMINI_MODEL } = require('../config/env')
const { obtenerInstrucciones, obtenerPromptJuez } = require('./prompts.service')

const MAX_INTENTOS = 3

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Errores donde reintentar no sirve de nada (cuota agotada o problema con la key).
function esCuotaAgotada(error) {
  const m = error.message || ''
  return (
    error.codigo === 'KEY_FALTANTE' ||
    m.includes('RESOURCE_EXHAUSTED') ||
    m.includes('429') ||
    esProblemaDeKey(m)
  )
}

function esProblemaDeKey(m) {
  return (
    m.includes('API key') ||
    m.includes('API_KEY_INVALID') ||
    m.includes('default credentials') ||
    m.includes('PERMISSION_DENIED') ||
    m.includes('UNAUTHENTICATED')
  )
}

async function generarRespuesta(mensaje, lado) {
  // mensaje = null significa que esta IA abre el debate
  const esApertura = !mensaje
  const instrucciones = obtenerInstrucciones(lado, esApertura)
  const pedido = esApertura
    ? 'Presenta ahora tu argumento de apertura, corto. Termina todas las oraciones.'
    : `Argumento de la otra IA:

${mensaje}

Responde ahora con una respuesta corta de debate. Termina todas las oraciones.`

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      console.log(`[${lado}] Intento ${intento} de ${MAX_INTENTOS}...`)

      // Cada lado usa su propia API key
      const respuesta = await obtenerCliente(lado).models.generateContent({
        model: GEMINI_MODEL,
        contents: `${instrucciones}

${pedido}`,
        config: { maxOutputTokens: 1000, temperature: 0.7 }
      })

      return respuesta.text.trim()
    } catch (error) {
      console.log(`[${lado}] Error en el intento ${intento}:`, error.message)

      // Si la cuota se agotó, reintentar no sirve de nada.
      if (esCuotaAgotada(error) || intento === MAX_INTENTOS) throw error

      await esperar(intento * 3000)
    }
  }
}

const NOMBRES = { izquierda: 'la IA izquierda', derecha: 'la IA derecha', juez: 'el jurado' }

// Convierte el error crudo de la API en un mensaje legible en español.
// "quien" = 'izquierda' | 'derecha' | 'juez' (para decir qué key falló).
function mensajeAmigable(error, quien) {
  const m = (error && error.message) || ''
  const de = NOMBRES[quien] ? ` de ${NOMBRES[quien]}` : ''
  const envVar = quien ? `GEMINI_API_KEY_${quien.toUpperCase()}` : 'GEMINI_API_KEY'

  if (!m) return 'Ocurrió un error inesperado. Intenta de nuevo.'

  if (error.codigo === 'KEY_FALTANTE') {
    return `Falta la API key${de}. Agrega ${envVar} en el archivo .env y reinicia el servidor.`
  }

  if (m.includes('RESOURCE_EXHAUSTED') || m.includes('429')) {
    return `Se agotó la cuota gratuita de la API key${de}. Intenta más tarde o cambia ${envVar} por otra key.`
  }

  if (esProblemaDeKey(m)) {
    return `La API key${de} no es válida para la API de Gemini. Revisa ${envVar} en el archivo .env (clave de https://aistudio.google.com/apikey) y reinicia el servidor.`
  }

  return 'Ocurrió un error al generar la respuesta: ' + m
}

// Un jurado (otra llamada a Gemini) lee todo el debate y elige ganador.
// Devuelve { ganador: 'izquierda' | 'derecha', razon: '...' }
async function generarVeredicto(historial) {
  const prompt = obtenerPromptJuez(historial)
  let texto = ''

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      console.log(`[jurado] Intento ${intento} de ${MAX_INTENTOS}...`)

      const respuesta = await obtenerCliente('juez').models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { maxOutputTokens: 1000, temperature: 0.3 }
      })

      texto = respuesta.text.trim()
      break
    } catch (error) {
      console.log(`[jurado] Error en el intento ${intento}:`, error.message)
      if (esCuotaAgotada(error) || intento === MAX_INTENTOS) throw error
      await esperar(intento * 3000)
    }
  }

  const ganador = (texto.match(/GANADOR:\s*\**\s*(izquierda|derecha)/i) || [])[1]
  const razon = (texto.match(/RAZ[OÓ]N:\s*([\s\S]+)/i) || [])[1]

  if (!ganador) {
    throw new Error('El jurado no dio un veredicto con el formato esperado.')
  }

  return {
    ganador: ganador.toLowerCase(),
    razon: (razon || '').trim()
  }
}

module.exports = { generarRespuesta, generarVeredicto, mensajeAmigable }
