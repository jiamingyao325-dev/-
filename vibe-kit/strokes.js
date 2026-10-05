// 生成逐笔书写用的笔画数据（来自 hanzi-writer-data，Arphic 字形）：
//   node vibe-kit/strokes.js <目录> <字串>     写出 <目录>/strokes.js，scene.html 在 ink.js 之后引入它
// 每个字：strokes 是笔画轮廓（SVG 路径，1024 见方、y 轴朝上），medians 是每笔的行笔中线。
const fs = require('fs');
const path = require('path');
const [dir, chars] = process.argv.slice(2);
const out = {};
for (const ch of new Set(chars.replace(/\s/g, ''))) {
  const { strokes, medians } = require(`hanzi-writer-data/${ch}.json`);
  out[ch] = { strokes, medians };
}
fs.writeFileSync(path.join(dir, 'strokes.js'),
  `// 由 vibe-kit/strokes.js 生成，勿手改。字形数据：hanzi-writer-data（Arphic Public License）\nconst STROKES = ${JSON.stringify(out)};\n`);
console.log(`写出 ${Object.keys(out).length} 个字：${Object.keys(out).join('')}`);
