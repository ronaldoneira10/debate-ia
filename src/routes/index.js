const { Router } = require('express')
const debateRoutes = require('./debate.routes')

const router = Router()

router.get('/', (req, res) => {
  res.json({ mensaje: 'API del debate funcionando correctamente' })
})

router.use('/debate', debateRoutes)

module.exports = router
