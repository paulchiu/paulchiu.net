/**
 * RINGFLY.EXE: the flight sim behind the π in the corner. Loaded on the
 * first click via import(), so the homepage never pays for it.
 */

/** Display is 320x200; the 3D view renders larger so a banked frame never shows its corners. */
const W = 320
const H = 200
const RW = 384
const RH = 288
const N = 512
const MASK = N - 1
const SCALE = 80
const FAR = 520
const WL = 44
const RS = 1400
const RINGS = 9

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const rgb = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const wrapD = d => ((((d + N / 2) % N) + N) % N) - N / 2
const angDiff = (a, b) =>
  ((((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
  Math.PI
const smooth = t => t * t * (3 - 2 * t)
const at = (x, y) => (Math.floor(y) & MASK) * N + (Math.floor(x) & MASK)
const fogAt = z => clamp((z - FAR * 0.4) / (FAR * 0.6), 0, 1)

function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
}

function mix(c, f, t) {
  const r = c & 255
  const g = (c >> 8) & 255
  const b = (c >> 16) & 255
  return rgb(
    (r + ((f & 255) - r) * t) | 0,
    (g + (((f >> 8) & 255) - g) * t) | 0,
    (b + (((f >> 16) & 255) - b) * t) | 0
  )
}

/* ---------- DOM ---------- */

const CSS = `
.egg { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center;
  padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px))
    max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  background: rgba(0, 0, 16, 0.82); }
.egg[hidden] { display: none; }
.egg-win { width: min(960px, 100%, calc((100dvh - 100px) * 1.6)); padding: 3px; color: #000;
  background: #c0c0c0; text-align: left;
  box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #404040, inset 2px 2px 0 #dfdfdf,
    inset -2px -2px 0 #808080, 0 10px 40px rgba(0, 0, 0, 0.6); }
.egg-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 3px 3px 3px 6px; color: #fff; background: linear-gradient(90deg, #000080, #1084d0);
  font: 700 13px/1.2 system-ui, sans-serif; }
.egg-btns { display: flex; gap: 2px; }
.egg-btns button { display: grid; place-items: center; width: 18px; height: 16px; padding: 0;
  color: #000; background: #c0c0c0; border: 0; cursor: pointer;
  box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #404040; font: 700 11px/1 system-ui, sans-serif; }
.egg-btns button:active { box-shadow: inset 1px 1px 0 #404040, inset -1px -1px 0 #fff; }
.egg canvas { display: block; width: 100%; height: auto; margin-top: 3px; background: #000;
  image-rendering: pixelated; touch-action: none; cursor: crosshair; }
.egg-status { margin-top: 3px; padding: 2px 6px; overflow: hidden; font: 12px/1.4 system-ui, sans-serif;
  white-space: nowrap; text-overflow: ellipsis; box-shadow: inset 1px 1px 0 #808080, inset -1px -1px 0 #fff; }
`

const style = document.createElement('style')
style.textContent = CSS
document.head.append(style)

const modal = document.createElement('div')
modal.className = 'egg'
modal.hidden = true
modal.setAttribute('role', 'dialog')
modal.setAttribute('aria-modal', 'true')
modal.setAttribute('aria-labelledby', 'egg-title')
modal.innerHTML = `
  <div class="egg-win">
    <div class="egg-bar">
      <span id="egg-title">RINGFLY.EXE</span>
      <span class="egg-btns">
        <button type="button" data-act="mute" aria-label="Mute">♪</button>
        <button type="button" data-act="close" aria-label="Close">×</button>
      </span>
    </div>
    <canvas width="${W}" height="${H}" tabindex="0" aria-label="Flight simulator"></canvas>
    <div class="egg-status">Arrows or WASD (or drag) to fly · Space boost · M mute · Esc exit</div>
  </div>`
document.body.append(modal)

const screen = modal.querySelector('canvas')
const muteBtn = modal.querySelector('[data-act="mute"]')
const sctx = screen.getContext('2d')
const off = document.createElement('canvas')
off.width = RW
off.height = RH
const octx = off.getContext('2d')
const img = octx.createImageData(RW, RH)
const buf = new Uint32Array(img.data.buffer)
const depth = new Float32Array(RW * RH)
const ybuf = new Float32Array(RW)

/* ---------- World ---------- */

const hmap = new Float32Array(N * N)
const cmap = new Uint32Array(N * N)
const roadD = new Float32Array(N * N).fill(99)
const roadI = new Int32Array(N * N)
const ROAD = []

/** Periodic value noise, so the island tiles seamlessly as you fly off an edge. */
function genHeights() {
  const rand = rng(1998)
  const f = new Float32Array(N * N)
  let amp = 1
  for (let cells = 4; cells <= 128; cells *= 2) {
    const g = new Float32Array(cells * cells)
    for (let i = 0; i < g.length; i++) g[i] = rand()
    const step = N / cells
    for (let y = 0; y < N; y++) {
      const gy = y / step
      const y0 = gy | 0
      const ty = smooth(gy - y0)
      const y1 = (y0 + 1) % cells
      for (let x = 0; x < N; x++) {
        const gx = x / step
        const x0 = gx | 0
        const tx = smooth(gx - x0)
        const x1 = (x0 + 1) % cells
        const a = g[y0 * cells + x0]
        const b = g[y0 * cells + x1]
        const c = g[y1 * cells + x0]
        const d = g[y1 * cells + x1]
        const top = a + (b - a) * tx
        f[y * N + x] += amp * (top + (c + (d - c) * tx - top) * ty)
      }
    }
    amp *= 0.5
  }
  let lo = Infinity
  let hi = -Infinity
  for (const v of f) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  for (let i = 0; i < N * N; i++) {
    hmap[i] = Math.max(WL, Math.pow((f[i] - lo) / (hi - lo), 1.7) * 175)
  }
}

/** Lays a looping road, smooths its grade, then flattens the terrain under it. */
function genRoad() {
  for (let i = 0; i < RS; i++) {
    const t = (i / RS) * Math.PI * 2
    const x = 256 + 175 * Math.cos(t) + 38 * Math.sin(3 * t)
    const y = 256 + 165 * Math.sin(t) + 30 * Math.cos(2 * t)
    ROAD.push({ x, y, h: hmap[at(x, y)] })
  }
  const raw = ROAD.map(p => p.h)
  const K = 45
  for (let i = 0; i < RS; i++) {
    let s = 0
    for (let k = -K; k <= K; k++) s += raw[(i + k + RS) % RS]
    ROAD[i].h = Math.max(WL + 5, s / (2 * K + 1))
  }
  for (let i = 0; i < RS; i++) {
    const p = ROAD[i]
    for (let oy = -8; oy <= 8; oy++) {
      for (let ox = -8; ox <= 8; ox++) {
        const cx = Math.round(p.x) + ox
        const cy = Math.round(p.y) + oy
        const d = Math.hypot(cx - p.x, cy - p.y)
        if (d > 8) continue
        const k = (cy & MASK) * N + (cx & MASK)
        if (d <= 4.5) {
          hmap[k] = p.h
          if (d < roadD[k]) {
            roadD[k] = d
            roadI[k] = i
          }
        } else if (roadD[k] > 4.5) {
          const w = (8 - d) / 3.5
          hmap[k] = hmap[k] * (1 - w) + p.h * w
        }
      }
    }
  }
}

const RAMP = [
  [WL, 214, 196, 128],
  [WL + 7, 96, 168, 64],
  [82, 52, 132, 48],
  [112, 30, 96, 40],
  [136, 84, 96, 52],
  [152, 118, 106, 90],
  [170, 156, 146, 136],
  [182, 236, 240, 248],
]
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Height ramp, west-facing light, and a 4x4 ordered dither for a 256-colour look. */
function genColours() {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = y * N + x
      const h = hmap[k]
      const dith = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 20
      const q = v => clamp(Math.round((v + dith) / 20) * 20, 0, 255)
      let r
      let g
      let b
      if (roadD[k] <= 4.5) {
        const d = roadD[k]
        if (d < 0.9 && ((roadI[k] / 9) | 0) % 2 === 0) [r, g, b] = [255, 216, 0]
        else if (d > 3.6) [r, g, b] = [214, 214, 214]
        else [r, g, b] = [62, 60, 70]
        cmap[k] = rgb(q(r), q(g), q(b))
        continue
      }
      if (h <= WL + 0.01) {
        const sparkle = ((x * 7 + y * 13) & 31) === 0
        ;[r, g, b] = sparkle
          ? [120, 170, 255]
          : (x + y) & 1
            ? [18, 52, 176]
            : [24, 66, 200]
        cmap[k] = rgb(r, g, b)
        continue
      }
      let i = 0
      while (i < RAMP.length - 2 && h > RAMP[i + 1][0]) i++
      const [h0, r0, g0, b0] = RAMP[i]
      const [h1, r1, g1, b1] = RAMP[i + 1]
      const t = clamp((h - h0) / (h1 - h0), 0, 1)
      const slope =
        hmap[y * N + ((x - 1) & MASK)] - hmap[y * N + ((x + 1) & MASK)]
      const light = clamp(1 + slope * 0.07, 0.55, 1.4)
      r = (r0 + (r1 - r0) * t) * light
      g = (g0 + (g1 - g0) * t) * light
      b = (b0 + (b1 - b0) * t) * light
      cmap[k] = rgb(q(r), q(g), q(b))
    }
  }
}

/* ---------- Sky ---------- */

const SKY_TOP = [6, 4, 36]
const SKY_MID = [58, 28, 108]
const HORIZON = [255, 138, 118]
const FOG = rgb(...HORIZON)
const skyLUT = new Uint32Array(800)
for (let i = 0; i < 800; i++) {
  const t = clamp((i - 300) / 120, 0, 1)
  const [a, b, u] =
    t < 0.35
      ? [HORIZON, SKY_MID, t / 0.35]
      : [SKY_MID, SKY_TOP, (t - 0.35) / 0.65]
  skyLUT[i] = rgb(...a.map((v, j) => Math.round(v + (b[j] - v) * u)))
}
const starRand = rng(7)
const STARS = Array.from({ length: 90 }, () => ({
  az: starRand() * Math.PI * 2,
  el: 45 + starRand() * 160,
  c: starRand() > 0.8 ? rgb(255, 255, 170) : rgb(220, 220, 255),
}))

/* ---------- Sprites ---------- */

function toSprite(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height)
  return { w: c.width, h: c.height, data: new Uint32Array(d.data.buffer) }
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

/** A gold hoop with a dark rim and a highlight, hollow in the middle. */
function ringSprite() {
  const [c, g] = canvas(32, 32)
  const hoop = (r, width, colour) => {
    g.lineWidth = width
    g.strokeStyle = colour
    g.beginPath()
    g.arc(16, 16, r, 0, Math.PI * 2)
    g.stroke()
  }
  hoop(12, 7, '#7a4a00')
  hoop(12, 4, '#ffd800')
  g.lineWidth = 2
  g.strokeStyle = '#fff6b0'
  g.beginPath()
  g.arc(16, 16, 12, Math.PI * 1.05, Math.PI * 1.45)
  g.stroke()
  return toSprite(c)
}

function towerSprite(n, lit) {
  const [c, g] = canvas(40, 124)
  g.fillStyle = '#22223a'
  g.fillRect(0, 8, 40, 116)
  g.fillStyle = '#7070b0'
  g.fillRect(0, 8, 40, 2)
  g.fillRect(0, 8, 2, 116)
  g.fillStyle = '#0a0a18'
  g.fillRect(38, 8, 2, 116)
  g.fillStyle = lit ? '#ffd800' : '#5a3a00'
  g.fillRect(14, 0, 12, 8)
  g.fillStyle = '#fff'
  g.font = '8px Silkscreen, monospace'
  g.textAlign = 'center'
  g.fillText('HITS', 20, 22)
  g.font = '16px VT323, monospace'
  g.textBaseline = 'middle'
  ;[...String(n).padStart(6, '0')].forEach((d, i) => {
    g.fillStyle = '#000'
    g.fillRect(7, 28 + i * 15, 26, 14)
    g.fillStyle = '#33ff33'
    g.fillText(d, 20, 36 + i * 15)
  })
  return toSprite(c)
}

/* ---------- Game state ---------- */

let hits = 0
let built = null
let ring = null
let rings = []
let tower = null
let towerImgs = []
let px = 0
let py = 0
let camZ = 0
let heading = 0
let roll = 0
let pitch = 0
let speed = 48
let roadAt = 0
let state = 'boot'
let stateT = 0
let clock = 0
let flyT = 0
let crashes = 0
let winTime = 0
let msg = null
let operator = false
let horizon = RH / 2
const keys = new Set()
const stick = { on: false, x0: 0, y0: 0, x: 0, y: 0 }

async function fetchHits() {
  try {
    const res = await fetch('/hit')
    if (res.ok) return (await res.json()).n
  } catch {}
  return 0
}

async function build() {
  await new Promise(r => setTimeout(r, 60))
  genHeights()
  genRoad()
  genColours()
  ;[hits] = await Promise.all([
    fetchHits(),
    document.fonts?.load('8px Silkscreen'),
    document.fonts?.load('16px VT323'),
    document.fonts?.load('28px Anton'),
  ]).catch(() => [0])
  ring = ringSprite()
  rings = Array.from({ length: RINGS }, (_, i) => {
    const r = ROAD[Math.floor(((i + 0.5) * RS) / RINGS + 60) % RS]
    return { x: r.x, y: r.y, base: r.h + 20, got: false }
  })
  const ti = RS - 70
  const a = ROAD[ti]
  const b = ROAD[(ti + 4) % RS]
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const tx = a.x + ((b.y - a.y) / len) * 16
  const ty = a.y - ((b.x - a.x) / len) * 16
  towerImgs = [towerSprite(hits, false), towerSprite(hits, true)]
  tower = { x: tx, y: ty, ground: hmap[at(tx, ty)], ww: 16 }
  tower.top = tower.ground + tower.ww * (124 / 40) * (RW / 2 / SCALE)
}

function nearestRoad(global) {
  let best = roadAt
  let bd = Infinity
  const span = global ? RS : 40
  for (let k = -span; k <= span; k++) {
    const i = (((roadAt + k) % RS) + RS) % RS
    const d = wrapD(ROAD[i].x - px) ** 2 + wrapD(ROAD[i].y - py) ** 2
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return best
}

function respawn(i = nearestRoad(true)) {
  const p = ROAD[i]
  const q = ROAD[(i + 4) % RS]
  px = p.x
  py = p.y
  heading = Math.atan2(-(q.x - p.x), -(q.y - p.y))
  camZ = p.h + 38
  roll = 0
  pitch = 0
  roadAt = i
}

function setState(s) {
  state = s
  stateT = 0
  if (s === 'title') startMusic()
  musicMood()
}

const ringsLeft = () => rings.filter(r => !r.got).length

function startFlight() {
  rings.forEach(r => (r.got = false))
  flyT = 0
  crashes = 0
  msg = { text: 'GO! Follow the road', t: 0 }
  setState('fly')
  beep([523, 659, 784], 0.07)
}

function autopilot() {
  const tgt = ROAD[(roadAt + 28) % RS]
  const want = Math.atan2(-wrapD(tgt.x - px), -wrapD(tgt.y - py))
  const ahead =
    hmap[at(px - Math.sin(heading) * 25, py - Math.cos(heading) * 25)]
  const alt = Math.max(tgt.h + 38, ahead + 26)
  return [
    clamp(-angDiff(want, heading) * 2.2, -1, 1),
    clamp((alt - camZ) / 18, -1, 1),
  ]
}

function input() {
  const k = c => (keys.has(c) ? 1 : 0)
  const x =
    k('ArrowRight') +
    k('KeyD') -
    k('ArrowLeft') -
    k('KeyA') +
    (stick.on ? stick.x : 0)
  const y =
    k('ArrowUp') +
    k('KeyW') -
    k('ArrowDown') -
    k('KeyS') +
    (stick.on ? stick.y : 0)
  return [clamp(x, -1, 1), clamp(y, -1, 1)]
}

function crash(text) {
  crashes++
  msg = { text, t: 0 }
  setState('crash')
  noise()
}

function update(dt) {
  clock += dt
  stateT += dt
  if (msg) msg.t += dt
  if (state === 'boot') {
    if (stateT > 2.6 && tower) setState('title')
    return
  }
  if (state === 'crash') {
    if (stateT > 1.4) {
      respawn()
      setState('fly')
    }
    return
  }
  const [sx, sy] = state === 'fly' ? input() : autopilot()
  roll += (sx * 0.6 - roll) * Math.min(1, dt * 3)
  heading -= roll * 1.5 * dt
  pitch += (sy * 0.55 - pitch) * Math.min(1, dt * 3)
  const boost = state === 'fly' && keys.has('Space')
  speed += ((boost ? 86 : 48) - speed) * Math.min(1, dt * 2)
  px = (px - Math.sin(heading) * speed * dt + N) % N
  py = (py - Math.cos(heading) * speed * dt + N) % N
  camZ = Math.min(camZ + pitch * speed * dt * 1.1, 260)
  roadAt = nearestRoad(false)
  const ground = hmap[at(px, py)]
  if (state !== 'fly') {
    camZ = Math.max(camZ, ground + 10)
    return
  }
  flyT += dt
  for (const r of rings) {
    if (r.got) continue
    const oz = r.base + Math.sin(clock * 2 + r.x) * 2
    const near = Math.hypot(wrapD(r.x - px), wrapD(r.y - py)) < 8
    if (near && Math.abs(camZ - oz) < 7) {
      r.got = true
      const left = ringsLeft()
      msg = {
        text: left
          ? `RING ${RINGS - left}/${RINGS}`
          : 'All rings! Fly to the counter tower',
        t: 0,
      }
      beep(left ? [880, 1320] : [523, 659, 784, 1047], 0.08)
    }
  }
  const nearTower =
    Math.hypot(wrapD(tower.x - px), wrapD(tower.y - py)) < tower.ww / 2 + 2
  if (nearTower && camZ < tower.top) {
    if (!ringsLeft()) {
      winTime = flyT
      setState('win')
      beep([784, 988, 1175, 1568], 0.12)
      return
    }
    return crash('Crashed into the counter tower!')
  }
  if (camZ < ground + 2) crash(ground <= WL + 0.01 ? 'Splashdown!' : 'CRASH!')
}

/* ---------- Rendering ---------- */

/** Voxel terrain: march depth slices front to back, filling each column upward. */
function render() {
  horizon = RH / 2 + pitch * 75
  for (let y = 0; y < RH; y++) {
    const c = skyLUT[clamp(Math.round(horizon - y) + 300, 0, 799)]
    buf.fill(c, y * RW, (y + 1) * RW)
  }
  depth.fill(1e9)
  for (const s of STARS) {
    const a = angDiff(s.az, heading)
    const x = Math.round(RW / 2 - (a * (RW / 2)) / (Math.PI / 4))
    const y = Math.round(horizon - s.el)
    if (x >= 0 && x < RW && y >= 0 && y < RH) buf[y * RW + x] = s.c
  }

  ybuf.fill(RH)
  const s = Math.sin(heading)
  const c = Math.cos(heading)
  let z = 1
  let dz = 0.5
  while (z < FAR) {
    let plx = -c * z - s * z + px
    let ply = s * z - c * z + py
    const dx = (2 * c * z) / RW
    const dy = (-2 * s * z) / RW
    const inv = SCALE / z
    const fogT = fogAt(z)
    for (let i = 0; i < RW; i++) {
      const k = (Math.floor(ply) & MASK) * N + (Math.floor(plx) & MASK)
      const hs = (camZ - hmap[k]) * inv + horizon
      if (hs < ybuf[i]) {
        const col = fogT > 0.01 ? mix(cmap[k], FOG, fogT) : cmap[k]
        for (let y = hs < 0 ? 0 : hs | 0, end = ybuf[i] | 0; y < end; y++) {
          buf[y * RW + i] = col
          depth[y * RW + i] = z
        }
        ybuf[i] = hs
      }
      plx += dx
      ply += dy
    }
    z += dz
    dz += 0.012
  }

  const lit = !ringsLeft() && ((clock * 3) | 0) % 2 === 0
  const towerZ = (tower.ground + tower.top) / 2
  drawSprite(towerImgs[lit ? 1 : 0], tower.x, tower.y, towerZ, tower.ww, s, c)
  for (const r of rings) {
    if (r.got) continue
    drawSprite(ring, r.x, r.y, r.base + Math.sin(clock * 2 + r.x) * 2, 14, s, c)
  }
  octx.putImageData(img, 0, 0)
}

/** Billboard with a per-pixel depth test against the terrain. */
function drawSprite(sp, ox, oy, oz, ww, s, c) {
  const dx = wrapD(ox - px)
  const dy = wrapD(oy - py)
  const f = -dx * s - dy * c
  if (f < 3 || f > FAR) return
  const kx = RW / 2 / f
  const pw = ww * kx
  const ph = (pw * sp.h) / sp.w
  const cx = RW / 2 + (dx * c - dy * s) * kx
  const cy = ((camZ - oz) * SCALE) / f + horizon
  const x0 = Math.round(cx - pw / 2)
  const x1 = Math.round(cx + pw / 2)
  const y0 = Math.round(cy - ph / 2)
  const y1 = Math.round(cy + ph / 2)
  if (x1 <= x0 || y1 <= y0 || x1 < 0 || x0 >= RW || y1 < 0 || y0 >= RH) return
  const fogT = fogAt(f)
  for (let y = Math.max(0, y0); y < Math.min(RH, y1); y++) {
    const row = ((((y - y0) / (y1 - y0)) * sp.h) | 0) * sp.w
    for (let x = Math.max(0, x0); x < Math.min(RW, x1); x++) {
      const i = y * RW + x
      if (depth[i] <= f) continue
      const col = sp.data[row + ((((x - x0) / (x1 - x0)) * sp.w) | 0)]
      if (col >>> 24 < 128) continue
      buf[i] = fogT > 0.01 ? mix(col, FOG, fogT) : col
      depth[i] = f
    }
  }
}

function text(str, x, y, colour, align = 'left', size = 12) {
  sctx.font = `${size}px VT323, monospace`
  sctx.textAlign = align
  sctx.fillStyle = '#000'
  sctx.fillText(str, x + 1, y + 1)
  sctx.fillStyle = colour
  sctx.fillText(str, x, y)
}

const blink = rate => ((clock * rate) | 0) % 2 === 0
const mmss = t => `${(t / 60) | 0}:${String((t % 60) | 0).padStart(2, '0')}`

function draw() {
  sctx.imageSmoothingEnabled = false
  if (state === 'boot') return drawBoot()
  render()
  sctx.save()
  sctx.translate(W / 2, H / 2)
  if (!reduced) sctx.rotate(-roll * 0.5)
  if (state === 'crash' && !reduced) {
    sctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
  }
  sctx.drawImage(off, -RW / 2, -RH / 2)
  sctx.restore()

  if (state === 'crash' && !reduced && stateT < 0.25) {
    sctx.fillStyle = 'rgba(255,40,40,0.45)'
    sctx.fillRect(0, 0, W, H)
  }
  if (state === 'fly' || state === 'crash') drawHud()
  if (state === 'title') drawTitle()
  if (state === 'win') drawWin()
  if (msg && msg.t < 2) {
    const colour = msg.t % 0.3 < 0.15 ? '#ffff66' : '#ffffff'
    text(msg.text, W / 2, 46, colour, 'center', 16)
  }
  if (stick.on) {
    sctx.strokeStyle = 'rgba(255,255,255,0.6)'
    sctx.beginPath()
    sctx.arc(stick.x0, stick.y0, 18, 0, Math.PI * 2)
    sctx.stroke()
    sctx.fillStyle = 'rgba(255,255,102,0.8)'
    sctx.fillRect(
      stick.x0 + stick.x * 18 - 2,
      stick.y0 - stick.y * 18 - 2,
      5,
      5
    )
  }
}

function drawHud() {
  const alt = Math.max(0, camZ - hmap[at(px, py)]) | 0
  text(
    `ALT ${String(alt).padStart(3, '0')}  SPD ${speed | 0}`,
    6,
    13,
    '#33ff33'
  )
  text(`RINGS ${RINGS - ringsLeft()}/${RINGS}`, W - 6, 13, '#ffff66', 'right')
  text(mmss(flyT), W - 6, 25, '#ffffff', 'right')

  const R = 21
  const cx = W - 29
  const cy = H - 29
  sctx.fillStyle = 'rgba(0,0,40,0.75)'
  sctx.fillRect(cx - 23, cy - 23, 46, 46)
  sctx.strokeStyle = '#8888ff'
  sctx.strokeRect(cx - 22.5, cy - 22.5, 45, 45)
  const s = Math.sin(heading)
  const c = Math.cos(heading)
  const plot = (ox, oy, size, colour) => {
    const dx = wrapD(ox - px)
    const dy = wrapD(oy - py)
    let rx = ((dx * c - dy * s) / 230) * R
    let ry = ((dx * s + dy * c) / 230) * R
    const m = Math.max(Math.abs(rx), Math.abs(ry))
    if (m > R) {
      rx = (rx / m) * R
      ry = (ry / m) * R
    }
    sctx.fillStyle = colour
    sctx.fillRect(
      Math.round(cx + rx - size / 2),
      Math.round(cy + ry - size / 2),
      size,
      size
    )
  }
  rings.forEach(r => !r.got && plot(r.x, r.y, 2, '#ffd800'))
  if (ringsLeft() || blink(4)) plot(tower.x, tower.y, 3, '#33ff33')
  sctx.fillStyle = '#fff'
  sctx.beginPath()
  sctx.moveTo(cx, cy - 3)
  sctx.lineTo(cx + 3, cy + 3)
  sctx.lineTo(cx - 3, cy + 3)
  sctx.fill()
}

function panel(x, y, w, h) {
  sctx.fillStyle = 'rgba(0,0,40,0.8)'
  sctx.fillRect(x, y, w, h)
  sctx.strokeStyle = '#8888ff'
  sctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}

/** Same blue WordArt as the homepage heading. */
function wordart(str, y) {
  sctx.font = '28px Anton, Impact, sans-serif'
  sctx.textAlign = 'center'
  sctx.lineJoin = 'round'
  sctx.fillStyle = '#1d3fae'
  for (let i = 4; i > 0; i--) sctx.fillText(str, W / 2 + i, y + i)
  sctx.lineWidth = 3
  sctx.strokeStyle = '#1d3fae'
  sctx.strokeText(str, W / 2, y)
  sctx.fillStyle = '#5fc9fb'
  sctx.fillText(str, W / 2, y)
}

function drawTitle() {
  panel(40, 44, 240, 116)
  wordart('RINGFLY.EXE', 82)
  text(`Fly through all ${RINGS} rings`, W / 2, 104, '#ffffff', 'center', 14)
  text('then into the counter tower', W / 2, 118, '#ffffff', 'center', 14)
  if (blink(2)) {
    text('PRESS ENTER OR TAP TO FLY', W / 2, 146, '#ffff66', 'center', 14)
  }
}

function drawWin() {
  panel(40, 40, 240, 124)
  wordart('YOU WIN!!', 78)
  const summary = `Time ${mmss(winTime)}   Crashes ${crashes}`
  text(summary, W / 2, 102, '#33ff33', 'center', 14)
  if (hits) {
    const pilot = `You are pilot number ${String(hits).padStart(6, '0')}`
    text(pilot, W / 2, 118, '#ffffff', 'center', 14)
  }
  if (blink(2)) {
    text('PRESS ENTER OR TAP TO FLY AGAIN', W / 2, 150, '#ffff66', 'center', 14)
  }
}

function drawBoot() {
  sctx.fillStyle = '#000'
  sctx.fillRect(0, 0, W, H)
  const lines = [
    'C:\\PAULCHIU> ringfly.exe',
    'RINGFLY v0.98  (c) 1998 paulchiu.net',
    '',
    'Generating island ........ OK',
    'Paving superhighway ...... OK',
    `Hanging ${RINGS} rings .......... OK`,
    operator
      ? 'CTRL+SHIFT DETECTED. Welcome back, operator.'
      : 'Checking for operators ... none',
    '',
    tower ? 'Ready.' : 'Please wait...',
  ]
  const shown = Math.min(lines.length, Math.floor(stateT / 0.22) + 1)
  for (let i = 0; i < shown; i++) {
    const ok = lines[i].endsWith('OK') || lines[i].startsWith('CTRL')
    text(lines[i], 10, 20 + i * 14, ok ? '#33ff33' : '#c0c0c0', 'left', 14)
  }
  if (blink(3)) {
    sctx.fillStyle = '#c0c0c0'
    sctx.fillRect(10, 12 + shown * 14, 7, 10)
  }
}

/* ---------- Sound ---------- */

let ac = null
let muted = false
let master = null
let musicBus = null
let musicFilter = null
let wobble = null
let hiss = null

/** One output for everything, so mute is a single gain; music runs through a lowpass that follows the game state. */
function audioGraph() {
  master = ac.createGain()
  master.gain.value = muted ? 0 : 1
  master.connect(ac.destination)
  musicFilter = ac.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 2000
  musicBus = ac.createGain()
  musicBus.gain.value = 0.6
  musicBus.connect(musicFilter).connect(master)
  const lfo = ac.createOscillator()
  lfo.frequency.value = 0.35
  wobble = ac.createGain()
  wobble.gain.value = 12
  lfo.connect(wobble)
  lfo.start()
  const len = ac.sampleRate * 0.5
  hiss = ac.createBuffer(1, len, ac.sampleRate)
  const d = hiss.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
}

function beep(freqs, dur) {
  if (!ac) return
  let t = ac.currentTime
  for (const f of freqs) {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = 'square'
    o.frequency.value = f
    g.gain.setValueAtTime(0.04, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + dur)
    t += dur
  }
}

function noise() {
  if (!ac) return
  const src = ac.createBufferSource()
  const g = ac.createGain()
  g.gain.setValueAtTime(0.12, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5)
  src.buffer = hiss
  src.connect(g).connect(master)
  src.start()
}

/** Browsers only allow audio after a gesture, so (re)try on each one. */
function wakeAudio() {
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)()
      audioGraph()
    }
    if (ac.state === 'suspended') ac.resume()
  } catch {}
}

function toggleMute() {
  muted = !muted
  muteBtn.textContent = muted ? '×' : '♪'
  muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute')
  master?.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.02)
}

/* ---------- Music ---------- */

/**
 * A woozy lounge loop in A minor: swung 16ths, organ stabs on 2 and 4, a
 * gliding square lead with vibrato, and a slow detune wobble on every voice
 * so the whole thing drifts like worn tape.
 */
const BPM = 92
const STEP = 60 / BPM / 4
const SWING = STEP * 0.33
const BARS = 8
const mtof = m => 440 * 2 ** ((m - 69) / 12)

/** Am7, Fmaj7, Dm7, E7 */
const CHORDS = [
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [53, 57, 60, 62],
  [52, 56, 59, 62],
]
const ROOTS = [33, 29, 38, 40]
/** [step, semitones above root, length in steps] */
const BASS = [
  [0, 0, 5],
  [6, 12, 2],
  [10, 7, 2],
  [14, 12, 2],
]
/** One bar per row: [step, MIDI note, length in steps] */
const MELODY = [
  [
    [0, 76, 3],
    [4, 74, 2],
    [6, 72, 2],
    [8, 69, 6],
    [14, 72, 2],
  ],
  [
    [0, 72, 3],
    [4, 76, 2],
    [6, 77, 2],
    [8, 76, 4],
    [12, 72, 4],
  ],
  [
    [0, 74, 3],
    [4, 72, 2],
    [6, 69, 2],
    [8, 65, 4],
    [12, 69, 2],
    [14, 72, 2],
  ],
  [
    [0, 71, 6],
    [6, 68, 2],
    [8, 71, 2],
    [10, 74, 2],
    [12, 76, 4],
  ],
  [
    [0, 81, 3],
    [4, 79, 2],
    [6, 76, 2],
    [8, 72, 4],
    [12, 76, 2],
    [14, 79, 2],
  ],
  [
    [0, 77, 6],
    [6, 76, 2],
    [8, 72, 4],
    [12, 69, 4],
  ],
  [
    [0, 74, 2],
    [2, 77, 2],
    [4, 81, 4],
    [8, 79, 2],
    [10, 77, 2],
    [12, 74, 4],
  ],
  [
    [0, 76, 4],
    [4, 75, 2],
    [6, 74, 2],
    [8, 71, 4],
    [12, 68, 2],
    [14, 71, 2],
  ],
]

let musicTimer = 0
let nextStep = 0
let nextTime = 0
let lastLead = 0

function voice(midi, t, dur, opts) {
  const { type, gain, cutoff = 0, detune = 0, stab = false } = opts
  const { vibrato = 0, glideFrom = 0, release = 0.08 } = opts
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.detune.value = detune
  o.frequency.setValueAtTime(mtof(glideFrom || midi), t)
  if (glideFrom) o.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.07)
  wobble.connect(o.detune)
  const nodes = [o]
  if (vibrato) {
    const v = ac.createOscillator()
    const depth = ac.createGain()
    v.frequency.value = 5.5
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(vibrato, t + 0.3)
    v.connect(depth).connect(o.detune)
    v.start(t)
    v.stop(t + dur + release)
    nodes.push(v)
  }
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.008)
  if (stab) g.gain.setTargetAtTime(gain * 0.3, t + 0.01, 0.1)
  g.gain.setTargetAtTime(0, t + dur, release / 3)
  let out = o
  if (cutoff) {
    out = ac.createBiquadFilter()
    out.type = 'lowpass'
    out.frequency.value = cutoff
    o.connect(out)
  }
  out.connect(g).connect(musicBus)
  o.start(t)
  o.stop(t + dur + release * 2)
  o.onended = () => wobble.disconnect(o.detune)
}

function drum(t, kind) {
  if (kind === 'kick') {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.setValueAtTime(110, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
    o.connect(g).connect(musicBus)
    o.start(t)
    o.stop(t + 0.3)
    return
  }
  const src = ac.createBufferSource()
  const f = ac.createBiquadFilter()
  const g = ac.createGain()
  const hat = kind !== 'rim'
  f.type = hat ? 'highpass' : 'bandpass'
  f.frequency.value = hat ? 7000 : 1800
  const level = kind === 'rim' ? 0.07 : kind === 'open' ? 0.022 : 0.012
  g.gain.setValueAtTime(level, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + (hat ? 0.05 : 0.09))
  src.buffer = hiss
  src.connect(f).connect(g).connect(musicBus)
  src.start(t, Math.random() * 0.4, 0.1)
}

function playStep(step, t) {
  const bar = step >> 4
  const s = step & 15
  const ch = bar % 4
  if (s === 0) {
    for (const n of CHORDS[ch]) {
      voice(n, t, STEP * 15, { type: 'sawtooth', gain: 0.01, cutoff: 700 })
    }
  }
  if (s === 4 || s === 12) {
    for (const n of CHORDS[ch]) {
      const stab = { type: 'square', gain: 0.016, cutoff: 1500, stab: true }
      voice(n, t, STEP * 1.5, stab)
      voice(n + 12, t, STEP * 1.5, { ...stab, gain: 0.006, detune: 9 })
    }
  }
  for (const [bs, iv, len] of BASS) {
    if (bs !== s) continue
    const n = ROOTS[ch] + iv
    voice(n, t, STEP * len * 0.85, { type: 'triangle', gain: 0.16 })
    voice(n, t, STEP * len * 0.85, { type: 'square', gain: 0.02, cutoff: 420 })
  }
  for (const [ms, n, len] of MELODY[bar]) {
    if (ms !== s) continue
    const glideFrom = lastLead && Math.abs(n - lastLead) <= 5 ? lastLead : 0
    voice(n, t, STEP * len * 0.9, {
      type: 'square',
      gain: 0.032,
      cutoff: 2600,
      vibrato: 18,
      glideFrom,
      release: 0.15,
    })
    lastLead = n
  }
  if (s === 0 || s === 8 || s === 11) drum(t, 'kick')
  if (s === 4 || s === 12) drum(t, 'rim')
  if (s % 2 === 0) drum(t, s % 4 === 2 ? 'open' : 'hat')
}

function scheduleMusic() {
  /** After a throttled timer, skip ahead rather than fire the backlog at once. */
  if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05
  while (nextTime < ac.currentTime + 0.15) {
    playStep(nextStep, nextTime + (nextStep % 4 === 2 ? SWING : 0))
    nextStep = (nextStep + 1) % (BARS * 16)
    nextTime += STEP
  }
}

function startMusic() {
  if (!ac || musicTimer) return
  nextStep = 0
  lastLead = 0
  nextTime = ac.currentTime + 0.1
  musicTimer = setInterval(scheduleMusic, 25)
  scheduleMusic()
}

function stopMusic() {
  clearInterval(musicTimer)
  musicTimer = 0
}

/** Muffled on the title, open in flight, underwater on a crash. */
function musicMood() {
  if (!musicFilter) return
  const cutoff = { title: 1800, fly: 7000, crash: 380, win: 9000 }[state]
  if (cutoff) {
    const lag = state === 'crash' ? 0.03 : 0.5
    musicFilter.frequency.setTargetAtTime(cutoff, ac.currentTime, lag)
  }
}

/* ---------- Open, close and input ---------- */

let raf = 0
let last = 0
let opener = null

function frame(now) {
  raf = requestAnimationFrame(frame)
  const dt = clamp((now - last) / 1000 || 0, 0, 0.05)
  last = now
  update(dt)
  draw()
}

function close() {
  modal.hidden = true
  cancelAnimationFrame(raf)
  stopMusic()
  keys.clear()
  stick.on = false
  opener?.focus()
}

function advance() {
  wakeAudio()
  if (state === 'boot' && tower) setState('title')
  else if (state === 'title' || state === 'win') startFlight()
}

/**
 * Opens the game window. `asOperator` is true when the π was clicked with
 * Ctrl+Shift (or Cmd+Shift), the backdoor combo from The Net.
 */
export async function openEgg(asOperator, from) {
  operator = asOperator
  opener = from
  modal.hidden = false
  screen.focus()
  wakeAudio()
  setState('boot')
  clock = 0
  last = performance.now()
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(frame)
  built = built || build()
  await built
  respawn(0)
}

modal.addEventListener('click', e => {
  const act = e.target.closest('button')?.dataset.act
  if (act === 'close' || e.target === modal) close()
  if (act === 'mute') toggleMute()
})

const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
])

addEventListener('keydown', e => {
  if (modal.hidden) return
  if (e.code === 'Escape') return close()
  if (e.code === 'KeyM') return toggleMute()
  if (e.target.tagName === 'BUTTON') return
  if (e.code === 'Enter' || (e.code === 'Space' && state !== 'fly')) {
    e.preventDefault()
    return advance()
  }
  if (GAME_KEYS.has(e.code)) {
    e.preventDefault()
    keys.add(e.code)
  }
})
addEventListener('keyup', e => keys.delete(e.code))
document.addEventListener('visibilitychange', () => {
  if (!ac || modal.hidden) return
  if (document.hidden) ac.suspend()
  else ac.resume()
})
addEventListener('blur', () => keys.clear())

function toCanvas(e) {
  const r = screen.getBoundingClientRect()
  return [
    ((e.clientX - r.left) / r.width) * W,
    ((e.clientY - r.top) / r.height) * H,
  ]
}

screen.addEventListener('pointerdown', e => {
  if (state !== 'fly') return advance()
  screen.setPointerCapture(e.pointerId)
  ;[stick.x0, stick.y0] = toCanvas(e)
  stick.x = stick.y = 0
  stick.on = true
})
screen.addEventListener('pointermove', e => {
  if (!stick.on) return
  const [x, y] = toCanvas(e)
  stick.x = clamp((x - stick.x0) / 30, -1, 1)
  stick.y = clamp((stick.y0 - y) / 30, -1, 1)
})
const release = () => {
  stick.on = false
  stick.x = stick.y = 0
}
screen.addEventListener('pointerup', release)
screen.addEventListener('pointercancel', release)
