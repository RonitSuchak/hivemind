import { useEffect, useRef } from 'react'
import { damp, state, subscribe } from './state.js'

// The stage behind the page: a WebGL liquid field with a glass lens under the pointer, and coloured
// tube trails on top of it. Decorative only (aria-hidden); every word of the site stays in the DOM.
// Two render passes (doc 6): 1) the liquid scene into a half-size framebuffer, 2) a composite pass that
// refracts it through the lens, adds bloom from the bright regions, then grain and a vignette.

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'

const SCENE = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uVel, uScroll, uPulse, uOct, uLight, uGround;
uniform vec2 uPointer;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { if (float(i) >= uOct) break; v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 mp = vec2(uPointer.x * aspect, uPointer.y) * 0.5;
  float md = length(p - mp);
  p.y -= uScroll * 0.18;                                  // the scene drifts at a fraction of the scroll
  // UV distortion (doc 4.5): u' = u + A sin(f v + w t). Scroll speed and page changes raise A.
  float A = 0.04 + 0.11 * abs(uVel) + 0.05 * uPulse;
  vec2 q = p;
  q.x += A * sin(3.1 * p.y + 0.55 * uTime);
  q.y += A * sin(2.7 * p.x + 0.45 * uTime) + 0.07 * uVel;
  q += (p + vec2(0.0, uScroll * 0.18) - mp) * 0.10 * exp(-md * md * 9.0) * uLight;   // the liquid bulges away from the pointer
  vec2 w = vec2(fbm(q * 1.3 + vec2(0.0, uTime * 0.045)), fbm(q * 1.3 + vec2(5.2, -uTime * 0.04)));
  float n = fbm(q * 1.7 + 1.7 * w);
  vec3 blue = vec3(0.10, 0.17, 0.36), violet = vec3(0.30, 0.40, 0.62), orange = vec3(0.10, 0.58, 0.48); // navy, blue-grey, teal (the names are historic)
  vec3 tint = mix(blue, violet, smoothstep(0.38, 0.56, n));
  tint = mix(tint, orange, smoothstep(0.50, 0.66, w.x));
  float body = pow(n, 2.4) * 0.6;
  float f = sin(10.0 * n + 3.0 * w.y + 0.14 * uTime);
  float line = pow(1.0 - abs(f), 10.0) * (0.35 + n) * 0.0; // the bright lines are now drawn as strings of letters (makeStrings below)
  vec3 col = vec3(0.012, 0.020, 0.045) + tint * (body + line * (0.8 + 0.6 * abs(uVel)));
  col += orange * 0.10 * exp(-md * md * 14.0) * uLight;   // a small light that follows the pointer
  // White ground: the same plasma as pale ink and persimmon washes on paper, plus a faint drafting grid.
  vec3 wash = mix(vec3(0.78, 0.84, 0.96), vec3(0.64, 0.73, 0.93), smoothstep(0.38, 0.56, n));
  wash = mix(wash, vec3(0.66, 0.89, 0.82), smoothstep(0.50, 0.66, w.x));
  float amt = clamp(body * 0.7, 0.0, 1.0);
  vec3 paper = vec3(1.0) - (vec3(1.0) - wash) * amt;
  paper -= (vec3(1.0) - vec3(1.0, 0.70, 0.58)) * 0.35 * exp(-md * md * 14.0) * uLight;
  gl_FragColor = vec4(mix(col, paper, uGround), 1.0);
}`

const COMPOSITE = `
precision highp float;
uniform sampler2D uScene; uniform vec2 uRes, uLens; uniform float uTime, uBloom, uLensOn, uGround, uVel, uScroll;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // Glass lens (doc 4.6): no ray tracing, just UV_refracted = UV + N.xy * k, split per colour channel.
  vec2 d = (gl_FragCoord.xy - uLens) / uRes.y;
  float R = 0.075, r = length(d);
  float inside = smoothstep(R, R * 0.82, r) * uLensOn;
  vec2 N = d / R * (0.4 + 0.6 * r / R);
  vec2 k = N * inside * vec2(uRes.y / uRes.x, 1.0);
  vec3 c = vec3(texture2D(uScene, uv - k * 0.022).r, texture2D(uScene, uv - k * 0.026).g, texture2D(uScene, uv - k * 0.031).b);
  // Scroll speed splits the colours a little (red leads, blue trails), like light through a prism.
  float sp = uVel * 0.006;
  c.r = mix(c.r, texture2D(uScene, uv + vec2(0.0, sp)).r, 0.85 * step(0.001, abs(sp)));
  c.b = mix(c.b, texture2D(uScene, uv - vec2(0.0, sp)).b, 0.85 * step(0.001, abs(sp)));
  // Bloom (doc 6.3): I_final = I_scene + k B(I_bright)
  if (uBloom > 0.0) {
    vec3 b = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = 0.7854 * float(i);
      vec2 o = vec2(cos(a), sin(a)) * vec2(uRes.y / uRes.x, 1.0);
      b += max(texture2D(uScene, uv + o * 0.012).rgb - 0.30, 0.0) + max(texture2D(uScene, uv + o * 0.030).rgb - 0.30, 0.0) * 0.6;
    }
    c += uBloom * b * 0.16;
  }
  // the faint drafting grid on paper, drawn after the lighting so its lines stay flat ink
  vec2 gd = abs(fract((gl_FragCoord.xy + vec2(0.0, uScroll * uRes.y * 0.18)) / (uRes.y * 0.085)) - 0.5);
  c -= uGround * smoothstep(0.485, 0.5, max(gd.x, gd.y)) * 0.018;
  float rim = smoothstep(R * 0.80, R * 0.97, r) * smoothstep(R * 1.02, R * 0.97, r);
  c += vec3(1.0, 0.96, 0.92) * rim * 0.05 * uLensOn * (1.0 - 2.0 * uGround);   // hairline rim: light on midnight, dark on white
  c *= 1.0 - (0.38 - 0.32 * uGround) * dot(uv - 0.5, uv - 0.5) * 2.0;        // vignette
  c += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.022;     // grain: hides banding in the dark tones
  gl_FragColor = vec4(c, 1.0);
}`

// Quality levels (doc 9.1). pr = canvas pixels per CSS pixel.
const QUALITY = {
// The background is soft colour washes, so it does not need many pixels: 1 canvas pixel per CSS pixel at most.
  high: { pr: 1, oct: 4, bloom: 1, trails: false, glow: true, sub: 6, strings: 4 },
  medium: { pr: 0.75, oct: 3, bloom: 0.6, trails: false, glow: false, sub: 4, strings: 3 },
  low: { pr: 0.5, oct: 3, bloom: 0, trails: false, glow: false, sub: 0, strings: 2 }, // even the lowest level keeps some equations
}
const ORDER = ['low', 'medium', 'high']

function makeRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl) return null
  const shader = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[stage] shader:', gl.getShaderInfoLog(s)); return null }
    return s
  }
  const program = (frag) => {
    const v = shader(gl.VERTEX_SHADER, VERT), f = shader(gl.FRAGMENT_SHADER, frag)
    if (!v || !f) return null
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('[stage] link:', gl.getProgramInfoLog(p)); return null }
    const u = {}
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name) }
    return { p, u }
  }
  const scene = program(SCENE), comp = program(COMPOSITE)
  if (!scene || !comp) return null
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW) // one triangle covers the screen
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  const fbo = gl.createFramebuffer()
  let W = 1, H = 1, w2 = 1, h2 = 1
  return {
    resize(w, h) {
      W = canvas.width = Math.max(1, Math.round(w)); H = canvas.height = Math.max(1, Math.round(h))
      w2 = Math.max(1, W >> 1); h2 = Math.max(1, H >> 1)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w2, h2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    },
    draw(s, q, lens) {
      // Pass 1: liquid scene -> framebuffer texture
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, w2, h2); gl.useProgram(scene.p)
      gl.uniform2f(scene.u.uRes, w2, h2); gl.uniform1f(scene.u.uTime, s.time); gl.uniform1f(scene.u.uVel, s.vel)
      gl.uniform1f(scene.u.uScroll, s.scrollPosition / Math.max(1, window.innerHeight)); gl.uniform1f(scene.u.uPulse, s.transitionProgress)
      const ground = s.ground === 'white' ? 1 : 0
      gl.uniform1f(scene.u.uGround, ground); gl.uniform1f(scene.u.uOct, q.oct); gl.uniform1f(scene.u.uLight, lens.on); gl.uniform2f(scene.u.uPointer, lens.nx, lens.ny)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      // Pass 2: refraction + bloom + grain -> screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(comp.p)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(comp.u.uScene, 0)
      gl.uniform2f(comp.u.uRes, W, H); gl.uniform2f(comp.u.uLens, lens.x * W, (1 - lens.y) * H)
      gl.uniform1f(comp.u.uTime, s.time); gl.uniform1f(comp.u.uGround, ground); gl.uniform1f(comp.u.uBloom, ground ? 0 : q.bloom); gl.uniform1f(comp.u.uLensOn, lens.on); gl.uniform1f(comp.u.uVel, s.vel); gl.uniform1f(comp.u.uScroll, s.scrollPosition / Math.max(1, window.innerHeight))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext() },
  }
}

// ---- Trails (doc 4.7, 7.3): sampled positions -> Catmull-Rom spline -> a tapered, shaded ribbon. ----
// The other "visitors" are simulated here in the browser. The real site syncs them over a server;
// this copy stays local, so nothing leaves the machine.
const LIFE = 0.42 // seconds a trail point lives
const TRAILS = [{ you: true, rgb: [244, 81, 30], w: 1.7, pts: [] }] // one fine line behind the pointer, no other visitors
const catmull = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)

function makeTrails(canvas) {
  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, pr = 1, dirty = false, prevScroll = window.scrollY
  const css = (rgb, m, a = 1) => `rgb(${rgb.map((v) => Math.round(v * m)).join(' ')} / ${a})`
  const ribbon = (S, width, scale, shift) => {
    const n = S.length, L = [], Rr = []
    for (let i = 0; i < n; i++) {
      const p = S[i], a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)]
      let nx = -(b.y - a.y), ny = b.x - a.x
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len
      const u = i / (n - 1)
      const w = width * Math.pow(u, 0.75) * Math.sqrt(Math.min(1, (1 - u) / 0.05 + 0.15)) // thin tail, round head
      const cx = p.x + nx * w * shift, cy = p.y + ny * w * shift
      L.push([cx + nx * w * scale, cy + ny * w * scale]); Rr.push([cx - nx * w * scale, cy - ny * w * scale])
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1])
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1])
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1])
    ctx.closePath(); ctx.fill()
  }
  return {
    resize(w, h, ratio) { W = w; H = h; pr = ratio; canvas.width = Math.round(w * pr); canvas.height = Math.round(h * pr) },
    clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); TRAILS.forEach((t) => { t.pts.length = 0 }); dirty = false },
    draw(s, q) {
      let dy = window.scrollY - prevScroll; prevScroll = window.scrollY
      if (Math.abs(dy) > 60) dy = Math.sign(dy) * 60 // a jump must not stretch a trail into a beam
      let any = false
      for (const tr of TRAILS) {
        // head position this frame
        let hx = null, hy = null
        if (tr.you) { if (s.pointerOn) { hx = s.sx; hy = s.sy } }
        else if (Math.sin(s.time * 0.11 + tr.o) > -0.15) { // a simulated visitor drops in and out
          hx = W * (0.5 + 0.44 * Math.sin(s.time * tr.a + tr.o) * Math.cos(s.time * tr.b * 0.6))
          hy = H * (0.5 + 0.40 * Math.sin(s.time * tr.b + tr.o * 2))
        }
        for (const p of tr.pts) p.y -= dy * 0.3 // trails drag a little with the page while it scrolls
        while (tr.pts.length && s.time - tr.pts[0].t > LIFE) tr.pts.shift()
        if (hx !== null) {
          const l = tr.pts[tr.pts.length - 1]
          if (!l || Math.hypot(hx - l.x, hy - l.y) > 7) tr.pts.push({ x: hx, y: hy, t: s.time })
        }
        if (tr.pts.length >= 3) any = true
      }
      if (!any && !dirty) return
      ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, W, H); dirty = any
      for (const tr of TRAILS) {
        const P = tr.pts, n = P.length
        if (n < 3) continue
        const S = []
        for (let i = 0; i < n - 1; i++) {
          const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(n - 1, i + 2)]
          for (let j = 0; j < q.sub; j++) { const t = j / q.sub; S.push({ x: catmull(a.x, b.x, c.x, d.x, t), y: catmull(a.y, b.y, c.y, d.y, t) }) }
        }
        S.push(P[n - 1])
        // three layers make the ribbon read as a lit tube: dark body, bright core, thin highlight
        ctx.fillStyle = css(tr.rgb, 1, 0.85); ribbon(S, tr.w, 1, 0) // a single tapered hairline
      }
    },
  }
}

// ---- Strings: the plasma's lines, written in letters. ----
// Each string is a line of equations and quotes flowing around a slow, wobbling loop (the same shape the
// plasma lines had). Every letter is its own particle on a spring: bring the pointer near and the letters
// scatter and tumble; move away and the spring pulls each one back into its place in the line.
const WORDS = [
  'e^(iπ) + 1 = 0', 'E = mc²', 'a² + b² = c²', 'F = ma', 'Δx · Δp ≥ ħ / 2', '∇ · E = ρ / ε₀',
  'x = (−b ± √(b² − 4ac)) / 2a', 'Σ 1/n² = π² / 6', '∫ e^(−x²) dx = √π', 'PV = nRT', 'λ = h / p', 'MR = MC',
  'iħ ∂ψ/∂t = Ĥψ', 'S = k log W', 'ΔS ≥ 0', 'cogito, ergo sum',
  '“The mind is not a vessel to be filled, but a fire to be kindled.” Plutarch',
  '“If I have seen further, it is by standing on the shoulders of giants.” Newton',
  '“The unexamined life is not worth living.” Socrates',
  '“I think, therefore I am.” Descartes',
]
// cx, cy: centre as a fraction of the screen. r: radius as a fraction of the shorter side. depth: how fast it sinks on scroll.
const LOOPS = [
  { cx: 0.20, cy: 0.30, r: 0.30, depth: 0.22, size: 21, dir: 1 },
  { cx: 0.82, cy: 0.22, r: 0.24, depth: 0.34, size: 19, dir: -1, pop: true },
  { cx: 0.66, cy: 0.74, r: 0.34, depth: 0.16, size: 22, dir: 1 },
  { cx: 0.10, cy: 0.86, r: 0.20, depth: 0.42, size: 18, dir: -1 },
  { cx: 0.46, cy: 0.42, r: 0.17, depth: 0.50, size: 17, dir: 1 },
  { cx: 0.95, cy: 0.62, r: 0.22, depth: 0.28, size: 19, dir: 1 },
  { cx: 0.38, cy: 1.05, r: 0.26, depth: 0.36, size: 20, dir: -1, pop: true },
  { cx: 0.58, cy: 0.10, r: 0.21, depth: 0.30, size: 18, dir: -1 },
  { cx: 0.04, cy: 0.52, r: 0.25, depth: 0.20, size: 20, dir: 1 },
  { cx: 0.80, cy: 0.98, r: 0.19, depth: 0.46, size: 17, dir: 1 },
  { cx: 0.30, cy: 0.66, r: 0.14, depth: 0.55, size: 16, dir: -1, pop: true },
]
const REACH = 150 // px: how close the pointer gets before letters scatter

function makeStrings(canvas) {
  const ctx = canvas.getContext('2d')
  let W = 1, H = 1, pr = 1, loops = [], dirty = false
  // Speed: drawing a turned letter as text is slow (the browser redraws its outline every time). So each
  // letter is drawn once into a tiny picture, and after that the picture is stamped, which is many times faster.
  const fontOf = (size) => `italic 400 ${size}px "Newsreader Variable", "Iowan Old Style", Georgia, serif`
  const stamps = new Map()
  document.fonts?.ready.then(() => stamps.clear()) // redo the pictures once the real font has loaded
  const stamp = (ch, size, colour) => {
    const key = size + colour + ch
    let c = stamps.get(key)
    if (!c) {
      const box = Math.ceil(size * 1.5 * pr)
      c = document.createElement('canvas'); c.width = c.height = box
      const x = c.getContext('2d')
      x.font = fontOf(size * pr); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = colour
      x.fillText(ch, box / 2, box / 2)
      stamps.set(key, c)
    }
    return c
  }
  const build = () => {
    const short = Math.min(W, H)
    loops = LOOPS.map((L, li) => {
      const R = Math.max(90, L.r * short), cw = L.size * 0.47          // one fixed step per letter keeps the line even on a curve
      const n = Math.floor((Math.PI * 2 * R) / cw)
      let text = ''
      for (let k = li * 3; text.length < n; k++) text += WORDS[k % WORDS.length] + '   ·   '
      return { ...L, R, cw, n, chars: [...text].slice(0, n), ox: new Float32Array(n), oy: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n), rot: new Float32Array(n), vr: new Float32Array(n) }
    })
  }
  return {
    resize(w, h, ratio) { W = w; H = h; pr = ratio; canvas.width = Math.round(w * pr); canvas.height = Math.round(h * pr); stamps.clear(); build() },
    clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false },
    draw(s, q) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = true
      const light = s.ground === 'white', ink = light ? '15 23 47' : '255 255 255'
      const mx = s.pointerOn ? s.sx : -9999, my = s.pointerOn ? s.sy : -9999
      const span = H + 700, wob = 1 + 1.6 * Math.abs(s.vel) + 0.3 * s.transitionProgress // the lines ripple harder at speed
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const small = W < 520 // phones: fewer, fainter strings so they never fight the body text
      ctx.globalAlpha = small ? 0.55 : 1
      for (let li = 0; li < Math.min(small ? 2 : q.strings, loops.length); li++) {
        const L = loops[li]
        const cx = L.cx * W, cy = ((((L.cy * H - s.scrollPosition * L.depth) % span) + span) % span) - 350
        if (cy < -L.R * 1.5 || cy > H + L.R * 1.5) continue
        const base = `rgb(${ink} / ${(light ? 0.32 : 0.4) + (0.5 - L.depth) * 0.26})`, hot = light ? 'rgb(244 81 30 / 0.9)' : 'rgb(255 122 82 / 0.95)'
        const idle = L.pop ? (light ? 'rgb(244 81 30 / 0.5)' : 'rgb(255 122 82 / 0.55)') : base
        const flow = (s.time * 14 * L.dir) / L.R // the text travels round the loop
        for (let j = 0; j < L.n; j++) {
          const th = (L.dir * j * L.cw) / L.R + flow // dir -1 runs the other way round, still reading left to right
          const rr = L.R * (1 + wob * (0.16 * Math.sin(3 * th + s.time * 0.21 + li * 2.1) + 0.08 * Math.sin(5 * th - s.time * 0.16 + li)))
          const hx = cx + Math.cos(th) * rr, hy = cy + Math.sin(th) * rr
          if (hy < -40 || hy > H + 40 || hx < -40 || hx > W + 40) { L.ox[j] = L.oy[j] = L.vx[j] = L.vy[j] = L.rot[j] = L.vr[j] = 0; continue }
          // pointer: push the letter away and set it spinning
          const dx = hx + L.ox[j] - mx, dy = hy + L.oy[j] - my, d = Math.hypot(dx, dy)
          if (d < REACH) {
            const f = (1 - d / REACH) * 2600 * s.dt, k = d || 1
            L.vx[j] += (dx / k) * f + (Math.random() - 0.5) * f * 0.9
            L.vy[j] += (dy / k) * f + (Math.random() - 0.5) * f * 0.9
            L.vr[j] += (Math.random() - 0.5) * 60 * s.dt
          }
          // spring back to its place in the line (m x'' + c x' + k x = 0)
          L.vx[j] += (-34 * L.ox[j] - 5.5 * L.vx[j]) * s.dt; L.vy[j] += (-34 * L.oy[j] - 5.5 * L.vy[j]) * s.dt
          L.vr[j] += (-30 * L.rot[j] - 5 * L.vr[j]) * s.dt
          L.ox[j] += L.vx[j] * s.dt; L.oy[j] += L.vy[j] * s.dt; L.rot[j] += L.vr[j] * s.dt
          const ch = L.chars[j]
          if (ch === ' ') continue
          const away = Math.abs(L.ox[j]) + Math.abs(L.oy[j]) > 6
          const spr = stamp(ch, L.size, away ? hot : idle) // scattered letters turn orange
          const a = th + (L.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + L.rot[j], c = Math.cos(a), sn = Math.sin(a)
          ctx.setTransform(c, sn, -sn, c, (hx + L.ox[j]) * pr, (hy + L.oy[j]) * pr)
          ctx.drawImage(spr, -spr.width / 2, -spr.height / 2)
        }
      }
    },
  }
}

export default function Stage() {
  const root = useRef(null), glCanvas = useRef(null), trailCanvas = useRef(null), stringCanvas = useRef(null)

  useEffect(() => {
    const el = root.current, cg = glCanvas.current, ct = trailCanvas.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let level = 'high', q = QUALITY[level]
    let renderer = makeRenderer(cg)
    const trails = makeTrails(ct)
    const strings = makeStrings(stringCanvas.current)
    const lens = { x: 0.5, y: 0.5, nx: 0, ny: 0, on: 0 }
    el.classList.toggle('stage-nogl', !renderer) // CSS gradient fallback when WebGL is missing

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1
      renderer?.resize(w * Math.min(dpr, q.pr), h * Math.min(dpr, q.pr))
      trails.resize(w, h, Math.min(dpr, q.glow ? 1.5 : 1))
      strings.resize(w, h, Math.min(dpr, q.glow ? 1.5 : 1)) // 1.5 is sharp enough for letters and almost halves the pixels to fill
      if (reduced) renderer?.draw({ ...state, time: 14 }, q, lens) // one still frame, no loop
    }
    const setLevel = (next) => {
      level = next; q = QUALITY[level]; state.qualityLevel = level
      document.documentElement.dataset.quality = level
      if (!q.trails) trails.clear()
      if (!q.strings) strings.clear()
      resize()
    }
    setLevel(level)
    const dbg = { gl: true, strings: true, lock: false } // for speed checks: window.__stage.set('high'), window.__stage.dbg.gl = false
    window.__stage = { set: (l) => { dbg.lock = true; setLevel(l) }, dbg }
    window.addEventListener('resize', resize)

    // WebGL context loss (doc 9.3): stop drawing, rebuild when the browser hands the context back.
    const lost = (e) => { e.preventDefault(); renderer = null }
    const restored = () => { renderer = makeRenderer(cg); el.classList.toggle('stage-nogl', !renderer); resize() }
    cg.addEventListener('webglcontextlost', lost)
    cg.addEventListener('webglcontextrestored', restored)

    // Adaptive quality (doc 9.2): judge by measured frame rate, with a cooldown so it cannot flip-flop.
    let odd = false; const skip = {} // a copy of the frame state for the letters, with the time step doubled
    let acc = 0, frames = 0, sinceChange = 0, recoveries = 0, art = null, artCheck = 0
    const unsub = reduced ? () => {} : subscribe((s) => {
      lens.on = 0 // nothing is drawn at the cursor: no ray, no ripple, no ring. The letters that scatter are the feedback.
      if (s.sx > -9000) { lens.x = s.sx / window.innerWidth; lens.y = s.sy / window.innerHeight; lens.nx = lens.x * 2 - 1; lens.ny = 1 - lens.y * 2 }
      skip.time = s.time; skip.dt = Math.min(0.05, s.dt * 2); skip.vel = s.vel; skip.ground = s.ground; skip.pointerOn = s.pointerOn; skip.sx = s.sx; skip.sy = s.sy; skip.scrollPosition = s.scrollPosition; skip.transitionProgress = s.transitionProgress
      if (dbg.gl) renderer?.draw(s, q, lens)
      if (q.trails) trails.draw(s, q)
      // the letters are redrawn on every second frame (30 times a second is plenty for slow text), which halves their cost
      if (q.strings && dbg.strings && (odd = !odd)) strings.draw(skip, q)

      // pointer parallax on the hero art (secondary motion: depth)
      if (--artCheck < 0) { artCheck = 30; if (!art?.isConnected) art = document.querySelector('.hero-art') }
      if (art) art.style.translate = `${(-lens.nx * lens.on * 14).toFixed(2)}px ${(lens.ny * lens.on * 10).toFixed(2)}px`

      if (s.rawDt > 0.25) { acc = 0; frames = 0; return } // tab was hidden or throttled: not a real measurement
      acc += s.rawDt; frames++; sinceChange += s.rawDt
      if (acc < 2 || dbg.lock) return
      const fps = frames / acc; acc = 0; frames = 0
      const i = ORDER.indexOf(level)
      if (fps < 40 && i > 0 && sinceChange > 4) { sinceChange = 0; setLevel(ORDER[i - 1]) }
      else if (fps > 57 && i < 2 && sinceChange > 12 && recoveries < 2) { sinceChange = 0; recoveries++; setLevel(ORDER[i + 1]) }
    })

    return () => {
      unsub()
      window.removeEventListener('resize', resize)
      cg.removeEventListener('webglcontextlost', lost)
      cg.removeEventListener('webglcontextrestored', restored)
      trails.clear()
      if (art) art.style.translate = ''
      // The context is left alone on purpose: React's dev double-mount reuses this same canvas.
    }
  }, [])

  return (
    <div className="stage" aria-hidden="true" ref={root}>
      <canvas ref={glCanvas} className="stage-gl" />
      <canvas ref={stringCanvas} className="stage-strings" />
      <canvas ref={trailCanvas} className="stage-trails" />
    </div>
  )
}
