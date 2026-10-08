// Vibe 知识大赏通用笔墨工具：宣纸、毛笔线、文字、字幕、印章。每条视频的 scene.html 先引入它。
const W = 1080, H = 1920;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const KIT = document.currentScript.src.replace(/ink\.js.*$/, '');
const INK = '#1b1712', RED = '#b8322a', MUTE = '#7a6e60', PAPER = '#efe8da';
const SERIF = '"Noto Serif SC"', EN = '"EB Garamond"';

// ---------- 工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const prog = (t, a, b) => ease((t - a) / (b - a));
// 在 [a,b] 区间内显示，前后各 f 秒淡入淡出
const win = (t, a, b, f = .45) => clamp(Math.min((t - a) / f, (b - t) / f));
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function hash(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

// ---------- 宣纸 ----------
const paper = document.createElement('canvas'); paper.width = W; paper.height = H;
(function makePaper() {
  const p = paper.getContext('2d'), r = rng(7);
  p.fillStyle = PAPER; p.fillRect(0, 0, W, H);
  for (const [gw, a] of [[12, .10], [36, .07], [110, .05]]) {   // 多尺度云纹
    const n = document.createElement('canvas'); n.width = gw; n.height = Math.round(gw * H / W);
    const nc = n.getContext('2d'), img = nc.createImageData(n.width, n.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + r() * 100; img.data[i] = v; img.data[i + 1] = v * .96; img.data[i + 2] = v * .88; img.data[i + 3] = 255;
    }
    nc.putImageData(img, 0, 0);
    p.globalAlpha = a; p.globalCompositeOperation = 'multiply'; p.imageSmoothingEnabled = true;
    p.drawImage(n, 0, 0, W, H);
  }
  p.globalCompositeOperation = 'source-over';
  p.strokeStyle = '#8a7a62';                                     // 纸纤维
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H, l = 10 + r() * 40, a = r() * Math.PI;
    p.globalAlpha = .025 + r() * .04; p.lineWidth = .6 + r();
    p.beginPath(); p.moveTo(x, y);
    p.quadraticCurveTo(x + Math.cos(a) * l * .5 + r() * 6, y + Math.sin(a) * l * .5 + r() * 6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    p.stroke();
  }
  p.globalAlpha = 1;
  const glow = p.createRadialGradient(W * .5, H * .38, 80, W * .5, H * .45, H * .75);  // 中心提亮、四角压暗
  glow.addColorStop(0, 'rgba(255,250,238,.35)'); glow.addColorStop(.6, 'rgba(255,250,238,0)'); glow.addColorStop(1, 'rgba(70,52,30,.22)');
  p.fillStyle = glow; p.fillRect(0, 0, W, H);
})();

// ---------- 笔墨 ----------
// 一笔毛笔线：k 为书写进度 0..1，同一 id 的笔触每帧形状一致
function brush(id, x1, y1, x2, y2, k, w = 7, color = INK, alpha = 1) {
  if (k <= 0 || alpha <= 0) return;
  const r = rng(hash(id)), segs = 40, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len, n = Math.max(1, Math.floor(segs * clamp(k)));
  const wob = [], wid = [];
  let ph1 = r() * 6, ph2 = r() * 6;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    wob.push(Math.sin(u * 5 + ph1) * 1.2 + Math.sin(u * 13 + ph2) * .5);
    const press = Math.min(1, u * 10) * (1 - Math.pow(u, 6) * .55);      // 起笔顿、收笔轻
    wid.push(w * (.75 + .25 * press) * (.92 + Math.sin(u * 9 + ph2) * .08));
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const u = i / segs, o = wob[i] + wid[i] / 2; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
  for (let i = n; i >= 0; i--) { const u = i / segs, o = wob[i] - wid[i] / 2; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
  ctx.fill();
  ctx.strokeStyle = color; ctx.lineCap = 'round';                        // 飞白丝
  for (let b = 0; b < 5; b++) {
    const off = (r() - .5) * w * 1.3, a0 = .55 + r() * .4;
    ctx.globalAlpha = alpha * (.12 + r() * .12); ctx.lineWidth = .8 + r() * 1.2;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const u = i / segs; if (u > a0 + r() * .4) break; ctx.lineTo(x1 + dx * u + nx * (wob[i] + off), y1 + dy * u + ny * (wob[i] + off)); }
    ctx.stroke();
  }
  ctx.restore();
}

function text(str, x, y, { size = 40, weight = 400, color = INK, alpha = 1, align = 'center', font = SERIF, italic = false, spacing = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`;
  if (spacing) ctx.letterSpacing = spacing + 'px';
  ctx.fillText(str, x, y); ctx.restore();
}
// 一行里混排几段不同颜色的字：parts = [[文字, 颜色], ...]
function richText(parts, x, y, opt = {}) {
  ctx.save(); ctx.font = `${opt.weight || 400} ${opt.size || 40}px ${SERIF}`;
  if (opt.spacing) ctx.letterSpacing = opt.spacing + 'px';
  const total = parts.reduce((s, [p]) => s + ctx.measureText(p).width, 0);
  let cx = x - total / 2;
  for (const [p, c] of parts) { const w = ctx.measureText(p).width; text(p, cx, y, { ...opt, color: c, align: 'left' }); cx += w; }
  ctx.restore();
}
// 字幕：zh 用 | 分行，英文在下
function caption(t, a, b, zh, en) {
  const k = win(t, a, b), rise = (1 - clamp((t - a) / .6)) * 10, lines = zh.split('|');
  lines.forEach((l, i) => text(l, W / 2, 1180 + i * 64 + rise, { size: 46, weight: 700, alpha: k, spacing: 2 }));
  text(en, W / 2, 1180 + lines.length * 64 - 4 + rise, { size: 30, font: EN, italic: true, color: MUTE, alpha: k * .9 });
}

// 红印章：两个字竖排
function seal(chars, x, y, size, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = RED;
  ctx.beginPath(); ctx.roundRect(x - size / 2, y - size / 2, size, size, size * .1); ctx.fill(); ctx.restore();
  text(chars[0], x, y - size * .21, { size: size * .38, weight: 900, color: PAPER, alpha });
  text(chars[1], x, y + size * .21, { size: size * .38, weight: 900, color: PAPER, alpha });
}

// 每帧的底：宣纸 + 漂浮微尘 + 页眉（标题、副标题、AI 声明）
function background(t, title, subtitle) {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(paper, 0, 0);
  const dr = rng(99); t = REAL_T;
  for (let i = 0; i < 40; i++) {
    const x0 = dr() * W, y0 = dr() * H, sp = 6 + dr() * 14, ph = dr() * 6;
    const x = (x0 + Math.sin(t * .3 + ph) * 30) % W, y = ((y0 - t * sp) % H + H) % H;
    ctx.globalAlpha = .08 + .08 * Math.sin(t + ph); ctx.fillStyle = '#6b5a43';
    ctx.beginPath(); ctx.arc(x, y, 1 + dr() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = RED; ctx.fillRect(84, 112, 12, 12);
  ctx.save(); ctx.font = `700 28px ${SERIF}`; ctx.letterSpacing = '6px';
  const tw = ctx.measureText(title).width; ctx.restore();
  text(title, 110, 119, { size: 28, weight: 700, align: 'left', spacing: 6 });
  text(subtitle, 110 + tw + 20, 120, { size: 22, color: MUTE, align: 'left' });
  text('本视频由 AI 用代码生成', 996, 120, { size: 22, color: MUTE, align: 'right' });
}

// 倒数圈：画面停住时出现，n 秒从 n 数到 1
function countdown(e, n, x = W / 2, y = 1062) {
  const a = win(e, 0, n, .3), left = Math.ceil(n - e), frac = e % 1;
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(122,110,96,.25)'; ctx.beginPath(); ctx.arc(x, y, 54, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = RED; ctx.beginPath(); ctx.arc(x, y, 54, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac)); ctx.stroke();
  ctx.restore();
  const pop = 1 + .25 * Math.max(0, 1 - frac * 5);
  ctx.save(); ctx.translate(x, y + 4); ctx.scale(pop, pop);
  text(String(Math.max(1, left)), 0, 0, { size: 64, weight: 900, color: RED, alpha: a }); ctx.restore();
}

// 场景入口：scene(render, plan)
// plan 是一串分段：[起, 止, 速度] 按速度播放画面时间 起→止（速度 < 1 即放慢）；
// ['count', n, x?, y?] 画面停在当前这一刻，在 (x, y) 叠一个 n 秒的倒数（默认画面中下方）。片长由 plan 自动算出。
let REAL_T = 0;                                                      // 真实时间：微尘等环境动画用它，停顿时也在动
function scene(render, plan) {
  const segs = []; let real = 0, last = 0;
  for (const p of plan) {
    if (p[0] === 'count') { segs.push({ r0: real, r1: real + p[1], s0: last, s1: last, count: p[1], at: p.slice(2) }); real += p[1]; continue; }
    const [a, b, sp = 1] = p, d = (b - a) / sp;
    segs.push({ r0: real, r1: real + d, s0: a, s1: b }); real += d; last = b;
  }
  window.DURATION = real;
  // 场景时间 → 真实时间（音效、压低配乐都按场景时间写，渲染器要真实时间）
  const toReal = st => { const sg = segs.find(g => !g.count && st >= g.s0 && st <= g.s1); return sg ? sg.r0 + (st - sg.s0) / (sg.s1 - sg.s0) * (sg.r1 - sg.r0) : st; };
  window.SFX = (window.SFX_SCENE || []).map(([t, type, g]) => [toReal(t), type, g]);
  window.DUCK = (window.DUCK_SCENE || []).map(([a, b, v]) => [toReal(a), toReal(b), v]);
  segs.filter(g => g.count).forEach(g => { for (let k = 0; k < g.count; k++) window.SFX.push([g.r0 + k, 'tick', .5]); });
  window.render = rt => {
    REAL_T = rt;
    const sg = segs.find(s => rt < s.r1) || segs[segs.length - 1];
    render(sg.count ? sg.s0 : lerp(sg.s0, sg.s1, clamp((rt - sg.r0) / (sg.r1 - sg.r0))));
    if (sg.count) countdown(rt - sg.r0, sg.count, ...sg.at);
  };
  window.ready = (async () => {
    const faces = [
      ['Noto Serif SC', 'NotoSerifSC-400.ttf', { weight: '400' }],
      ['Noto Serif SC', 'NotoSerifSC-700.ttf', { weight: '700' }],
      ['Noto Serif SC', 'NotoSerifSC-900.ttf', { weight: '900' }],
      ['EB Garamond', 'EBGaramond-Italic.ttf', { style: 'italic' }],
    ];
    for (const [name, file, desc] of faces) document.fonts.add(await new FontFace(name, `url(${KIT}fonts/${file})`, desc).load());
    window.render(0);
    return true;
  })();
}
