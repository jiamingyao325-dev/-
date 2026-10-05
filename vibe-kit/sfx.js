// 音效：读 scene.html 里登记的音效时间表（dark.js 的 sfx() 与倒数），合成一条音效轨，混进成片。
//   node vibe-kit/sfx.js <目录>     先跑完 render.js；写出 output/sfx.wav，并用它替换 output/video.mp4 的音轨
// 类型：brush 落笔行笔（dur 秒）、clack 竹简相碰、drop 朱字落下、bell 编钟（f 基频）、stamp 盖印、tick 倒数。
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SR = 44100;
const DIR = path.resolve(process.argv[2] || '.');
const OUT = path.join(DIR, 'output');

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const r = rng(11), noise = () => r() * 2 - 1;

// 二阶滤波（RBJ）
function biquad(type, f, q) {
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; }                                  // bp
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

// 每种声音：返回单声道样本
const voices = {
  brush({ dur = .3 }) {                                              // 笔尖触纸的一点闷响 + 行笔沙沙声
    const n = Math.round((dur + .12) * SR), out = new Float32Array(n);
    const bp = biquad('bp', 2600 + r() * 900, .6), lp = biquad('lp', 5200, .7), tap = biquad('lp', 700, .8);
    for (let i = 0; i < n; i++) {
      const t = i / SR, env = Math.min(1, t / .025) * Math.max(0, 1 - Math.max(0, t - dur) / .12) * (.75 + .25 * Math.sin(t * 23));
      out[i] = lp(bp(noise())) * env * .55 + tap(noise()) * Math.exp(-t / .018) * 1.4;
    }
    return out;
  },
  clack() {                                                          // 木片相碰：几个快速衰减的共振
    const n = Math.round(.25 * SR), out = new Float32Array(n), f = 820 + r() * 260;
    const modes = [[f, .06, 1], [f * 2.31, .035, .55], [f * 3.9, .02, .3], [f * .52, .09, .35]];
    const hp = biquad('hp', 1500, .7);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = hp(noise()) * Math.exp(-t / .004) * .8;
      for (const [mf, d, a] of modes) v += Math.sin(2 * Math.PI * mf * t) * Math.exp(-t / d) * a;
      out[i] = v * .5;
    }
    return out;
  },
  drop() {                                                           // 朱字落下：轻一点、低一点的木声
    const n = Math.round(.3 * SR), out = new Float32Array(n), f = 300 + r() * 60, lp = biquad('lp', 900, .7);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / .07) + Math.sin(2 * Math.PI * f * 2.7 * t) * Math.exp(-t / .03) * .4 + lp(noise()) * Math.exp(-t / .01)) * .45;
    }
    return out;
  },
  bell({ f = 196 }) {                                                // 编钟：一钟双音，高泛音很快消失，基音长鸣
    const n = Math.round(6 * SR), out = new Float32Array(n);
    const parts = [[.5, 4.5, .18], [1, 3.4, 1], [1.004, 3.4, .5], [1.19, 2.4, .45], [2.76, .9, .32], [3.2, .6, .18], [5.4, .3, .14], [8.93, .12, .1]];
    const hp = biquad('hp', 2000, .7);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = hp(noise()) * Math.exp(-t / .006) * .4;
      for (const [k, d, a] of parts) v += Math.sin(2 * Math.PI * f * k * t) * Math.exp(-t / d) * a;
      out[i] = v * Math.min(1, t / .002) * .38;
    }
    return out;
  },
  stamp() {                                                          // 印章压在纸上：低沉一记
    const n = Math.round(.5 * SR), out = new Float32Array(n), lp = biquad('lp', 500, .7);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = 45 + 50 * Math.exp(-t / .03);
      ph += 2 * Math.PI * f / SR;
      out[i] = (Math.sin(ph) * Math.exp(-t / .09) * 1.1 + lp(noise()) * Math.exp(-t / .04) * 1.2) * .7;
    }
    return out;
  },
  tick() {                                                           // 倒数：很轻的木鱼声
    const n = Math.round(.2 * SR), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * 1250 * t) * Math.exp(-t / .025) + Math.sin(2 * Math.PI * 610 * t) * Math.exp(-t / .04) * .6) * .28; }
    return out;
  },
};
const LEVEL = { brush: .55, clack: .8, drop: .7, bell: 1, stamp: 1, tick: .8 };

// 简单混响（Schroeder：4 个梳状 + 2 个全通），左右声道用不同长度
function reverb(x, offs) {
  const n = x.length, y = new Float32Array(n);
  for (const L of [1557, 1617, 1491, 1422].map(v => v + offs)) {
    const buf = new Float32Array(L); let j = 0, lp = 0;
    for (let i = 0; i < n; i++) { const o = buf[j]; lp = o * .6 + lp * .4; buf[j] = x[i] + lp * .8; y[i] += o * .25; j = (j + 1) % L; }
  }
  for (const L of [225 + offs, 556 + offs]) {
    const buf = new Float32Array(L); let j = 0;
    for (let i = 0; i < n; i++) { const b = buf[j], v = y[i]; buf[j] = v + b * .5; y[i] = b - v * .5; j = (j + 1) % L; }
  }
  return y;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(DIR, 'scene.html'));
  await page.evaluate(() => window.ready);
  const cues = await page.evaluate(() => window.cues());
  const dur = await page.evaluate(() => window.DURATION);
  await browser.close();

  const n = Math.round(dur * SR), Lc = new Float32Array(n), Rc = new Float32Array(n);
  for (const c of cues) {
    const v = voices[c.type](c), g = (c.gain ?? 1) * LEVEL[c.type], pan = Math.max(-.6, Math.min(.6, c.pan || 0));
    const at = Math.round(c.t * SR), gl = g * Math.sqrt(.5 - pan / 2), gr = g * Math.sqrt(.5 + pan / 2);
    for (let i = 0; i < v.length && at + i < n; i++) { Lc[at + i] += v[i] * gl; Rc[at + i] += v[i] * gr; }
  }
  const wl = reverb(Lc, 0), wr = reverb(Rc, 23);
  let peak = 0;
  for (let i = 0; i < n; i++) { Lc[i] += wl[i] * .22; Rc[i] += wr[i] * .22; peak = Math.max(peak, Math.abs(Lc[i]), Math.abs(Rc[i])); }
  const norm = .7 / peak;                                            // 峰值约 -3 dB
  const fade = Math.round(1.5 * SR);
  const wav = Buffer.alloc(44 + n * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 4, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, (n - i) / fade);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Lc[i] * norm * f)) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Rc[i] * norm * f)) * 32767), 46 + i * 4);
  }
  const wavFile = path.join(OUT, 'sfx.wav');
  fs.writeFileSync(wavFile, wav);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'video_静音.mp4'), '-i', wavFile,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(OUT, 'video.mp4')]);
  const count = cues.reduce((m, c) => (m[c.type] = (m[c.type] || 0) + 1, m), {});
  console.log('音效', JSON.stringify(count), '→', path.join(OUT, 'video.mp4'));
})();
