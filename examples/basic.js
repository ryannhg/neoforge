const neoforge = require('../src')

neoforge.connect()
  .then(conn => conn.match('Movie', { title: 'Speed Racer' }))
  .then(console.log)
  .catch(console.error)
  .then(process.exit)
