// 通用渲染器 —— 运行（<目录> 里要有 scene.html）：
//   node vibe-kit/render.js <目录>                出全片 <目录>/output/video.mp4（1080×1920，30fps），用满所有 CPU 核
//   node vibe-kit/render.js <目录> --workers 2    指定并行路数
//   node vibe-kit/render.js <目录> --music <文件> 换配乐；默认用 vibe-kit/music/vibe.wav，--music none 出静音版
//   node vibe-kit/render.js <目录> --stills 3,20  只截几张静帧到 <目录>/output/still_<秒>.png
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FPS = 30;
const DIR = path.resolve(process.argv[2] || '.');
const OUT = path.join(DIR, 'output');
fs.mkdirSync(OUT, { recursive: true });
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

async function openScene() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(DIR, 'scene.html'));
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

  // 拼接各段，配上配乐（或静音音轨）
  const list = path.join(OUT, 'segments.txt');
  fs.writeFileSync(list, segs.map(([, , f]) => `file '${f}'`).join('\n'));
  const dur = frames / FPS;
  let music = arg('--music') || path.join(__dirname, 'music', 'vibe.wav');
  if (music === 'none' || !fs.existsSync(music)) music = null;
  let audioIn = ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'], audioFx = ['-map', '1:a'];
  if (music) {
    // 曲子比片子短时，把结尾那段轻的部分再接一遍（交叉淡化 1.5 秒），最后 2.5 秒淡出
    const len = Number(require('child_process').execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', music]));
    const fade = `afade=t=out:st=${dur - 2.5}:d=2.5`;
    audioIn = ['-i', music];
    audioFx = dur <= len - 1
      ? ['-filter_complex', `[1:a]atrim=0:${dur},${fade}[a]`, '-map', '[a]']
      : ['-filter_complex', `[1:a]atrim=0:${len - 2.7},asetpts=N/SR/TB[x];[1:a]atrim=${len - 8.7}:${len},asetpts=N/SR/TB[y];[x][y]acrossfade=d=1.5,apad,atrim=0:${dur},${fade}[a]`, '-map', '[a]'];
  }
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, ...audioIn, '-map', '0:v', ...audioFx,
    '-t', String(dur), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', path.join(OUT, 'video.mp4'),
  ], { stdio: 'inherit' }).done;
  for (const [, , f] of segs) fs.unlinkSync(f);
  fs.unlinkSync(list);
  console.log('done:', path.join(OUT, 'video.mp4'));
})();
