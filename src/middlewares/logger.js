module.exports = (req, res, next) => {
  // El polling llama muy seguido a /estado: no lo mostramos para no llenar la consola.
  if (!req.originalUrl.startsWith('/api/debate/estado')) {
    console.log(`${req.method} ${req.originalUrl}`)
  }
  next()
}
