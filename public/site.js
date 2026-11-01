/** Seeded PRNG so each bar's ragged edge looks the same on every load. */
function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
}

/* ---------- ANSI section bars ---------- */

const ANSI = [
  '#000000',
  '#aa0000',
  '#00aa00',
  '#aa5500',
  '#0000aa',
  '#aa00aa',
  '#00aaaa',
  '#aaaaaa',
  '#555555',
  '#ff5555',
  '#55ff55',
  '#ffff55',
  '#5555ff',
  '#ff55ff',
  '#55ffff',
  '#ffffff',
]
const SCHEMES = {
  cyan: [4, 12, 6, 14],
  magenta: [5, 1, 13, 9],
  green: [2, 3, 10, 11],
}
const CELL_W = 8
const CELL_H = 16
const glyphCache = new Map()

/** Renders one CP437 cell (block, shade or letter) into a cached 8x16 tile. */
function glyph(ch, fg, bg) {
  const key = `${ch}${fg},${bg}`
  if (glyphCache.has(key)) return glyphCache.get(key)
  const tile = document.createElement('canvas')
  tile.width = CELL_W
  tile.height = CELL_H
  const g = tile.getContext('2d')
  g.fillStyle = ANSI[bg]
  g.fillRect(0, 0, CELL_W, CELL_H)
  g.fillStyle = ANSI[fg]
  const light = (x, y) =>
    (y % 2 === 0 && x % 4 === 0) || (y % 2 === 1 && x % 4 === 2)
  const shades = {
    '░': light,
    '▒': (x, y) => (x + y) % 2 === 0,
    '▓': (x, y) => !light(x, y),
  }
  if (ch === '█') g.fillRect(0, 0, CELL_W, CELL_H)
  else if (ch === '▀') g.fillRect(0, 0, CELL_W, CELL_H / 2)
  else if (ch === '▄') g.fillRect(0, CELL_H / 2, CELL_W, CELL_H / 2)
  else if (ch === '▌') g.fillRect(0, 0, CELL_W / 2, CELL_H)
  else if (ch === '▐') g.fillRect(CELL_W / 2, 0, CELL_W / 2, CELL_H)
  else if (shades[ch]) {
    for (let y = 0; y < CELL_H; y++)
      for (let x = 0; x < CELL_W; x++)
        if (shades[ch](x, y)) g.fillRect(x, y, 1, 1)
  } else if (ch !== ' ') {
    g.font = '16px VT323, monospace'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(ch, CELL_W / 2, CELL_H / 2 + 1)
  }
  glyphCache.set(key, tile)
  return tile
}

/**
 * Builds a 3-row bar: a dithered ramp from black at the ends to the brightest
 * colour in the middle, ragged half-blocks above and below, and a title cut-out.
 */
function barCells(cols, title, scheme) {
  const rand = rng(cols * 31 + title.length)
  const ramp = [0, ...scheme]
  const steps = ramp.length - 1
  const rows = [[], [], []]
  const label = ` ${title} `
  const start = Math.floor((cols - label.length) / 2)
  const end = start + label.length
  const shadeAt = t => {
    const u = Math.min(steps - 0.001, t * steps * 1.15)
    const i = Math.floor(u)
    const f = u - i
    if (f < 0.4) return ['█', ramp[i], 0]
    return [f < 0.6 ? '░' : f < 0.8 ? '▒' : '▓', ramp[i + 1], ramp[i]]
  }
  const ragged = t => t < 0.35 && rand() < (0.35 - t) * 2.6
  for (let c = 0; c < cols; c++) {
    const t = Math.min(c, cols - 1 - c) / (cols / 2)
    const top = shadeAt(Math.min(1, t + 0.12))[1]
    const bottom = shadeAt(Math.max(0, t - 0.12))[1]
    rows[0].push(ragged(t) || top === 0 ? [' ', 0, 0] : ['▄', top, 0])
    rows[2].push(ragged(t) || bottom === 0 ? [' ', 0, 0] : ['▀', bottom, 0])
    const body = shadeAt(t)
    if (c === start - 1) rows[1].push(['▌', body[1], 0])
    else if (c === end) rows[1].push(['▐', body[1], 0])
    else if (c >= start && c < end) rows[1].push([label[c - start], 15, 0])
    else rows[1].push(body)
  }
  return rows
}

function drawBar(heading) {
  const title =
    heading.dataset.title || heading.textContent.trim().toUpperCase()
  heading.dataset.title = title
  const avail = Math.min(heading.parentElement.clientWidth - 2, 760)
  const cols = Math.max(24, Math.floor(avail / CELL_W))
  const cells = barCells(
    cols,
    title,
    SCHEMES[heading.dataset.scheme] || SCHEMES.cyan
  )
  let canvas = heading.querySelector('canvas')
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    heading.append(canvas)
    heading.classList.add('drawn')
  }
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
  canvas.width = cols * CELL_W * dpr
  canvas.height = 3 * CELL_H * dpr
  canvas.style.width = `${cols * CELL_W}px`
  canvas.style.height = `${3 * CELL_H}px`
  const g = canvas.getContext('2d')
  g.imageSmoothingEnabled = false
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  cells.forEach((row, y) =>
    row.forEach(([ch, fg, bg], x) =>
      g.drawImage(glyph(ch, fg, bg), x * CELL_W, y * CELL_H)
    )
  )
}

function drawBars() {
  document.querySelectorAll('.ansi').forEach(drawBar)
}

/* ---------- Hit counter ---------- */

function renderCounter(n) {
  const el = document.getElementById('counter')
  el.innerHTML = [...String(n).padStart(6, '0')]
    .map(d => `<b>${d}</b>`)
    .join('')
  el.classList.remove('loading')
  el.setAttribute('aria-label', `Visitor number ${n}`)
}

/** Counts this visit once per browser session (see functions/hit.js), then shows the total. */
async function loadCounter() {
  let counted = false
  try {
    counted = sessionStorage.getItem('hit') === '1'
  } catch {}
  try {
    const res = await fetch('/hit', { method: counted ? 'GET' : 'POST' })
    if (!res.ok) return
    const { n } = await res.json()
    renderCounter(n)
    if (!counted) sessionStorage.setItem('hit', '1')
  } catch {}
}

/* ---------- Backdoor ---------- */

/** Loads the flight sim on first use; Ctrl+Shift (or Cmd+Shift) unlocks the operator greeting. */
document.getElementById('pi').addEventListener('click', async e => {
  const operator = (e.ctrlKey || e.metaKey) && e.shiftKey
  const button = e.currentTarget
  const { openEgg } = await import('/egg.js')
  openEgg(operator, button)
})

let resizeTimer
addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(drawBars, 120)
})
drawBars()
document.fonts?.load('16px VT323').then(() => {
  glyphCache.clear()
  drawBars()
})
loadCounter()
