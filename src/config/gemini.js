const { GoogleGenAI } = require('@google/genai')
const { GEMINI_KEYS } = require('./env')

// Un cliente de Gemini por cada API key distinta (se crean la primera vez que se piden).
// Si dos lados comparten la misma key, comparten también el cliente.
const clientes = new Map() // apiKey -> GoogleGenAI

// quien: 'izquierda' | 'derecha' | 'juez'
function obtenerCliente(quien) {
  const apiKey = GEMINI_KEYS[quien]

  if (!apiKey) {
    const error = new Error(`API key faltante para "${quien}"`)
    error.codigo = 'KEY_FALTANTE'
    error.quien = quien
    throw error
  }

  if (!clientes.has(apiKey)) {
    // vertexai: false obliga a usar la API de Gemini con API key, aunque en el
    // computador exista alguna variable de entorno (GOOGLE_GENAI_USE_VERTEXAI) que
    // active el modo Vertex y pida credenciales de Google Cloud.
    clientes.set(apiKey, new GoogleGenAI({ apiKey, vertexai: false }))
  }

  return clientes.get(apiKey)
}

module.exports = { obtenerCliente }
