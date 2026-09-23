/* ============================================================
   Warframe 裂罅熔接计算器
   官方熔接表（所有武器/枪械/近战）+ 计算逻辑 + 教程 + GSAP 动画
   ============================================================ */

/* ---------- 词条库（cat: all=所有武器表 / gun=枪械表 / melee=近战表） ---------- */
const STATS = [
  // 元素 · 所有武器
  { id:'heat',     name:'火焰伤害',        em:'🔥', cat:'all' },
  { id:'cold',     name:'冰冻伤害',        em:'❄️', cat:'all' },
  { id:'elec',     name:'电击伤害',        em:'⚡', cat:'all' },
  { id:'toxin',    name:'毒素伤害',        em:'☠️', cat:'all' },
  // 阵营伤害 · 所有武器
  { id:'grineer',  name:'对 Grineer 伤害', em:'🪖', cat:'all' },
  { id:'corpus',   name:'对 Corpus 伤害',  em:'🤖', cat:'all' },
  { id:'infested', name:'对 Infested 伤害',em:'🐛', cat:'all' },
  // 枪械
  { id:'dmg',      name:'伤害',            em:'💥', cat:'gun' },
  { id:'zoom',     name:'变焦',            em:'🔍', cat:'gun' },
  { id:'ms',       name:'多重射击',        em:'🔫', cat:'gun' },
  { id:'sc',       name:'触发几率',        em:'🎯', cat:'gun' },
  { id:'cc',       name:'暴击几率',        em:'🎲', cat:'gun' },
  { id:'mag',      name:'弹匣容量',        em:'📦', cat:'gun' },
  { id:'reload',   name:'装填速度',        em:'🔄', cat:'gun' },
  { id:'ammo',     name:'弹药最大值',      em:'🧰', cat:'gun' },
  { id:'recoil',   name:'武器后坐力',      em:'🔩', cat:'gun' },
  // 近战
  { id:'mdmg',     name:'近战伤害',        em:'⚔️', cat:'melee' },
  { id:'as',       name:'攻击速度',        em:'🗡️', cat:'melee' },
  { id:'heavy',    name:'重击效率',        em:'💪', cat:'melee' },
  { id:'ctime',    name:'连击时间',        em:'⏱️', cat:'melee' },
  { id:'ccount',   name:'额外连击数几率',  em:'➕', cat:'melee' },
  { id:'range',    name:'近战范围',        em:'📏', cat:'melee' },
];

/* ---------- 官方熔接组合表（开发者工坊三张表） ---------- */
const FUSIONS = [
  // ★ 适用于：所有武器
  { a:'toxin',    b:'elec',     out:'腐蚀伤害',         em:'🧪', cat:'all' },
  { a:'toxin',    b:'cold',     out:'病毒伤害',         em:'🦠', cat:'all' },
  { a:'toxin',    b:'heat',     out:'毒气伤害',         em:'🌫️', cat:'all' },
  { a:'heat',     b:'cold',     out:'爆炸伤害',         em:'💣', cat:'all' },
  { a:'heat',     b:'elec',     out:'辐射伤害',         em:'☢️', cat:'all' },
  { a:'elec',     b:'cold',     out:'磁力伤害',         em:'🧲', cat:'all' },
  { a:'grineer',  b:'corpus',   out:'对奥罗金伤害',     em:'👑', cat:'all' },
  { a:'grineer',  b:'infested', out:'对炽蛇军伤害',     em:'🐍', cat:'all' },
  { a:'corpus',   b:'infested', out:'对科腐者伤害',     em:'🧟', cat:'all' },
  // ★ 适用于：步枪、霰弹枪、手枪、组合枪、曲翼枪械、部分同伴武器
  { a:'dmg',  b:'zoom',   out:'弱点伤害',           em:'🎯', cat:'gun' },
  { a:'dmg',  b:'ms',     out:'弱点伤害',           em:'🎯', cat:'gun' },
  { a:'dmg',  b:'sc',     out:'异常状态伤害',       em:'🩸', cat:'gun' },
  { a:'cc',   b:'zoom',   out:'弱点暴击几率',       em:'🎲', cat:'gun' },
  { a:'cc',   b:'ms',     out:'弱点暴击几率',       em:'🎲', cat:'gun' },
  { a:'mag',  b:'reload', out:'弹药效率',           em:'📦', cat:'gun' },
  { a:'ammo', b:'recoil', out:'弹药效率',           em:'📦', cat:'gun' },
  { a:'ammo', b:'reload', out:'收起武器时自动装填', em:'🔄', cat:'gun' },
  { a:'ammo', b:'mag',    out:'收起武器时自动装填', em:'🔄', cat:'gun' },
  // ★ 适用于：近战武器、组合近战武器、部分同伴武器
  { a:'heavy', b:'ccount', out:'重击伤害',     em:'💥', cat:'melee' },
  { a:'heavy', b:'ctime',  out:'重击准备速度', em:'⚡', cat:'melee' },
  { a:'as',    b:'range',  out:'格挡角度',     em:'🛡️', cat:'melee' },
  { a:'as',    b:'mdmg',   out:'震地伤害',     em:'🌏', cat:'melee' },
];

const CAT_NAME = { all:'所有武器', gun:'枪械', melee:'近战' };

/* ---------- 状态 ---------- */
let weaponCat = 'all';      // all / gun / melee
let calcMode  = 'fwd';      // fwd=正向(词条→结果) / rev=反向(融合属性→所需词条)
let selected  = [];         // 正向模式：最多 2 条 [{ id, pol:'pos'|'neg' }]
let selectedOut = null;     // 反向模式：当前选中的融合属性名

const statById = id => STATS.find(s => s.id === id);

/* 当前武器类型下，某条熔接组合是否适用 */
function catAllowed(fcat){
  return weaponCat === 'all' ? true : (fcat === weaponCat || fcat === 'all');
}
/* 当前武器类型下，某词条是否出现在面板 */
function statVisible(s){
  return weaponCat === 'all' ? true : (s.cat === weaponCat || s.cat === 'all');
}
/* 两条词条在当前武器类型下能否熔接 */
function canFuse(x, y){
  return FUSIONS.some(f =>
    catAllowed(f.cat) &&
    ((f.a === x && f.b === y) || (f.a === y && f.b === x))
  );
}
/* 查找两条词条的熔接结果 */
function findFusion(x, y){
  return FUSIONS.find(f =>
    catAllowed(f.cat) &&
    ((f.a === x && f.b === y) || (f.a === y && f.b === x))
  ) || null;
}
/* 某词条在当前武器类型下的所有熔接搭档 */
function partnersOf(id){
  return FUSIONS
    .filter(f => catAllowed(f.cat) && (f.a === id || f.b === id))
    .map(f => (f.a === id ? f.b : f.a));
}

/* ---------- 渲染：词条面板（不兼容的词条隐藏） ---------- */
function renderPalette(){
  const box = document.getElementById('statPalette');
  if (!box) return;
  box.innerHTML = '';

  if (calcMode === 'rev'){ renderOutputPalette(box); return; }

  const selIds = selected.map(s => s.id);

  let visible;
  if (selected.length === 0){
    // 未选：显示当前武器类型的全部词条
    visible = STATS.filter(statVisible);
  } else if (selected.length === 1){
    // 已选 1 条：只显示它 + 可与之熔接的词条
    const ok = new Set(partnersOf(selIds[0]));
    visible = STATS.filter(s => s.id === selIds[0] || ok.has(s.id));
  } else {
    // 已选满 2 条：只显示这 2 条
    visible = STATS.filter(s => selIds.includes(s.id));
  }

  visible.forEach(s => {
    const el = document.createElement('button');
    const isSel = selIds.includes(s.id);
    el.className = 'chip' + (isSel ? ' sel' : '');
    el.innerHTML = `<span class="em">${s.em}</span>${s.name}`;
    el.onclick = () => toggleStat(s.id);
    box.appendChild(el);
  });

  // 已选 1 条且没有可熔搭档时给出提示
  if (selected.length === 1 && visible.length === 1){
    const tip = document.createElement('span');
    tip.className = 'palette-tip';
    tip.textContent = '⚠️ 当前词条在该武器类型下没有可熔接的搭档，换一条或切换武器类型试试';
    box.appendChild(tip);
  }
}

function toggleStat(id){
  const i = selected.findIndex(s => s.id === id);
  if (i >= 0) selected.splice(i, 1);                 // 再点一次移除
  else if (selected.length < 2) selected.push({ id, pol:'pos' });
  renderAll();
  animateRefresh();
}

/* ---------- 反向模式：融合属性面板 ---------- */
function renderOutputPalette(box){
  const seen = new Set();
  FUSIONS.filter(f => catAllowed(f.cat)).forEach(f => {
    if (seen.has(f.out)) return;
    seen.add(f.out);
    const el = document.createElement('button');
    el.className = 'chip' + (selectedOut === f.out ? ' sel' : '');
    el.innerHTML = `<span class="em">${f.em}</span>${f.out}`;
    el.onclick = () => selectOutput(f.out);
    box.appendChild(el);
  });
  if (!seen.size){
    const tip = document.createElement('span');
    tip.className = 'palette-tip';
    tip.textContent = '当前武器类型下没有可查询的融合属性';
    box.appendChild(tip);
  }
}

function selectOutput(out){
  selectedOut = out;
  renderPalette();
  renderHints();
  renderReverseResult(out);
}

/* ---------- 反向模式：查询所需词条 ---------- */
function renderReverseResult(out){
  const panel = document.getElementById('resultPanel');
  if (!panel) return;
  const pairs = FUSIONS.filter(f => catAllowed(f.cat) && f.out === out);

  if (!pairs.length){
    panel.innerHTML = '<span class="empty-tip">当前武器类型下没有产出该属性的熔接组合</span>';
    animateResult(panel);
    return;
  }

  const rows = pairs.map(f => {
    const A = statById(f.a), B = statById(f.b);
    return `<div class="pair-row">
        <span>${A.em} ${A.name}</span>
        <span class="combo-arrow">+</span>
        <span>${B.em} ${B.name}</span>
        <span class="combo-arrow">→</span>
        <b>${f.em} ${f.out}</b>
        <span class="res-cat">${CAT_NAME[f.cat]}</span>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <h3>🔎 ${pairs[0].em} ${out} · 所需词条</h3>
    <p style="color:var(--dim);font-size:13.5px;margin-top:4px">
      共 <b>${pairs.length}</b> 种词条组合可以熔出该属性（当前武器类型下）
    </p>
    <div class="pair-list">${rows}</div>
    <div class="tut-tip" style="margin-top:16px">
      极性规则：一正一负 → 融合词条为<b>负面</b>；两正 → 融合词条为<b>正面</b>；熔接后随机补充<b>一条正面</b>词条。融合词条默认锁定、不占手动锁名额。
    </div>`;

  animateResult(panel);
}

/* ---------- 模式切换 ---------- */
function applyMode(){
  const fwd = calcMode === 'fwd';
  const block = document.getElementById('fwdOnly');
  if (block) block.style.display = fwd ? '' : 'none';
  const title = document.getElementById('step1Title');
  if (title) title.textContent = fwd ? '选择词条' : '选择融合属性';
  const btn = document.getElementById('fuseBtn');
  if (btn) btn.innerHTML = fwd ? '⚗️<br>熔接' : '🔎<br>查询';
  const note = document.getElementById('modeNote');
  if (note) note.textContent = fwd ? '选词条 → 算熔接结果' : '选融合属性 → 查所需词条';
}

function setCalcMode(mode){
  calcMode = mode || 'fwd';
  selected = [];
  selectedOut = null;
  applyMode();
  resetResult();
  renderAll();
}

function initModeToggle(){
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      setCalcMode(b.dataset.mode);
    };
  });
}

function resetResult(){
  const panel = document.getElementById('resultPanel');
  if (!panel) return;
  panel.innerHTML = calcMode === 'fwd'
    ? '<span class="empty-tip">选择 2 条词条后，点击左侧「熔接」按钮查看结果</span>'
    : '<span class="empty-tip">点击左侧任意融合属性，自动显示所需词条</span>';
}

/* ---------- 渲染：已选词条 ---------- */
function renderRiven(){
  const box = document.getElementById('myRiven');
  if (!box) return;
  box.innerHTML = '';

  if (!selected.length){
    box.innerHTML = '<span class="empty-tip">尚未选择词条</span>';
    return;
  }

  selected.forEach((s, idx) => {
    const st = statById(s.id);
    const el = document.createElement('span');
    el.className = 'slot ' + (s.pol === 'pos' ? 'pos' : 'neg');
    el.innerHTML =
      `<span class="em">${st.em}</span>${st.name}` +
      `<span class="pol" title="切换正负">${s.pol === 'pos' ? '+' : '−'}</span>` +
      `<span class="rm" title="移除">✕</span>`;
    el.querySelector('.pol').onclick = () => {
      selected[idx].pol = selected[idx].pol === 'pos' ? 'neg' : 'pos';
      renderAll();
    };
    el.querySelector('.rm').onclick = () => toggleStat(s.id);
    box.appendChild(el);
  });
}

/* ---------- 渲染：提示 / 按钮状态 ---------- */
function renderHints(){
  const hint = document.getElementById('step1Hint');
  const btn  = document.getElementById('fuseBtn');
  if (!btn) return;

  if (calcMode === 'rev'){
    btn.disabled = !selectedOut;
    if (hint) hint.textContent = selectedOut
      ? '已选融合属性，右侧为查询结果'
      : '点击选择一个融合属性，右侧自动出结果';
    return;
  }

  let msg = '点击选择第 1 条词条';
  if (selected.length === 1){
    msg = '已选 1 条——面板已隐藏不兼容词条，点击选择第 2 条';
  } else if (selected.length === 2){
    msg = '已选满 2 条，点「熔接」看结果；点词条或 ✕ 可移除';
  }
  if (hint) hint.textContent = msg;

  btn.disabled = selected.length !== 2;
}

/* ---------- 熔接结果 ---------- */
function showResult(){
  if (selected.length !== 2) return;
  const A = selected[0], B = selected[1];
  const f = findFusion(A.id, B.id);
  const panel = document.getElementById('resultPanel');
  if (!panel) return;

  if (!f){
    panel.innerHTML = `<span class="empty-tip">这两条词条之间没有熔接组合，换一对试试。</span>`;
    animateResult(panel);
    return;
  }

  /* 极性规则：一正一负 → 融合词条为负；两正 → 融合词条为正；
     随后随机补充一条正面词条 */
  const hasNeg   = A.pol === 'neg' || B.pol === 'neg';
  const fusedPol = hasNeg ? 'neg' : 'pos';
  const randPol  = 'pos';
  const polTxt   = p => p === 'pos'
    ? '<b class="hl">正面</b>'
    : '<b style="color:var(--red)">负面</b>';

  const aTxt = `${statById(A.id).em} ${statById(A.id).name}（${A.pol==='pos'?'正':'负'}）`;
  const bTxt = `${statById(B.id).em} ${statById(B.id).name}（${B.pol==='pos'?'正':'负'}）`;

  panel.innerHTML = `
    <h3>${f.em} 熔接结果：${f.out}<span class="res-cat">${CAT_NAME[f.cat]}</span></h3>
    <p style="color:var(--dim);font-size:13.5px;margin-top:4px">消耗：${aTxt} + ${bTxt}</p>
    <div class="res-grid">
      <div class="res-box">
        <div class="lb">获得 · 融合词条</div>
        <div class="vl">${f.em} <b>${f.out}</b>（${polTxt(fusedPol)}）</div>
        <div class="res-tag">✓ 默认锁定 · 不占手动锁名额 · 不翻倍赤毒</div>
      </div>
      <div class="res-box">
        <div class="lb">获得 · 随机补充词条</div>
        <div class="vl">🎲 随机基础词条（${polTxt(randPol)}）</div>
        <div class="res-tag">规则：随机补充为正面词条</div>
      </div>
      <div class="res-box">
        <div class="lb">熔接后可锁定数</div>
        <div class="vl">融合词条（自动锁）+ 手动锁 1 条 = <b class="hl">共锁 2 词条</b></div>
        <div class="res-tag">剩余词条照常循环，直至毕业</div>
      </div>
      <div class="res-box">
        <div class="lb">成本提醒</div>
        <div class="vl">熔接器产自 <b>6 人高难本</b>，一周仅 <b class="warn">3 次</b></div>
        <div class="res-tag">熔前必可预览，算好再动手</div>
      </div>
    </div>
    <p style="margin-top:16px;font-size:13.5px;color:#c8cfe0">
      💡 下一步：把融合词条当作<b>永久锁</b>，再手动锁 1 条基础词条，
      剩下的词条用赤毒慢慢循环到完美即可。
    </p>`;

  animateResult(panel);
}

/* ---------- 武器类型切换 ---------- */
function setWeaponCat(cat){
  weaponCat = cat;
  selected = [];          // 切换类型后清空已选（兼容性变了）
  selectedOut = null;
  applyMode();
  resetResult();
  renderAll();
}
function initWeaponToggle(){
  document.querySelectorAll('.wp-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.wp-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      setWeaponCat(b.dataset.wp);
    };
  });
}

/* ---------- 教程 ---------- */
const TUTORIAL = [
  {
    t:'第 1 步 · 先定目标再动手',
    b:'洗之前先想清楚三件事：<b>要几条词条</b>、<b>留不留无害负面</b>、<b>核心词条是哪一条</b>。目标不定，赤毒就是白烧。',
    tip:'推荐布局：2 正 1 负（正面数值系数最高 1.2375），或 3 正 1 负（最通用、容错高）。'
  },
  {
    t:'第 2 步 · 不锁自由洗，先把"数量"洗对',
    b:'先<b>不要锁定</b>，自由循环，只盯一件事：把<b>属性数量</b>洗到你要的布局（比如 2 正 1 负）。',
    tip:'⚠️ 锁定会冻结词条数量——想 2+1，就必须<b>在锁之前</b>先把数量洗出来。锁错就永远洗不回去了。'
  },
  {
    t:'第 3 步 · 出现 1 条满意词，立刻锁住',
    b:'一旦出现你<b>必留的核心词条</b>，马上锁它，再洗剩下的词条。带锁循环赤毒<b>翻倍</b>，但你会永远不丢这条词。',
    tip:'晚锁 = 反复整张重洗、赌它再现；早锁 = 永不丢失。只要出现 1 条满意词，早锁一定比晚锁省。'
  },
  {
    t:'第 4 步 · 用熔接器熔出稀缺属性',
    b:'熔接器把两条词条熔成一条<b>洗不出来的融合词条</b>（爆炸 / 病毒 / 异常状态伤害 / 弱点伤害 / 重击伤害……）。熔接前必能预览结果，先用计算器算好再动手。',
    tip:'熔接器产自新 6 人高难本，<b>一周只能刷 3 次</b>——极度稀缺，只投你真正要毕业的武器。'
  },
  {
    t:'第 5 步 · 融合词条 + 手动锁 = 锁 2 词条',
    b:'融合词条<b>默认锁定且不翻倍赤毒</b>，你还能<b>再手动锁 1 条</b>基础词条——等于同时锁住 2 条，却只付 1 条锁的翻倍成本。拿到可用的卡就见好就收：第 7 次循环起单次破 2000 赤毒，别上头。',
    tip:'剩下 1–2 条自由洗到完美即可。这是当前版本把卡推向毕业级、且最省赤毒的路线。'
  },
];

let tutIdx = 0;

function renderTutorial(){
  const s = TUTORIAL[tutIdx];
  const lb = document.getElementById('tutLabel');
  if (!lb || !document.getElementById('tutTitle')) return;
  document.getElementById('tutLabel').textContent = `步骤 ${tutIdx + 1} / ${TUTORIAL.length}`;
  document.getElementById('tutTitle').textContent = s.t;
  document.getElementById('tutBody').innerHTML = s.b;
  document.getElementById('tutTip').innerHTML = s.tip;
  document.getElementById('tutBar').style.width = ((tutIdx + 1) / TUTORIAL.length * 100) + '%';

  document.querySelectorAll('.tut-dot').forEach((d, i) => {
    d.classList.toggle('on', i === tutIdx);
  });

  document.getElementById('tutPrev').disabled = tutIdx === 0;
  document.getElementById('tutNext').disabled = tutIdx === TUTORIAL.length - 1;
}

function initTutorial(){
  const dots = document.getElementById('tutDots');
  TUTORIAL.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'tut-dot';
    d.onclick = () => { tutIdx = i; renderTutorial(); animateTutorial(); };
    dots.appendChild(d);
  });

  document.getElementById('tutPrev').onclick = () => {
    if (tutIdx > 0){ tutIdx--; renderTutorial(); animateTutorial(-1); }
  };
  document.getElementById('tutNext').onclick = () => {
    if (tutIdx < TUTORIAL.length - 1){ tutIdx++; renderTutorial(); animateTutorial(1); }
  };

  renderTutorial();
}

/* ============================================================
   GSAP 动画
   ============================================================ */
const hasGSAP = typeof gsap !== 'undefined';

function animateRefresh(){
  if (!hasGSAP) return;
  gsap.fromTo('#myRiven', { scale:.97 }, { scale:1, duration:.32, ease:'power2.out' });
}

function animateResult(panel){
  if (!hasGSAP){ return; }
  gsap.fromTo(panel,
    { opacity:0, y:26, scale:.97 },
    { opacity:1, y:0, scale:1, duration:.62, ease:'back.out(1.5)' }
  );
  gsap.fromTo(panel.querySelectorAll('.res-box'),
    { opacity:0, y:16 },
    { opacity:1, y:0, duration:.45, stagger:.09, delay:.14, ease:'power2.out' }
  );
}

function animateTutorial(dir){
  if (!hasGSAP) return;
  const card = document.getElementById('tutCard');
  gsap.fromTo(card,
    { opacity:0, x: (dir === -1 ? -34 : 34) },
    { opacity:1, x:0, duration:.45, ease:'power3.out' }
  );
}

function initAnimations(){
  // GSAP 未加载 → 内容默认可见（CSS 只在 html.anim 下才预隐藏），直接返回
  if (!hasGSAP) return;

  // 只有确认 GSAP 可用才允许 CSS 预隐藏待入场元素
  document.documentElement.classList.add('anim');

  // 直接读取系统动效偏好（不用 gsap.matchMedia 条件对象，
  // 单一条件在"未开启减少动效"的机器上永不匹配、回调不执行）
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d = reduceMotion ? 0 : 1;

  /* --- Hero 入场 --- */
  gsap.timeline({ defaults:{ ease:'power3.out' } })
    .fromTo('.badge-line .badge', { opacity:0, y:16 },
      { opacity:1, y:0, duration:.5*d, stagger:.12*d })
    .fromTo('.hero-title', { opacity:0, y:38, scale:.96 },
      { opacity:1, y:0, scale:1, duration:.8*d }, '-=.2')
    .fromTo('.hero-sub', { opacity:0, y:22 },
      { opacity:1, y:0, duration:.6*d }, '-=.45')
    .fromTo('.hero-cta .btn', { opacity:0, y:18 },
      { opacity:1, y:0, duration:.5*d, stagger:.1*d }, '-=.3');

  if (!reduceMotion){
    gsap.to('.hero-bg', { opacity:.62, duration:3.4, repeat:-1, yoyo:true, ease:'sine.inOut' });
    gsap.to('.scroll-hint', { y:9, duration:1.1, repeat:-1, yoyo:true, ease:'sine.inOut' });
  }

  /* --- 分区滚动入场 --- */
  const canIO = 'IntersectionObserver' in window;
  const reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  const cards   = Array.prototype.slice.call(document.querySelectorAll('.mech-card'));

  if (canIO && !reduceMotion){
    gsap.set(reveals, { opacity:0, y:44 });
    gsap.set(cards,   { opacity:0, y:34 });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        gsap.to(en.target, { opacity:1, y:0, duration:.75, ease:'power3.out' });
        io.unobserve(en.target);
      });
    }, { threshold:.12, rootMargin:'0px 0px -60px 0px' });
    reveals.forEach(el => io.observe(el));

    const ioCards = new IntersectionObserver((entries) => {
      if (!entries.some(en => en.isIntersecting)) return;
      gsap.to(cards, { opacity:1, y:0, duration:.7, stagger:.14, ease:'power3.out' });
      ioCards.disconnect();
    }, { threshold:.2 });
    if (cards.length) ioCards.observe(cards[0]);
  }

  /* --- 保险丝：2.5 秒后，视口内仍透明的元素强制显示 --- */
  setTimeout(() => {
    document.querySelectorAll('.reveal, .mech-card').forEach(e => {
      const r = e.getBoundingClientRect();
      const inView = r.top < window.innerHeight && r.bottom > 0;
      if (inView && parseFloat(getComputedStyle(e).opacity) < 0.05){
        e.style.opacity = 1;
      }
    });
  }, 2500);
}

/* ---------- 启动 ---------- */
function renderAll(){
  renderPalette();
  renderRiven();
  renderHints();
}

document.addEventListener('DOMContentLoaded', () => {
  // 每步独立 try/catch：任何一步失败都不拖垮其余初始化
  [renderAll, applyMode, initModeToggle, initWeaponToggle, initTutorial, initAnimations].forEach(fn => {
    try { fn(); } catch (err) { console.error('[riven-fusion] init step failed:', fn.name, err); }
  });

  const fb = document.getElementById('fuseBtn');
  if (fb) fb.onclick = () => {
    if (calcMode === 'fwd') showResult();
    else if (selectedOut) renderReverseResult(selectedOut);
  };
});
