// 合成音效：按事件表生成一条单声道 44.1kHz 的 wav。事件 [秒, 类型, 音量]
// 类型：bell 磬声（标题、揭晓）、ding 清脆一声、tick 倒数滴答、chime 低沉长钟、wind 风声
const fs = require('fs');
const SR = 44100;

function synth(type, out, start, gain) {
  const add = (i, v) => { if (i >= 0 && i < out.length) out[i] += v * gain; };
  const s0 = Math.round(start * SR);
  const partials = (f0, ratios, amps, decay, len) => {
    for (let n = 0; n < len * SR; n++) {
      const t = n / SR, att = Math.min(1, t / .004); let v = 0;
      ratios.forEach((r, k) => { v += amps[k] * Math.sin(2 * Math.PI * f0 * r * t) * Math.exp(-t * decay * (1 + k * .6)); });
      add(s0 + n, v * att);
    }
  };
  if (type === 'bell') partials(660, [1, 2.32, 4.25, 6.63], [.5, .3, .15, .08], 2.2, 3.5);
  else if (type === 'ding') partials(1568, [1, 2.76, 5.4], [.45, .2, .08], 6, 1.5);
  else if (type === 'chime') partials(262, [1, 2, 2.98, 4.1], [.55, .25, .15, .06], 1.1, 6);
  else if (type === 'tick') partials(2000, [1, 2.4], [.35, .1], 60, .12);
  else if (type === 'wind') {
    let lp = 0, s = 12345;
    for (let n = 0; n < 4 * SR; n++) {
      s = (s * 1664525 + 1013904223) >>> 0; const w = s / 4294967296 * 2 - 1;
      lp += (w - lp) * .02; const env = Math.sin(Math.PI * n / (4 * SR));
      add(s0 + n, lp * 3 * env);
    }
  }
}

// 生成音效轨，返回文件路径；没有事件就返回 null
function renderSfx(events, dur, file) {
  if (!events || !events.length) return null;
  const out = new Float32Array(Math.ceil(dur * SR));
  for (const [t, type, gain = 1] of events) synth(type, out, t, gain);
  const buf = Buffer.alloc(44 + out.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + out.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(out.length * 2, 40);
  for (let i = 0; i < out.length; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Math.tanh(out[i]) * 30000))), 44 + i * 2);
  fs.writeFileSync(file, buf);
  return file;
}
module.exports = { renderSfx };
