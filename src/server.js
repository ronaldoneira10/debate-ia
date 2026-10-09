const path = require('path')
const express = require('express')
const cors = require('cors')

const { PORT } = require('./config/env')
const routes = require('./routes')
const logger = require('./middlewares/logger')
const notFound = require('./middlewares/notFound')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

app.use(cors())
app.use(express.json())
app.use(logger)

// Frontend estático (carpeta public/)
app.use(express.static(path.join(__dirname, '..', 'public')))

// API REST
app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

// 0.0.0.0 para que la otra computadora pueda entrar por IP:puerto
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
