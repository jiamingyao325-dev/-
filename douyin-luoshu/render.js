// 渲染《一个方格》—— 运行：
//   node render.js                 出全片 output/luoshu.mp4（1080×1920，30fps）
//   node render.js --stills 3,20   只截几张静帧到 output/still_<秒>.png，用来检查画面
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30;
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => window.ready);
  const canvas = await page.$('canvas');

  const stillsArg = process.argv.indexOf('--stills');
  if (stillsArg > 0) {
    for (const s of process.argv[stillsArg + 1].split(',').map(Number)) {
      await page.evaluate(t => window.render(t), s);
      await canvas.screenshot({ path: path.join(OUT, `still_${s}.png`) });
    }
    await browser.close();
    return;
  }

  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-movflags', '+faststart', path.join(OUT, 'luoshu.mp4'),
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < frames; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await canvas.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done:', path.join(OUT, 'luoshu.mp4'));
})();
