// 生成抖音图文（3:4，1080x1440）——运行：node build.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TOTAL = 8;
const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#F5EFE3;--ink:#16130F;--red:#D42A1F;--hl:#FFD23F;--mute:#6E655A;--card:#FFFFFF;--line:#E2D8C6;--green:#1E8A4C}
html,body{width:1080px;height:1440px;background:var(--bg)}
body{font-family:'Noto Sans SC','WenQuanYi Zen Hei',sans-serif;color:var(--ink);padding:64px 72px 0;position:relative;overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:center;font-size:30px;font-weight:700;color:var(--mute);letter-spacing:2px}
.tag{background:var(--ink);color:#fff;padding:8px 22px;border-radius:999px;font-size:28px}
.pn b{color:var(--red);font-size:44px}
h1{font-size:76px;line-height:1.16;font-weight:900;margin-top:36px;letter-spacing:-1px}
h2{font-size:40px;font-weight:700;color:var(--mute);margin-top:22px;line-height:1.4}
.hl{background:linear-gradient(transparent 58%,var(--hl) 58%);padding:0 4px}
.red{color:var(--red)}
.green{color:var(--green)}
.card{background:var(--card);border-radius:28px;padding:30px 40px;margin-top:24px;box-shadow:0 6px 0 var(--line)}
.lbl{font-size:30px;font-weight:700;color:var(--red);letter-spacing:3px;margin-bottom:14px}
p,li{font-size:36px;line-height:1.5}
.chips{display:flex;flex-wrap:wrap;gap:18px;margin-top:8px}
.chip{background:var(--bg);border:3px solid var(--ink);border-radius:999px;padding:8px 24px;font-size:34px;font-weight:700}
.chip.r{background:var(--red);border-color:var(--red);color:#fff}
.quote{margin-top:24px;background:var(--ink);color:#fff;border-radius:28px;padding:30px 40px;font-size:42px;font-weight:900;line-height:1.45}
.quote .y{color:var(--hl)}
.foot{position:absolute;left:72px;right:72px;bottom:44px;display:flex;justify-content:space-between;font-size:26px;color:var(--mute);border-top:3px solid var(--line);padding-top:22px}
.row{display:flex;gap:28px}
.row>.card{flex:1}
.big{font-size:96px;font-weight:900;line-height:1}
.num{font-weight:900;font-family:'Noto Sans SC',sans-serif}
.small{font-size:30px;color:var(--mute);line-height:1.5}
ol{list-style:none}
`;

const frame = (n, tag, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="top"><span class="tag">${tag}</span><span class="pn"><b>${String(n).padStart(2,'0')}</b> / ${String(TOTAL).padStart(2,'0')}</span></div>
${body}
<div class="foot"><span>中美互降关税 · 普通人的生意账</span><span>${n < TOTAL ? '左滑继续 →' : '收藏 · 转给做外贸的朋友'}</span></div>
</body></html>`;

const slides = [];

// 01 钩子
slides.push(frame(1, '关税变了', `
<h1 style="font-size:100px;margin-top:80px">中美突然<br><span class="red">互降关税</span>，<br>有些中国商家的<br><span class="hl">利润要变了</span></h1>
<h2>不聊大国博弈，只算普通人的生意账</h2>
<div class="card" style="margin-top:60px">
  <div class="lbl">这条讲清楚 3 件事</div>
  <ol>
    <li style="font-size:44px;font-weight:700;margin:14px 0"><span class="red">①</span> 哪些中国商品被降税？</li>
    <li style="font-size:44px;font-weight:700;margin:14px 0"><span class="red">②</span> 哪些生意最值得关注？</li>
    <li style="font-size:44px;font-weight:700;margin:14px 0"><span class="red">③</span> 原来赚 10 块，现在能赚多少？</li>
  </ol>
</div>`));

// 02 哪些商品受益
slides.push(frame(2, '先说结论', `
<h1>哪些中国商品<br><span class="hl">受益最明显？</span></h1>
<div class="card">
  <div class="lbl">重点降税品类</div>
  <div class="chips">
    <span class="chip r">玩具</span><span class="chip r">小家电</span><span class="chip r">餐具厨具</span>
    <span class="chip r">床品家纺</span><span class="chip r">儿童用品</span><span class="chip r">节庆用品</span><span class="chip r">烟花</span>
  </div>
</div>
<div class="card">
  <div class="lbl">具体到货架上</div>
  <div class="chips">
    <span class="chip">咖啡机</span><span class="chip">烤面包机</span><span class="chip">搅拌机</span><span class="chip">玩偶</span>
    <span class="chip">拼图</span><span class="chip">毛毯</span><span class="chip">床品</span><span class="chip">圣诞装饰</span>
    <span class="chip">人造花</span><span class="chip">儿童安全座椅</span>
  </div>
</div>
<div class="quote">几乎全是 <span class="y">“中国制造”的传统强项</span>，<br>也是美国人天天在买的日常货。</div>`));

// 03 为什么是这些
slides.push(frame(3, '为什么是它们', `
<h1>中国便宜的<br>早就不只是<span class="hl">人工</span></h1>
<div class="row">
  <div class="card"><div class="lbl" style="color:var(--mute)">20 年前</div>
    <p>廉价劳动力<br>土地便宜<br>工厂成本低<br>环保成本低</p></div>
  <div class="card" style="border:4px solid var(--red)"><div class="lbl">今天</div>
    <p><b>供应链密度 · 产业集群</b><br>模具 + 零部件<br>熟练工 + 工程师<br>港口物流 · 大规模生产</p></div>
</div>
<div class="card">
  <div class="lbl">举个例子：一台咖啡机</div>
  <p>电机 · 加热管 · PCB · 塑料件 · 模具 · 包装 · 组装，在珠三角<b class="red">几小时车程</b>内全部搞定。</p>
</div>
<div class="quote">不是一个工厂便宜，<br>而是<span class="y">一整套工业生态又便宜又快</span>。</div>`));

// 04 单件利润
slides.push(frame(4, '算一笔账', `
<h1>关税降了，<br>厂商<span class="hl">一件多赚多少？</span></h1>
<div class="card">
  <div class="lbl">假设：一台出口咖啡机</div>
  <p>成本 <b>$27</b> ｜ FOB <b>$30</b> ｜ 毛利 <b>$3</b>（10%）</p>
  <p>原额外关税 25%：$30 × 25% = <b class="red">$7.50</b></p>
</div>
<div class="row">
  <div class="card"><div class="lbl" style="color:var(--mute)">降税前</div>
    <p class="small">美方到手成本</p><p class="big" style="font-size:64px">$37.5</p>
    <p class="small" style="margin-top:10px">厂商单件毛利</p><p class="big" style="font-size:64px">$3</p></div>
  <div class="card" style="border:4px solid var(--red)"><div class="lbl">取消后（报价→$31.5）</div>
    <p class="small">美方到手成本（省 $6）</p><p class="big green" style="font-size:64px">$31.5</p>
    <p class="small" style="margin-top:10px">厂商单件毛利</p><p class="big red" style="font-size:64px">$4.5</p></div>
</div>
<div class="quote">单件毛利 <span class="y">+50%</span><br><span style="font-size:32px;font-weight:500">关税少 25% ≠ 利润 +25%。但制造业利润本来就薄，哪怕只分到几个点，增幅都很大。</span></div>`));

// 05 订单回来
const bar = (label, w, val, color) => `<div style="margin:22px 0"><p class="small">${label}</p>
<div style="display:flex;align-items:center;gap:20px"><div style="height:72px;width:${w}px;background:${color};border-radius:14px"></div><span class="num" style="font-size:52px">${val}</span></div></div>`;
slides.push(frame(5, '真正的变量', `
<h1>比涨价更猛的，<br>是<span class="hl">订单回来了</span></h1>
<div class="card">
  <div class="lbl">还是那家咖啡机工厂</div>
  ${bar('以前：100 万件 × $3', 300, '$300 万', '#B9AE9C')}
  ${bar('降税后：120 万件 × $4.5（订单 +20%）', 540, '$540 万', 'var(--red)')}
  <p style="font-size:48px;font-weight:900;margin-top:10px">总毛利 <span class="red">+80%</span></p>
</div>
<div class="row">
  <div class="card" style="padding:32px 36px"><p style="font-weight:700">① 单件利润提高</p></div>
  <div class="card" style="padding:32px 36px"><p style="font-weight:700">② 美国订单回流</p></div>
</div>
<div class="quote" style="font-size:38px">两个效应叠加，少数厂商利润<span class="y">接近翻倍</span>。<br><span style="font-size:30px;font-weight:500;color:#CFC6B8">注意：这是“订单明显回流”的情景推演，不是行业平均预测。</span></div>`));

// 06 抄作业
const tier = (t, color, items, note='') => `<div class="card" style="border-left:14px solid ${color}">
<div class="lbl" style="color:${color}">${t}</div>${items}${note}</div>`;
slides.push(frame(6, '抄作业', `
<h1>如果我是中国商家，<br><span class="hl">现在重点研究</span></h1>
${tier('第一梯队', 'var(--red)', `
  <p><b>普通玩具</b>：拼图 / 玩偶 / 非联网儿童玩具</p>
  <p><b>小家电</b>：咖啡机 / 烤面包机 / 搅拌机 / 电动剃须刀</p>`)}
${tier('第二梯队', '#E08A00', `
  <p>床品 · 毛毯 · 厨房用品 · 餐具</p>
  <p>人造花 · 圣诞装饰 · 万圣节用品</p>`)}
${tier('特殊赛道', 'var(--ink)', `
  <p><b>烟花 / 儿童安全座椅</b></p>`, `<p class="small" style="margin-top:8px">运输、认证、安全、产品责任门槛都更高，新手慎入</p>`)}
`));

// 07 降温
slides.push(frame(7, '先别冲动', `
<h1>千万别看到新闻<br>就去<span class="hl">开玩具厂</span></h1>
<div class="card"><div class="lbl">坑 ①　先查 HS / HTS 编码</div>
  <p>不是所有玩具都降。比如部分 <b>Wi-Fi / 蓝牙 / 射频联网玩具</b>，不一定享受这次优惠。</p></div>
<div class="card"><div class="lbl">坑 ②　别政策一出就扩产</div>
  <p><b>先拿订单，再扩产。</b></p></div>
<div class="card"><div class="lbl">坑 ③　真正该做的：找美国客户</div>
  <p>把以前因为价格没谈成的客户，全部翻出来重新报价：</p>
  <p style="margin-top:16px;background:var(--bg);border-radius:18px;padding:20px 26px;font-weight:900;font-size:40px;text-align:center">FOB + 新关税 + 运费 = <span class="red">美国到岸成本</span></p></div>
`));

// 08 普通人机会
const role = (who, what) => `<div style="display:flex;gap:24px;align-items:baseline;padding:12px 0;border-bottom:2px dashed var(--line)">
<span style="font-size:38px;font-weight:900;min-width:250px">${who}</span><span style="font-size:36px;line-height:1.45">${what}</span></div>`;
slides.push(frame(8, '普通人的机会', `
<h1>没有工厂，<br>普通人<span class="hl">还能做什么？</span></h1>
<div class="card" style="padding:24px 44px">
  ${role('外贸业务员', '帮工厂重新找美国客户')}
  ${role('跨境电商', '盯进入降税清单的 SKU')}
  ${role('供应链公司', '帮美国买家重新找中国供应商')}
  ${role('工厂老板', '联系过去流失的美国客户')}
  <div style="border:none">${role('产品经理', '围绕现有产业带开发新 SKU').replace('border-bottom:2px dashed var(--line)','')}</div>
</div>
<div class="quote" style="font-size:38px">关税变化真正创造的机会，<br>不是突然冒出一个新产业，<br>而是<span class="y">原本因为 25% 的税做不成的生意，可能重新算得过账了。</span></div>
<p class="small" style="margin-top:22px;font-size:24px">*文中利润数字为假设情景，具体降税范围以官方清单及 HTS 编码为准，不构成投资建议。</p>`));

(async () => {
  const out = path.join(__dirname, 'output');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 1 });
  for (let i = 0; i < slides.length; i++) {
    await page.setContent(slides[i], { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const f = path.join(out, `${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: f });
    // 检查是否有内容溢出到底部页脚
    const over = await page.evaluate(() => {
      const foot = document.querySelector('.foot').getBoundingClientRect().top;
      let max = 0; document.querySelectorAll('body > *:not(.foot)').forEach(e => max = Math.max(max, e.getBoundingClientRect().bottom));
      return Math.round(max - foot);
    });
    console.log(f, over > -10 ? `⚠ 与页脚重叠 ${over}px` : `余量 ${-over}px`);
  }
  await browser.close();
})();
