// 生成抖音竖版视频（1080x1920, 30fps）——运行：python3 audio.py && node build.js
// node build.js --preview 只导出每段的一张截图到 build/preview/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FPS = 30;
const preview = process.argv.includes('--preview');
const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8')).scenes;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'render.html'));
  await page.evaluate(() => Promise.all([document.fonts.load("900 40px 'Noto Sans SC'", '曲风说唱'), document.fonts.load("500 40px 'Noto Sans SC'", '曲风说唱')]));
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(s => window.setTimeline(s), scenes);
  const save = async (t, file) => {
    const url = await page.evaluate(tt => window.frame(tt), t);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  };

  if (preview) {
    const dir = path.join(__dirname, 'build/preview'); fs.mkdirSync(dir, { recursive: true });
    let st = 0;
    for (const s of scenes) {
      const d = s.beats * 60 / s.bpm;
      await save(st + d * 0.62, path.join(dir, `${s.id}.jpg`));
      st += d;
    }
    await browser.close(); console.log('preview ok'); return;
  }

  const dir = path.join(__dirname, 'build/frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await save(i / FPS, path.join(dir, `${String(i).padStart(5, '0')}.jpg`));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  await browser.close();
  fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'),
    '-i', path.join(__dirname, 'build/audio.wav'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(__dirname, 'output/球风是一种曲风_EP1.mp4')], { stdio: 'inherit' });
  console.log('done: output/球风是一种曲风_EP1.mp4');
})();
