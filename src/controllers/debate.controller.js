const debateService = require('../services/debate.service')
const participantes = require('../services/participantes.service')

// GET /api/debate/estado?desde=N&clienteId=XXX
// Además de devolver el debate, cuenta como "latido" de esa pantalla.
function obtenerEstado(req, res) {
  const desde = Math.max(parseInt(req.query.desde, 10) || 0, 0)
  const miLado = participantes.latido(req.query.clienteId)

  res.json({
    ...debateService.obtenerEstado(desde),
    lados: participantes.estadoLados(),
    miLado
  })
}

// POST /api/debate/unirse   { lado, clienteId }
function unirse(req, res) {
  const { lado, clienteId } = req.body || {}
  const resultado = participantes.unirse(lado, clienteId)

  if (!resultado.ok) {
    return res.status(resultado.status).json({ mensaje: resultado.mensaje })
  }

  res.json({ mensaje: `Te uniste como lado ${lado}.`, lado })
}

// POST /api/debate/iniciar   { clienteId }
function iniciarDebate(req, res) {
  const { clienteId } = req.body || {}

  const miLado = participantes.latido(clienteId)

  if (!miLado) {
    return res.status(403).json({ mensaje: 'Primero debes elegir un lado.' })
  }

  if (!participantes.ambosConectados()) {
    return res.status(400).json({ mensaje: 'Falta que se conecte la otra pantalla.' })
  }

  // Quien pulsa "Iniciar" es el primero en hablar
  if (!debateService.iniciar(miLado)) {
    return res.status(409).json({ mensaje: 'Ya hay un debate en curso.' })
  }

  res.status(202).json({ mensaje: 'Debate iniciado.' })
}

module.exports = { obtenerEstado, unirse, iniciarDebate }
