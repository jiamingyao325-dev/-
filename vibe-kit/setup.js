// 本地一键配置：node vibe-kit/setup.js
// 做三件事：下载字体到 vibe-kit/fonts/、安装 playwright 和 three 及浏览器、检查 ffmpeg 和配乐。
// Mac / Windows / Linux 通用，只要求先装好 Node.js 18+ 和 ffmpeg。
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const KIT = __dirname;
const FONTS = {
  'NotoSerifSC-400.ttf': 'https://fonts.gstatic.com/s/notoserifsc/v36/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7SCqyWv.ttf',
  'NotoSerifSC-700.ttf': 'https://fonts.gstatic.com/s/notoserifsc/v36/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7RlrCWv.ttf',
  'NotoSerifSC-900.ttf': 'https://fonts.gstatic.com/s/notoserifsc/v36/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7QrrCWv.ttf',
  'NotoSansSC-700.ttf': 'https://fonts.gstatic.com/s/notosanssc/v41/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCnYw.ttf',
  'EBGaramond-Italic.ttf': 'https://fonts.gstatic.com/s/ebgaramond/v33/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7e8QI96.ttf',
};

(async () => {
  // 1. 字体
  fs.mkdirSync(path.join(KIT, 'fonts'), { recursive: true });
  for (const [name, url] of Object.entries(FONTS)) {
    const file = path.join(KIT, 'fonts', name);
    if (fs.existsSync(file) && fs.statSync(file).size > 100000) { console.log('字体已有：', name); continue; }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`字体下载失败 ${name}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log('字体下载完成：', name);
  }

  // 2. 依赖和浏览器
  console.log('安装 playwright 和 three ……');
  execSync('npm install --no-audit --no-fund playwright@1.56.1 three@0.170.0', { cwd: KIT, stdio: 'inherit' });
  console.log('安装渲染用的 Chromium ……');
  execSync('npx playwright install chromium', { cwd: KIT, stdio: 'inherit' });

  // 3. ffmpeg 和配乐
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); console.log('ffmpeg：已安装'); }
  catch { console.log('ffmpeg：没找到。Mac 用 `brew install ffmpeg`，Windows 用 `winget install ffmpeg`，装好后重新运行本脚本。'); }
  fs.mkdirSync(path.join(KIT, 'music'), { recursive: true });
  const music = path.join(KIT, 'music', 'vibe.wav');
  console.log(fs.existsSync(music) ? '配乐：已就位' :
    '配乐：没有。把参考视频《一根弦》的 mp4 放到电脑上，运行：\n  ffmpeg -i 一根弦.mp4 -vn vibe-kit/music/vibe.wav\n（不放配乐也能渲染，出的是静音版）');

  console.log('\n配置完成。试渲染一条：node vibe-kit/render.js douyin-laoshu');
})().catch(e => { console.error(e.message); process.exit(1); });
