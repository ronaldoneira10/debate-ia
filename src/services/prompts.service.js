const TEMA = 'Inteligencia Artificial VS Trabajo Humano'

const { MAX_PALABRAS } = require('../config/env')

const REGLAS = `
REGLAS:
- Responde con 1 o 2 oraciones, máximo ${MAX_PALABRAS} palabras en total.
- Cada oración debe estar completamente terminada.
- Usa lenguaje sencillo.
- Sé respetuoso.
- Presenta un argumento claro.
- No repitas exactamente el argumento anterior.
- Mantén siempre tu posición.
`

// esApertura = true cuando esta IA habla primero (no hay argumento previo que responder)
function obtenerInstrucciones(lado, esApertura = false) {
  const posicion =
    lado === 'izquierda'
      ? 'defender el trabajo humano'
      : 'defender la Inteligencia Artificial'

  return `
Eres una inteligencia artificial que participa en un debate.

Tema:
${TEMA}.

Tu posición es ${posicion}.

${esApertura
    ? 'Eres quien abre el debate: presenta tu argumento de apertura.'
    : 'Debes responder al argumento de la otra IA.'}
${REGLAS}`
}

const NOMBRE_LADO = {
  izquierda: 'IA izquierda (defiende el trabajo humano)',
  derecha: 'IA derecha (defiende la Inteligencia Artificial)'
}

// Prompt para que una IA actúe como jurado imparcial al final del debate.
function obtenerPromptJuez(historial) {
  const transcripcion = historial
    .map((h) => `Ronda ${h.ronda} - ${NOMBRE_LADO[h.lado]}: ${h.texto}`)
    .join('\n\n')

  return `
Eres un jurado imparcial de un debate escolar.

Tema:
${TEMA}.

Evalúa la CALIDAD de la argumentación, no cuál posición te gusta más. Fíjate en:
- Claridad y coherencia de los argumentos.
- Si respondió de forma directa a lo que dijo la otra IA.
- Si mantuvo su posición sin repetirse.

Transcripción del debate:

${transcripcion}

Debes elegir UN ganador (no puede haber empate).
Responde EXACTAMENTE con este formato, en español sencillo:

GANADOR: izquierda
RAZON: (1 o 2 oraciones completas, máximo 40 palabras, que expliquen por qué ganó)

En GANADOR escribe solo la palabra izquierda o la palabra derecha.
`
}

module.exports = { obtenerInstrucciones, obtenerPromptJuez }
