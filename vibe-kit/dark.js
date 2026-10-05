// 暗场纪录片风（「你只背过前半句」系列）：在 ink.js 之后、strokes.js 之后引入。
// 提供：暗场背景 + 顶光、浅色字幕、挂轴宣纸、毛笔逐笔书写、竹简展开、朱笔圈点、盖印，以及音效时间表（vibe-kit/sfx.js 读取）。
const BG = '#0d0b09', LIGHT = '#eee5d2', DIM = '#968a78', CINNABAR = '#c4392d';
const SLIP_INK = '#22170e';

// ---------- 音效时间表 ----------
// sfx(场景秒, 类型, 参数)：在顶层登记（不要在 render 里登记）。类型见 vibe-kit/sfx.js
const SFX = [];
const sfx = (t, type, opt = {}) => SFX.push([t, type, opt]);
let PLAN = [];
const _inkScene = scene;
scene = (render, plan) => { PLAN = plan; _inkScene(render, plan); };
// 场景时间 → 成片时间（考虑放慢与停住倒数）
function realOf(st) {
  let real = 0;
  for (const p of PLAN) {
    if (p[0] === 'count') { real += p[1]; continue; }
    const [a, b, sp = 1] = p;
    if (st >= a && st < b) return real + (st - a) / sp;
    real += (b - a) / sp;
  }
  return real;
}
window.cues = () => {
  const out = SFX.map(([t, type, opt]) => ({ t: realOf(t), type, ...opt, ...(opt.dur ? { dur: realOf(t + opt.dur) - realOf(t) } : {}) }));
  let real = 0;
  for (const p of PLAN) {
    if (p[0] === 'count') { for (let i = 0; i < p[1]; i++) out.push({ t: real + i, type: 'tick' }); real += p[1]; continue; }
    real += (p[1] - p[0]) / (p[2] || 1);
  }
  return out.sort((a, b) => a.t - b.t);
};

// ---------- 暗场背景 ----------
const grain = document.createElement('canvas'); grain.width = 540; grain.height = 960;
(function makeGrain() {
  const g = grain.getContext('2d'), img = g.createImageData(540, 960), r = rng(3);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
})();
const LIGHT_AT = { x: 540, y: 640 };
function background(t, title, subtitle) {
  ctx.save();
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const s = ctx.createRadialGradient(LIGHT_AT.x, LIGHT_AT.y - 80, 20, LIGHT_AT.x, LIGHT_AT.y, 860);  // 顶光
  s.addColorStop(0, 'rgba(255,214,160,.16)'); s.addColorStop(.45, 'rgba(255,200,140,.06)'); s.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
  const f = Math.floor(REAL_T * 30), gr = rng(f + 1);                // 胶片颗粒，每帧换位
  ctx.globalAlpha = .045; ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(grain, -gr() * 200, -gr() * 300, W + 400, H + 600);
  ctx.globalCompositeOperation = 'source-over';
  const dr = rng(99);                                                // 光里的浮尘
  for (let i = 0; i < 46; i++) {
    const x0 = dr() * W, y0 = dr() * H, sp = 5 + dr() * 10, ph = dr() * 6, rad = .8 + dr() * 1.8;
    const x = (x0 + Math.sin(REAL_T * .25 + ph) * 34) % W, y = ((y0 - REAL_T * sp) % H + H) % H;
    const lit = clamp(1 - Math.hypot(x - LIGHT_AT.x, (y - LIGHT_AT.y) * .8) / 700);
    ctx.globalAlpha = lit * (.18 + .14 * Math.sin(REAL_T * 1.3 + ph));
    ctx.fillStyle = '#f3dcb4'; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = CINNABAR; ctx.fillRect(84, 112, 12, 12);
  ctx.save(); ctx.font = `700 28px ${SERIF}`; ctx.letterSpacing = '6px';
  const tw = ctx.measureText(title).width; ctx.restore();
  text(title, 110, 119, { size: 28, weight: 700, align: 'left', spacing: 6, color: LIGHT });
  text(subtitle, 110 + tw + 20, 120, { size: 22, color: DIM, align: 'left' });
  text('本视频由 AI 用代码生成', 996, 120, { size: 22, color: DIM, align: 'right' });
}

// 浅色字幕（替换 ink.js 的版本）
function caption(t, a, b, zh, en) {
  const k = win(t, a, b), rise = (1 - clamp((t - a) / .6)) * 10, lines = zh.split('|');
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 12;
  lines.forEach((l, i) => text(l, W / 2, 1180 + i * 64 + rise, { size: 46, weight: 700, alpha: k, spacing: 2, color: LIGHT }));
  text(en, W / 2, 1180 + lines.length * 64 - 4 + rise, { size: 30, font: EN, italic: true, color: DIM, alpha: k * .9 });
  ctx.restore();
}

// ---------- 挂轴：一条宣纸，上下两根木轴 ----------
function scroll(cx, cy, w, h, a) {
  if (a <= 0) return;
  const x = cx - w / 2, y = cy - h / 2, r = rng(hash('scroll' + w + h));
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#d9cfba'; ctx.fillRect(x, y, w, h);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(paper, 300, 400, w, h, x, y, w, h);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);                // 纸面受光：中间亮，两边略暗
  g.addColorStop(0, 'rgba(60,40,20,.20)'); g.addColorStop(.5, 'rgba(255,240,210,.05)'); g.addColorStop(1, 'rgba(60,40,20,.24)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const v = ctx.createLinearGradient(0, y, 0, y + h);
  v.addColorStop(0, 'rgba(40,25,10,.18)'); v.addColorStop(.3, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,25,10,.26)');
  ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(120,96,60,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);  // 隔水细边
  for (const [ry, rh] of [[y - 16, 22], [y + h - 6, 26]]) {           // 木轴
    const rg = ctx.createLinearGradient(0, ry, 0, ry + rh);
    rg.addColorStop(0, '#2a1a10'); rg.addColorStop(.35, '#6b4527'); rg.addColorStop(.6, '#3d2614'); rg.addColorStop(1, '#170d07');
    ctx.fillStyle = rg; ctx.fillRect(x - 26, ry, w + 52, rh);
    for (const ex of [x - 40, x + w + 26]) {
      const eg = ctx.createLinearGradient(0, ry - 3, 0, ry + rh + 3);
      eg.addColorStop(0, '#1a110a'); eg.addColorStop(.4, '#8a6a46'); eg.addColorStop(1, '#120a05');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.roundRect(ex, ry - 3, 14, rh + 6, 4); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- 毛笔逐笔书写 ----------
// writing(字串, {x, y, size, t0, ...}) 在顶层创建：排好每一笔的起止时间，并登记落笔音效。
// 字的中心：竖排时第 i 个字在 (x, y + i·size·gap)，横排时在 (x + i·size·gap, y)。
const _p2d = {};
const strokePath = (ch, i) => _p2d[ch + i] || (_p2d[ch + i] = new Path2D(STROKES[ch].strokes[i]));
function medianLen(m) { let L = 0; for (let i = 1; i < m.length; i++) L += Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]); return L; }
function writing(str, { x, y, size, t0, vertical = true, gap = 1.1, speed = 1, pause = .1, charPause = .32, sound = true, gain = 1 }) {
  const chars = [...str], plan = [];
  let t = t0;
  chars.forEach((ch, ci) => {
    const cx = vertical ? x : x + ci * size * gap, cy = vertical ? y + ci * size * gap : y;
    STROKES[ch].medians.forEach((m, si) => {
      const L = medianLen(m), d = (.12 + L / 1024 * .42) / speed;
      plan.push({ ch, ci, si, cx, cy, m, L, a: t, b: t + d });
      if (sound) sfx(t, 'brush', { dur: d, gain, pan: (cx - W / 2) / W });
      t += d + pause / speed;
    });
    t += charPause / speed;
  });
  return {
    t0, end: t, size, chars, plan,
    centers: chars.map((_, ci) => vertical ? [x, y + ci * size * gap] : [x + ci * size * gap, y]),
    // draw(t, 透明度, {color, from, upto})：只画第 from..upto-1 个字（默认全部）
    draw(t, alpha = 1, { color = INK, from = 0, upto = chars.length, done = false } = {}) {
      if (alpha <= 0) return;
      const s = size / 1024;
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.strokeStyle = color;
      for (const p of plan) {
        if (p.ci < from || p.ci >= upto) continue;
        const k = done ? 1 : clamp((t - p.a) / (p.b - p.a));
        if (k <= 0) continue;
        ctx.save();
        ctx.translate(p.cx - size / 2, p.cy - size / 2); ctx.scale(s, -s); ctx.translate(0, -900);
        const path = strokePath(p.ch, p.si);
        if (k >= 1) ctx.fill(path);
        else {
          ctx.clip(path); ctx.lineWidth = 190; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(p.m[0][0], p.m[0][1]);
          let left = k * p.L;
          for (let i = 1; i < p.m.length && left > 0; i++) {
            const [x0, y0] = p.m[i - 1], [x1, y1] = p.m[i], l = Math.hypot(x1 - x0, y1 - y0);
            const u = Math.min(1, left / l); ctx.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); left -= l;
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    },
  };
}

// ---------- 朱笔：一个手绘圈、一个点 ----------
function ribbon(id, pts, k, w, color, alpha) {
  if (k <= 0 || alpha <= 0) return;
  const r = rng(hash(id)), n = Math.max(2, Math.floor(pts.length * clamp(k))), L = [], R = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, u = i / (pts.length - 1);
    const ww = w * (.35 + .65 * Math.sin(Math.PI * Math.min(1, u * 1.15))) * (.9 + r() * .2) / 2;
    L.push([pts[i][0] - dy / len * ww, pts[i][1] + dx / len * ww]); R.push([pts[i][0] + dy / len * ww, pts[i][1] - dx / len * ww]);
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
  L.forEach(([x, y]) => ctx.lineTo(x, y)); R.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.fill(); ctx.restore();
}
function ring(id, cx, cy, rx, ry, k, w = 7, color = CINNABAR, alpha = 1) {
  const r = rng(hash(id)), a0 = -2.2 + r() * .4, pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = a0 + i / 80 * Math.PI * 2.12, wob = 1 + Math.sin(a * 3 + r()) * .03 + i / 80 * .06;
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  ribbon(id, pts, k, w, color, alpha);
}

// ---------- 竹简 ----------
// bamboo(id, 列, {cx, cy, h, w, size}) —— 列从右往左排，每列一根简；'' 为空简。
// draw(t, 透明度, 已展开根数 u) —— u 从 0 到 n，展开处有一卷未展开的简。
function bamboo(id, cols, { cx, cy, h = 640, w = 64, gap = 5, size = 44, pitch = 1.22 }) {
  const n = cols.length, span = n * w + (n - 1) * gap, right = cx + span / 2;
  const sx = i => right - w / 2 - i * (w + gap);                     // 第 i 根简的中心 x（0 = 最右）
  const r = rng(hash(id));
  const look = cols.map(() => ({ hue: r() * 14 - 7, dy: (r() - .5) * 8, grain: Array.from({ length: 6 }, () => [r(), .05 + r() * .12]), node: .15 + r() * .7 }));
  const top = cy - h / 2;
  const glyphs = cols.map((c, i) => c ? writing(c, { x: sx(i), y: top + 70 + size / 2, size, t0: -99, gap: pitch, sound: false }) : null);
  function slip(i, scaleX, alpha) {
    const L = look[i], x = sx(i), y = top + L.dy;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2, 0); ctx.scale(scaleX, 1); ctx.translate(-x - w / 2, 0);
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    const c = (l) => `hsl(${36 + L.hue * .4}, ${42 + L.hue}%, ${l}%)`;
    g.addColorStop(0, c(26)); g.addColorStop(.18, c(52)); g.addColorStop(.5, c(62)); g.addColorStop(.85, c(50)); g.addColorStop(1, c(24));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,12,.25)'; ctx.lineWidth = 1;
    for (const [gx, ga] of L.grain) { ctx.globalAlpha = alpha * ga * 2; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6 + gx * (w - 12), y + 6); ctx.lineTo(x - w / 2 + 6 + gx * (w - 12) + 2, y + h - 6); ctx.stroke(); }
    ctx.globalAlpha = alpha * .35; ctx.fillStyle = '#5a3c1c'; ctx.fillRect(x - w / 2, y + h * L.node, w, 3);   // 竹节
    ctx.globalAlpha = alpha * .25; ctx.fillStyle = '#fff3d6'; ctx.fillRect(x - w / 2 + w * .3, y + 4, 3, h - 8);  // 高光
    ctx.restore();
  }
  function cords(xl, xr, alpha) {
    for (const cyy of [top + 34, top + h - 34]) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(xl, cyy); ctx.lineTo(xr, cyy); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,120,70,.45)'; ctx.lineWidth = 1.5;
      for (let x = xl; x < xr; x += 9) { ctx.beginPath(); ctx.moveTo(x, cyy - 3); ctx.lineTo(x + 5, cyy + 3); ctx.stroke(); }
      ctx.restore();
    }
  }
  function roll(xr, m, alpha) {                                       // 一卷还没展开的简
    if (m <= 0) return;
    const rw = Math.min(150, 26 + m * 9), x = xr - rw;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetX = -6;
    const g = ctx.createLinearGradient(x, 0, xr, 0);
    g.addColorStop(0, '#3c2812'); g.addColorStop(.35, '#a7834c'); g.addColorStop(.6, '#c29d62'); g.addColorStop(1, '#4a3016');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, top - 6, rw, h + 12, rw * .3); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(50,30,10,.45)'; ctx.lineWidth = 1.2;
    const k = Math.ceil(Math.min(m, 14));
    for (let j = 1; j < k; j++) { const u = j / k, xx = x + rw * (.5 - Math.cos(u * Math.PI) / 2); ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, top + h); ctx.stroke(); }
    ctx.restore();
    cords(x + 4, xr, alpha);
  }
  return {
    n, sx, top, h, w, glyphs,
    glyphAt: (i, j) => [sx(i), top + 70 + size / 2 + j * size * pitch],
    // opt.ink(i) 返回第 i 根简上字的 {alpha, color}；opt.skip 里的列不画字（另行逐笔书写）
    draw(t, alpha, u, opt = {}) {
      if (alpha <= 0) return;
      const full = Math.floor(u), f = u - full;
      ctx.save(); ctx.globalAlpha = alpha * .65; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
      if (u > 0) { ctx.fillStyle = '#000'; const xl = sx(Math.min(n - 1, full)) - w / 2 * (full < n ? (f > 0 ? 1 : -1) : 1); ctx.fillRect(Math.min(xl, right - 1), top + 10, right - Math.min(xl, right - 1), h - 20); }
      ctx.restore();
      for (let i = 0; i < Math.min(n, Math.ceil(u)); i++) {
        const sc = i < full ? 1 : f;
        slip(i, sc, alpha * (i < full ? 1 : clamp(f * 3)));
        if (glyphs[i] && !(opt.skip || []).includes(i)) {
          const ink = opt.ink ? opt.ink(i) : {};
          glyphs[i].draw(t, alpha * (ink.alpha ?? .92) * (i < full ? 1 : clamp(f * 2 - 1)), { color: ink.color || SLIP_INK, done: true });
        }
      }
      const edge = u <= 0 ? right : (full >= n ? sx(n - 1) - w / 2 : sx(full) + w / 2 - w * f - gap);
      if (u > 0) cords(edge, right, alpha);
      roll(edge, n - u, alpha);
    },
    // 登记展开音效：从 t0 到 t1，从 u0 根展开到 u1 根（线性）
    unroll(t0, t1, u0, u1) {
      for (let i = Math.floor(u0) + 1; i <= Math.floor(u1); i++) sfx(t0 + (i - u0) / (u1 - u0) * (t1 - t0), 'clack', { pan: (sx(i - 1) - W / 2) / W });
      return t => lerp(u0, u1, clamp((t - t0) / (t1 - t0)));
    },
  };
}

// ---------- 盖印：落下、压实、带一点斑驳 ----------
function stamp(chars, x, y, size, k) {
  if (k <= 0) return;
  const sc = 1 + .25 * (1 - ease(clamp(k * 1.4)));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  seal(chars, x, y, size, clamp(k * 2.2));
  const r = rng(hash('stamp' + chars));
  ctx.globalAlpha = clamp(k * 2.2) * .5; ctx.fillStyle = '#e7dcc6';
  for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(x + (r() - .5) * size * .96, y + (r() - .5) * size * .96, .5 + r() * 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
