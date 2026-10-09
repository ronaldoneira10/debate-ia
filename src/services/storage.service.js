// Guarda y lee el debate en data/debate.json para que no se pierda
// si el servidor se reinicia.
const fs = require('fs')
const path = require('path')

const ARCHIVO = path.join(__dirname, '..', '..', 'data', 'debate.json')

function leer() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'))
  } catch {
    return null // no existe todavía o está dañado
  }
}

function guardar(datos) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true })
  fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2))
}

module.exports = { leer, guardar }
