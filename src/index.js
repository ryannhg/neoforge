const neo4j = require('neo4j-driver').v1

// Utilities
const also = (fn) => (data) => Promise.resolve(fn(data)).then(_ => data)
// const debug = (thing) => console.log(thing) || thing

const runWithDriver = (driver) => (query, data = {}) =>
  Promise.resolve(driver.session())
    .then(session =>
      session.run(query, data)
        .then(also(_ => session.close()))
    )

const propifyIfProps = (props = {}) =>
  Object.keys(props).length > 0
    ? `{${propify(props)}}`
    : ''

const propify = (props = {}) =>
  Object.keys(props).map(name => name + ": '" + props[name] + "'").join(', ')

const matchWithPattern = (pattern, alias = 'n') => `MATCH ${pattern} RETURN ${alias} LIMIT 25`

// Connection
const connection = (driver) => {
  const run = runWithDriver(driver)
  const matchWithLabel = (label, props) =>
    run(matchWithPattern(`(n:${label} ${propifyIfProps(props)})`))
  const matchWithoutLabel = (props) =>
    run(matchWithPattern(`(n ${propifyIfProps(props)})`))
  const useCorrectMatchFunction = (a, b) =>
    (typeof a === 'string' && b && typeof b === 'object')
      ? matchWithLabel(a, b)
      : (a && typeof a === 'object')
        ? matchWithoutLabel(a)
        : Promise.reject(String(`'match' called with invalid inputs.`))

  const formatRead = (result) => {
    const nodes = result.records
      .map(r => r._fields[0])
      .map(n => n.properties)
    const formatValue = (value) =>
      neo4j.isInt(value)
        ? parseInt(value.toString())
        : value
    const formatNode = (node) =>
      Object.keys(node)
        .reduce((obj, key) => {
          obj[key] = formatValue(node[key])
          return obj
        }, {})
    return nodes.map(formatNode)
  }

  return {
    match: (a = {}, b = {}) =>
      useCorrectMatchFunction(a, b)
        .then(formatRead)
  }
}

// Connect
const connect = (uri = 'bolt://localhost:7687', { username = '', password = '' } = {}) =>
  new Promise((resolve, reject) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
    driver.onCompleted = info_ => resolve(connection(driver))
    driver.onError = reject
  })

const neoforge = {
  connect
}

module.exports = neoforge
