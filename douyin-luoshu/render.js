// 渲染《一个方格》—— 运行：
//   node render.js                 出全片 output/luoshu.mp4（1080×1920，30fps），默认用满所有 CPU 核并行
//   node render.js --workers 2     指定并行路数
//   node render.js --stills 3,20   只截几张静帧到 output/still_<秒>.png，用来检查画面
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FPS = 30;
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

async function openScene() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => window.ready);
  return { browser, page, canvas: await page.$('canvas') };
}

function run(cmd, args, opts) {
  const p = spawn(cmd, args, opts);
  p.done = new Promise((ok, fail) => p.on('close', code => code ? fail(new Error(`${cmd} exited ${code}`)) : ok()));
  return p;
}

// 渲染 [from, to) 这些帧，编码成一段无声视频
async function renderSegment(from, to, file, onFrame) {
  const { browser, page, canvas } = await openScene();
  const ff = run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await canvas.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    onFrame();
  }
  ff.stdin.end();
  await ff.done;
  await browser.close();
}

(async () => {
  const stills = arg('--stills');
  if (stills) {
    const { browser, page, canvas } = await openScene();
    for (const s of stills.split(',').map(Number)) {
      await page.evaluate(t => window.render(t), s);
      await canvas.screenshot({ path: path.join(OUT, `still_${s}.png`) });
    }
    await browser.close();
    return;
  }

  const { browser, page } = await openScene();
  const frames = Math.round(await page.evaluate(() => window.DURATION) * FPS);
  await browser.close();

  const workers = Number(arg('--workers')) || os.cpus().length;
  const per = Math.ceil(frames / workers), started = Date.now();
  let done = 0;
  const tick = () => {
    if (++done % 60 && done !== frames) return;
    const sec = (Date.now() - started) / 1000, left = sec / done * (frames - done);
    console.log(`${done}/${frames} 帧，已用 ${Math.round(sec)} 秒，预计还要 ${Math.round(left)} 秒`);
  };
  const segs = [];
  for (let w = 0; w < workers && w * per < frames; w++) segs.push([w * per, Math.min(frames, (w + 1) * per), path.join(OUT, `seg_${w}.mp4`)]);
  console.log(`${frames} 帧，${segs.length} 路并行`);
  await Promise.all(segs.map(([a, b, file]) => renderSegment(a, b, file, tick)));

  // 拼接各段，并配上一条静音音轨（抖音里再选配乐）
  const list = path.join(OUT, 'segments.txt');
  fs.writeFileSync(list, segs.map(([, , f]) => `file '${f}'`).join('\n'));
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', path.join(OUT, 'luoshu.mp4'),
  ], { stdio: 'inherit' }).done;
  for (const [, , f] of segs) fs.unlinkSync(f);
  fs.unlinkSync(list);
  console.log('done:', path.join(OUT, 'luoshu.mp4'));
})();
