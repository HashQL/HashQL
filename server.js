import dedent from './dedent.js'

HashQL.dev = Symbol('dev')

export default function HashQL(queries, handlers) {
  const get = typeof queries === 'function'
    ? queries
    : queries === HashQL.dev
    ? x => dedent(x)
    : (h, t) => queries[t] && queries[t][h]

  return async function evaluate({ tag, hash, input }, context) {
    let ended
    let query = get(hash, tag, fn => ended = fn)
    query && typeof query.then === 'function' && (query = await query)

    if (!query)
      throw Object.assign(new Error(hash + ' not found for ' + tag), { code: 'NOT_FOUND', status: 404 })

    return Promise.resolve(
      handlers[tag](
        Object.assign(query, { raw: query }),
        await Promise.all(input.map(x =>
          x.query
            ? evaluate(x.query)
            : x.value
        )),
        context
      )
    ).then(
      result => (ended(null, result), result),
      error => {
        ended && ended(error)
        throw error
      }
    )
  }
}
