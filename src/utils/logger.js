const log = (message, meta = {}) => {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  console.log('[logger]', message, meta)
}

module.exports = {
  log
}
