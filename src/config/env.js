const path = require('path')

// Carga el .env de la raíz del proyecto sin importar desde qué carpeta se ejecute
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })

const limpiar = (valor) => (valor || '').trim()

// Key general (respaldo): si un lado no tiene la suya, usa esta.
const GEMINI_API_KEY = limpiar(process.env.GEMINI_API_KEY)

// Cada pantalla/IA tiene su propia API key.
const GEMINI_KEYS = {
  izquierda: limpiar(process.env.GEMINI_API_KEY_IZQUIERDA) || GEMINI_API_KEY,
  derecha: limpiar(process.env.GEMINI_API_KEY_DERECHA) || GEMINI_API_KEY
}

// El jurado usa su propia key si existe; si no, usa la de la izquierda o la derecha.
GEMINI_KEYS.juez =
  limpiar(process.env.GEMINI_API_KEY_JUEZ) || GEMINI_KEYS.izquierda || GEMINI_KEYS.derecha

// Aviso al arrancar (sin mostrar nunca la key completa).
for (const [quien, key] of Object.entries(GEMINI_KEYS)) {
  if (key) {
    console.log(`Gemini [${quien}]: API key cargada (${key.slice(0, 3)}…, ${key.length} caracteres)`)
  } else {
    console.error(`⚠️  Gemini [${quien}]: falta la API key. Revisa tu archivo .env y reinicia el servidor.`)
  }
}

if (
  GEMINI_KEYS.izquierda &&
  GEMINI_KEYS.derecha &&
  GEMINI_KEYS.izquierda === GEMINI_KEYS.derecha
) {
  console.warn('ℹ️  Las dos IAs están usando la MISMA API key (comparten cuota). Pon una distinta en cada lado.')
}

module.exports = {
  PORT: process.env.PORT || 3000,
  GEMINI_KEYS,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  NUM_RONDAS: Number(process.env.NUM_RONDAS) || 3, // cuántas veces responde cada lado
  MAX_PALABRAS: Number(process.env.MAX_PALABRAS) || 35 // largo máximo de cada argumento
}
