/**
 * Visitor counter backed by D1. GET returns the total; POST counts a visit
 * and returns the new total. The single-row UPDATE ... RETURNING is atomic.
 */

const json = n =>
  new Response(JSON.stringify({ n }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare('SELECT n FROM hits WHERE id = 1').first()
  return json(row?.n ?? 0)
}

/** Only counts requests made by the page itself, not cross-site or scripted posts. */
export async function onRequestPost({ request, env }) {
  if (request.headers.get('sec-fetch-site') !== 'same-origin') {
    return new Response('Forbidden', { status: 403 })
  }
  const row = await env.DB.prepare(
    'UPDATE hits SET n = n + 1 WHERE id = 1 RETURNING n'
  ).first()
  return json(row?.n ?? 0)
}
