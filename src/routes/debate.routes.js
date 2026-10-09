const { Router } = require('express')
const controller = require('../controllers/debate.controller')

const router = Router()

router.get('/estado', controller.obtenerEstado)
router.post('/unirse', controller.unirse)
router.post('/iniciar', controller.iniciarDebate)

module.exports = router
