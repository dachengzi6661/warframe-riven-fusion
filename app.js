/* ============================================================
   Warframe 裂罅熔接查询台
   ────────────────────────────────────────────────────────────
   BUSINESS CORE（业务核心）
   本区块为原项目业务逻辑，UI 重构期间【逐字未改】：
   数据表、武器类型过滤、可熔判定、熔接查询、极性规则。
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
  { id:'cc',       name:'暴击几率',        em:'🎲', cat:'gun' },
  { id:'mag',      name:'弹匣容量',        em:'📦', cat:'gun' },
  { id:'reload',   name:'装填速度',        em:'🔄', cat:'gun' },
  { id:'ammo',     name:'弹药最大值',      em:'🧰', cat:'gun' },
  { id:'recoil',   name:'武器后坐力',      em:'🔩', cat:'gun' },
  // 枪械 + 近战共用
  { id:'sc',       name:'触发几率',        em:'🎯', cat:['gun','melee'] },
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
  { a:'mdmg',  b:'sc',     out:'异常状态伤害', em:'🩸', cat:'melee' },
];

/* cat 规范化：数据里单值仍可写字符串，运行时一律是数组。
   这样只有真正「共用」的条目需要写数组，其余 43 条字面量一字不动。 */
STATS.forEach(s  => { if (!Array.isArray(s.cat)) s.cat  = [s.cat]; });
FUSIONS.forEach(f => { if (!Array.isArray(f.cat)) f.cat = [f.cat]; });

const CAT_NAME = { all:'所有武器', gun:'枪械', melee:'近战' };

/* ---------- 状态 ---------- */
let weaponCat = 'all';      // all / gun / melee
let calcMode  = 'fwd';      // fwd=正向(词条→结果) / rev=反向(融合属性→所需词条)
let selected  = [];         // 正向模式：最多 2 条 [{ id, pol:'pos'|'neg' }]
let selectedOut = null;     // 反向模式：当前选中的融合属性名

const statById = id => STATS.find(s => s.id === id);

/* 当前武器类型下，某条熔接组合是否适用 */
/* 适用范围是数组：all=通用 / gun=枪械 / melee=近战 / ['gun','melee']=共用。
   weaponCat=all → 全可见；gun → 通用+枪械+共用；melee → 通用+近战+共用 */
function catAllowed(cat){
  return weaponCat === 'all' || cat.indexOf('all') >= 0 || cat.indexOf(weaponCat) >= 0;
}
/* 当前武器类型下，某词条是否出现在面板 */
function statVisible(s){ return catAllowed(s.cat); }
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

/* ============================================================
   END BUSINESS CORE —— 以下均为 UI 层
   ============================================================ */

const $ = id => document.getElementById(id);

/* ---------- UI 状态（纯展示，不参与业务判定） ---------- */
const ui = {
  group:'all',     // all | element | faction | gun | melee  仅影响网格显示
  query:'',        // 搜索关键词                              仅影响网格显示
  panel:null,      // 覆盖层：mech | rules | guide
  guideIdx:0,
};

/* 正向查询的结果快照（点「熔接」后才会产生；选择一变就清空） */
let fused = null;   // { a:{id,pol}, b:{id,pol}, out:fusion|null }

/* 词条 → 展示分组（UI 派生，不改动业务数据） */
const ELEMENT_IDS = ['heat','cold','elec','toxin'];
const FACTION_IDS = ['grineer','corpus','infested'];
const GROUP_NAME  = { all:'全部', element:'元素', faction:'阵营', gun:'枪械', melee:'近战', shared:'共用' };
const GROUP_ICON  = { all:'#i-grid', element:'#i-element', faction:'#i-faction', gun:'#i-gun', melee:'#i-blade', shared:'#i-riven' };
const CAT_SHORT   = { all:'通用', gun:'枪械', melee:'近战', shared:'共用' };

/* 适用范围 → 显示文案 / 图标。单个范围照旧，多个范围=共用。 */
function catLabel(c, short){
  if (c.indexOf('all') >= 0) return short ? '通用' : '所有武器';
  if (c.length > 1) return short ? CAT_SHORT.shared : '枪械 / 近战';
  return short ? CAT_SHORT[c[0]] : CAT_NAME[c[0]];
}
function groupIcon(g){ return GROUP_ICON[g.length > 1 ? 'shared' : g[0]] || GROUP_ICON.all; }
function groupName(g){ return g.length > 1 ? GROUP_NAME.shared : (GROUP_NAME[g[0]] || '全部'); }

/* 词条 → 展示分组（返回数组，便于共用参与多个类别过滤） */
function groupOfStat(id){
  if (ELEMENT_IDS.indexOf(id) >= 0) return ['element'];
  if (FACTION_IDS.indexOf(id) >= 0) return ['faction'];
  return statById(id).cat;
}
/* 一批配方 → 展示分组：纯通用 → 元素/阵营；单范围 → 该范围；跨范围 → 共用 */
function fusionGroups(list){
  if (!list.length) return ['gun'];
  const cats = [];
  list.forEach(f => f.cat.forEach(c => { if (c !== 'all' && cats.indexOf(c) < 0) cats.push(c); }));
  if (!cats.length) return [ELEMENT_IDS.indexOf(list[0].a) >= 0 ? 'element' : 'faction'];
  return cats;
}

/* 反向模式：可反查的融合属性（沿用老版 renderOutputPalette 的去重口径） */
function outputList(){
  const seen = Object.create(null);
  const arr = [];
  FUSIONS.forEach(f => {
    if (!catAllowed(f.cat) || seen[f.out]) return;
    seen[f.out] = 1;
    const hits = FUSIONS.filter(g => g.out === f.out && catAllowed(g.cat));
    const g = fusionGroups(hits);
    arr.push({ name: f.out, group: g, icon: groupIcon(g), count: hits.length });
  });
  return arr;
}

function matchQuery(text){
  const q = ui.query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().indexOf(q) >= 0;
}

/* ---------- 卡片状态 ---------- */
function statCardState(s){
  const idx = selected.findIndex(x => x.id === s.id);
  if (idx >= 0) return { state:'sel', pol:selected[idx].pol, slot:(idx === 0 ? 'A' : 'B') };
  if (selected.length === 0) return { state:'', pol:'pos', slot:'' };
  /* 与已选的第一条（A）没有熔接组合 → 变暗提示。
     注意：仍然可点选 —— 本工具的核心问题就是「这两条到底能不能熔」。 */
  if (!canFuse(selected[0].id, s.id)) return { state:'dim', pol:'pos', slot:'' };
  return { state:(selected.length >= 2 ? 'muted' : ''), pol:'pos', slot:'' };
}

/* ============================================================
   渲染：横向 Mod Card 网格
   ============================================================ */
function cardHTML(t){
  const cls = ['mod-card'];
  const sel = t.state === 'sel';
  if (sel) cls.push('sel', t.pol === 'neg' ? 'neg' : 'pos');
  else if (t.state) cls.push(t.state);
  const polName = t.pol === 'neg' ? '负面' : '正面';
  /* 极性开关是真 <button>（可 Tab / 可 Enter），只在选中时出现 */
  const pol = '<button type="button" class="mc-pol" aria-label="切换正负极性，当前' + polName + '">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="' +
              (t.pol === 'neg' ? '#i-neg' : '#i-pos') + '"/></svg></button>';
  let label = t.name + '，' + t.catTag;
  if (sel) label += '，已选为 ' + t.slot + '，当前' + polName;
  else if (t.state === 'dim') label += '，与已选词条没有熔接组合';
  return '<div class="' + cls.join(' ') + '"' +
         ' data-key="' + t.key + '" data-kind="' + t.kind + '"' +
         ' role="option" tabindex="0" aria-selected="' + (sel ? 'true' : 'false') + '"' +
         ' aria-label="' + label + '" title="' + t.name + '">' +
           '<svg class="mc-frame" viewBox="0 0 185 100" preserveAspectRatio="none" aria-hidden="true"><use href="#riven-frame"/></svg>' +
           '<span class="mc-cat">' + t.catTag + '</span>' +
           pol +
           '<span class="mc-idx">' + (t.slot || '') + '</span>' +
           '<span class="mc-body">' +
             '<span class="mc-art"><svg viewBox="0 0 24 24"><use href="' + t.icon + '"/></svg></span>' +
             '<span class="mc-name">' + t.name + '</span>' +
           '</span>' +
         '</div>';
}

function ghostHTML(){
  return '<div class="mod-card ghost" aria-hidden="true">' +
         '<svg class="mc-frame" viewBox="0 0 185 100" preserveAspectRatio="none"><use href="#riven-frame"/></svg>' +
         '</div>';
}

function renderGrid(){
  const grid = $('modGrid');
  if (!grid) return;
  /* innerHTML 重建会丢掉焦点 —— 先记住当前聚焦的卡片，重建后还回去 */
  const act = document.activeElement;
  const fcard = (act && act.closest) ? act.closest('.mod-card') : null;
  const fkey = fcard ? fcard.dataset.key : null;
  let html = '';
  let shown = 0;

  if (calcMode === 'rev'){
    outputList()
      .filter(o => (ui.group === 'all' || o.group === ui.group) && matchQuery(o.name))
      .forEach(o => {
        shown++;
        html += cardHTML({
          kind:'out', key:o.name, name:o.name, icon:o.icon,
          catTag:groupName(o.group),
          state:(selectedOut === o.name ? 'sel' : ''), pol:'pos', slot:'C',
        });
      });
  } else {
    STATS.filter(s => {
      if (!statVisible(s)) return false;
      if (ui.group !== 'all' && groupOfStat(s.id).indexOf(ui.group) < 0) return false;
      return matchQuery(s.name + ' ' + s.id + ' ' + catLabel(s.cat, false));
    }).forEach(s => {
      shown++;
      const st = statCardState(s);
      html += cardHTML({
        kind:'stat', key:s.id, name:s.name,
        icon:groupIcon(groupOfStat(s.id)), catTag:catLabel(s.cat, true),
        state:st.state, pol:st.pol, slot:st.slot,
      });
    });
  }

  grid.innerHTML = html;
  padGrid(grid);
  if (fkey){
    let back = null;
    grid.querySelectorAll('.mod-card[data-key]').forEach(el => {
      if (!back && el.dataset.key === fkey) back = el;
    });
    if (back) back.focus({ preventScroll:true });
  }
  const empty = $('gridEmpty');
  if (empty) empty.hidden = shown !== 0;
  const tShow = $('tShow');
  if (tShow) tShow.textContent = shown;
}

/* 补空槽：只补满「最后一行」，让网格自然收尾。
   注意：这里**不再多补一整排** —— 22 张卡排完就结束，
   不为了撑高容器而生成额外的空卡行。 */
function padGrid(grid){
  if (!grid) return;
  const cols = (getComputedStyle(grid).gridTemplateColumns || '').trim().split(/\s+/).filter(Boolean).length || 1;
  const real = grid.querySelectorAll('.mod-card:not(.ghost)').length;
  if (!real) return;
  const need = Math.max(0, Math.ceil(real / cols) * cols - real);
  if (need > 0) grid.insertAdjacentHTML('beforeend', new Array(need + 1).join(ghostHTML()));
}

/* ============================================================
   渲染：右侧大型 Preview —— 这里只显示「查询答案」
   ============================================================ */
function resultCard(o){
  return '<div class="rs-card ' + (o.cls || '') + '">' +
    '<svg class="mc-frame" viewBox="0 0 100 170" preserveAspectRatio="none" aria-hidden="true"><use href="#riven-frame-p"/></svg>' +
    '<span class="rs-kicker">' + o.kicker + '</span>' +
    '<span class="rs-art"><svg viewBox="0 0 24 24"><use href="' + o.icon + '"/></svg></span>' +
    '<span class="rs-name">' + o.name + '</span>' +
    (o.polar ? '<span class="rs-polar">' + o.polar + '</span>' : '') +
    '<span class="rs-foot">' + o.foot + '</span>' +
  '</div>';
}

function polTxt(p){
  return p === 'neg' ? '<b class="p-neg">负面</b>' : '<b class="p-pos">正面</b>';
}

/* 结果面板更新：旧内容淡出 → 新结果淡入（200~350ms 区间）。
   用 token 防止连点时旧动画的 onComplete 覆盖新结果。 */
let resultToken = 0;
function applyResult(box, html){
  const next = '<div class="result-inner">' + html + '</div>';
  if (box.innerHTML === next) return;      // 内容没变就不重绘，避免自动查询下反复闪
  const token = ++resultToken;
  const prev = box.querySelector('.result-inner');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const commit = () => {
    if (token !== resultToken) return;
    box.innerHTML = next;
    animResult();
  };
  if (hasGSAP && prev && !reduce){
    gsap.to(prev, { opacity:0, duration:.11, overwrite:true, onComplete:commit });
  } else {
    commit();
  }
}

function renderResult(){
  const box = $('resultPane');
  if (!box) return;
  let html = '';

  /* ---------- 反向：选中目标即出配方 ---------- */
  if (calcMode === 'rev'){
    if (!selectedOut){
      html = resultCard({
        kicker:'反查目标', name:'？', icon:'#i-scan', cls:'empty',
        foot:'选择 1 个融合词条',
      }) + '<p class="rs-meta">左侧列出当前武器类型下全部可反查的融合词条，<br>选中后立即反查配方。</p>';
    } else {
      const pairs = FUSIONS.filter(f => catAllowed(f.cat) && f.out === selectedOut);
      const g = fusionGroups(pairs);
      html = resultCard({
        kicker:'反查目标', name:selectedOut, icon:groupIcon(g),
        polar:'<span style="color:var(--dim)">共 ' + pairs.length + ' 条配方</span>',
        foot:'TARGET · 融合词条',
      });
      if (!pairs.length){
        html += '<p class="rs-meta"><span class="no">NO RECIPE FOUND</span><br>当前武器类型下没有产出该属性的组合。</p>';
      } else {
        html += '<p class="rs-meta">以下 <b>' + pairs.length + '</b> 条配方均可熔出该属性：</p>';
        html += '<div class="rs-recipes">' + pairs.map(f => {
          const A = statById(f.a), B = statById(f.b);
          return '<div class="rs-recipe"><b>' + A.name + '</b><span class="arw">＋</span><b>' + B.name +
                 '</b><span class="arw">→</span><b>' + f.out + '</b>' +
                 '<span class="cat">' + catLabel(f.cat, false) + '</span></div>';
        }).join('') + '</div>';
      }
    }
    applyResult(box, html);
    return;
  }

  /* ---------- 正向：选满两条即自动查询，没有确认按钮 ---------- */
  if (!fused){
    const n = selected.length;
    html = resultCard({
      kicker:'熔接结果', name:'？', icon:'#i-riven', cls:'empty',
      foot: n === 0 ? '等待选择两条词条' : '请选择第二条词条',
    });
    const tip = n === 0
      ? '从左侧选择 <b>2</b> 条词条，<b>选满即自动查询</b>。'
      : '已选 <b>' + statById(selected[0].id).name + '</b> · 再选 1 条即自动查询。';
    html += '<p class="rs-meta">' + tip + '</p>';
    applyResult(box, html);
    return;
  }

  const A = statById(fused.a.id), B = statById(fused.b.id);
  const eq = A.name + '（' + (fused.a.pol === 'neg' ? '负' : '正') + '）<span class="arw"> ＋ </span>' +
             B.name + '（' + (fused.b.pol === 'neg' ? '负' : '正') + '）';

  if (!fused.out){
    html = resultCard({
      kicker:'熔接结果', name:'无法熔接', icon:'#i-warn', cls:'fail',
      polar:'<span class="no">NO RECIPE</span>',
      foot:'该组合不在官方熔接表内',
    });
    html += '<p class="rs-meta">' + eq + '<br><br>' +
            '这两条词条在当前武器类型下<b>没有熔接组合</b>，换一对再试。</p>';
  } else {
    const f = fused.out;
    const hasNeg = fused.a.pol === 'neg' || fused.b.pol === 'neg';
    const fusedPol = hasNeg ? 'neg' : 'pos';
    html = resultCard({
      kicker:'融合词条', name:f.out, icon:groupIcon(fusionGroups([f])),
      polar:'极性 ' + polTxt(fusedPol),
      foot:'✔ 默认锁定 · 不占手动锁名额',
    });
    html += '<p class="rs-meta">' +
            eq + '<br><span class="arw">→</span> <b>' + f.out + '</b>　<span class="cat">' + catLabel(f.cat, false) + '</span>' +
            '<br><br>熔接后共可锁 <b>2</b> 条</p>';
  }
  applyResult(box, html);
}

/* ============================================================
   渲染：合计 / 状态 / 模式 / 熔接按钮
   ============================================================ */
function renderTotals(){
  const t = $('tTotal');  if (t) t.textContent = STATS.length;
  const p = $('tPick');
  if (p) p.textContent = calcMode === 'rev' ? (selectedOut ? 1 : 0) : selected.length;
  const sl = $('tPickSlash'), mx = $('tPickMax');
  if (sl) sl.style.display = calcMode === 'rev' ? 'none' : '';
  if (mx) mx.style.display = calcMode === 'rev' ? 'none' : '';
  const c = $('cStat');   if (c) c.textContent = STATS.length;
  const r = $('cRecipe'); if (r) r.textContent = FUSIONS.length;
  /* 顶部三个计数器都是「数据库总量」，不随 weaponCat 筛选变化。
     （此前这里用 outputList().length —— 那是按筛选过滤的，会变成 14，已修正为全量去重。）
     筛选后的数量看总计区的「显示」。 */
  const o = $('cOut');
  if (o){
    const seen = Object.create(null);
    let n = 0;
    FUSIONS.forEach(f => { if (!seen[f.out]){ seen[f.out] = 1; n++; } });
    o.textContent = n;
  }
}

function setStatus(text, alert){
  const el = $('statusText');
  if (el) el.textContent = text;
  if (el && el.parentNode) el.parentNode.classList.toggle('alert', !!alert);
}

/* 已经选了词条时，低调提醒极性开关的存在（教程进行中不重复提示） */
function renderStatusHint(){
  const el = $('statusHint');
  if (!el) return;
  el.hidden = coach.active || selected.length < 1 || calcMode === 'rev';
}

function renderStatus(){
  if (calcMode === 'rev'){
    setStatus(selectedOut
      ? '反查目标：' + selectedOut + ' · 右侧为全部配方'
      : '反向查询 · 选择 1 个融合词条，立即反查');
    return;
  }
  if (!fused){
    if (selected.length === 0) setStatus('就绪 · 选择两条词条后自动查询');
    else setStatus('已选：' + statById(selected[0].id).name + ' · 再选 1 条即自动查询');
    return;
  }
  setStatus(fused.out
    ? '熔接结果：' + fused.out.out
    : '这两条词条在当前武器类型下无法熔接', !fused.out);
}

function renderMode(){
  document.querySelectorAll('.action[data-mode]').forEach(b => {
    const on = b.dataset.mode === calcMode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const seam = $('seamLabel');
  if (seam) seam.textContent = calcMode === 'rev' ? '融合属性 · 可反查' : '裂罅词条';
  const legend = $('ciLegend');
  if (legend) legend.textContent = GROUP_NAME[ui.group];
}

function renderGroupIcons(){
  document.querySelectorAll('.ci').forEach(b => {
    const on = b.dataset.group === ui.group;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

/* Forward = 选择即查询：结果由当前状态推导，不再依赖任何确认按钮。
   极性也是推导输入之一 —— 所以切换 + / − 会立刻反映到结果上。
   查询本身仍然原样调用 findFusion()。 */
function syncQuery(){
  fused = (calcMode === 'fwd' && selected.length === 2)
    ? { a:{ id:selected[0].id, pol:selected[0].pol },
        b:{ id:selected[1].id, pol:selected[1].pol },
        out: findFusion(selected[0].id, selected[1].id) }
    : null;
}

function renderAll(){
  syncQuery();
  renderGrid();
  renderResult();
  renderTotals();
  renderStatus();
  renderStatusHint();
  renderMode();
  renderGroupIcons();
  coachSync();
}

/* ============================================================
   交互
   ============================================================ */
function toggleStat(id){
  const i = selected.findIndex(s => s.id === id);
  if (i >= 0) selected.splice(i, 1);
  else if (selected.length < 2) selected.push({ id: id, pol:'pos' });
  renderAll();                        // syncQuery 会按当前选择重算结果
  animRefresh();
}

function onCardClick(key, kind){
  if (kind === 'out'){
    selectedOut = (selectedOut === key) ? null : key;   // 反向：选中即查询
    renderAll();
    animResult();
    return;
  }
  if (selected.length >= 2 && !selected.some(s => s.id === key)){
    selected[1] = { id:key, pol:'pos' };                // 已满：新点击替换第二条
    renderAll(); animRefresh();
    return;
  }
  toggleStat(key);
}

/* 极性开关是常驻可点的真实控件。
   未选中的卡上点它 —— 等价于「选中这张卡，并把极性设成切换后的值」，
   这样任何状态下点 + / − 都有真实反馈，不会出现「看得见点不动」的死控件。 */
function onCardPol(key){
  const i = selected.findIndex(s => s.id === key);
  if (i >= 0){
    selected[i].pol = selected[i].pol === 'pos' ? 'neg' : 'pos';
  } else if (selected.length >= 2){
    selected[1] = { id:key, pol:'neg' };                // 已满：替换第二条
  } else {
    selected.push({ id:key, pol:'neg' });
  }
  renderAll();
  animRefresh();
}

function clearAll(){
  selected = [];
  selectedOut = null;
  ui.query = '';
  const si = $('searchInput');
  if (si) si.value = '';
  renderAll();
  animResult();
}

function resetView(){
  closePanel();
  selected = []; selectedOut = null;
  ui.query = ''; ui.group = 'all';
  const si = $('searchInput'); if (si) si.value = '';
  weaponCat = 'all';
  const sel = $('wpSelect'); if (sel) sel.value = 'all';
  calcMode = 'fwd';
  renderAll();
  animDeck();
}

/* ============================================================
   资料覆盖层：机制 / 规则 / 教程
   ============================================================ */
const DOC_MECH =
  '<div class="doc-grid">' +
    '<div class="doc-card">' +
      '<h3><svg viewBox="0 0 24 24"><use href="#i-rules"/></svg>属性锁定 <span class="doc-tag">已随《Narin 的冰刃》上线</span></h3>' +
      '<p>循环裂罅时<b>锁定 1 条属性</b>，它在循环中永不改变——这是玩家呼吁多年的功能。</p>' +
      '<ul><li>一次<b>只能锁 1 条</b>，锁哪条自己选</li>' +
      '<li>锁定 / 解锁<b>完全免费</b></li>' +
      '<li>但<b>带锁循环时赤毒消耗翻倍</b></li>' +
      '<li>关掉界面即失效，每次要重新锁</li>' +
      '<li>锁定时<b>属性数量被冻结</b>（3 正 1 负永远是 3 正 1 负）</li></ul>' +
    '</div>' +
    '<div class="doc-card">' +
      '<h3><svg viewBox="0 0 24 24"><use href="#i-riven"/></svg>裂罅熔接 <span class="doc-tag vio">随《冰川反抗》稍后上线</span></h3>' +
      '<p>用「裂罅熔接器」把紫卡上<b>两条词条熔成 1 条融合词条</b>，创造出洗不出来的新词条。</p>' +
      '<ul><li>组合<b>预先设定、固定不变</b>，熔接前必能预览结果</li>' +
      '<li>极性规则：一正一负 → 融合词条<b>负面</b>；两正 → 融合词条<b>正面</b></li>' +
      '<li>融合词条<b>默认锁定</b>，但不占用手动锁名额</li>' +
      '<li>融合后仍可<b>再手动锁 1 条</b> → 一张卡可锁 2 词条</li></ul>' +
    '</div>' +
  '</div>' +
  '<p class="doc-src">数据源：B 站开发者工坊《Narin 的冰刃》官方文章 · Warframe 官方论坛 Devshorts #115/#116 · 官方熔接表（所有武器 / 枪械 / 近战）· 中文维基 / 社区交叉验证。<br>' +
  '开发者工坊内容在正式上线前仍可能调整（官方声明 subject to change），请以游戏内实装为准。</p>';

const DOC_RULES = (function(){
  const items = [
    ['熔接后：2 条词条 → 1 条融合词条', '参与组合的两条词条被消耗，取而代之的是一条<b>融合词条</b>。极性：<b>一正一负 → 融合词条为负</b>；<b>两正 → 融合词条为正</b>。'],
    ['融合词条默认锁定，且不算「手动锁定」', '融合词条附着后<b>自动锁定、永不掉</b>（可主动移除后重熔），却<b>不让赤毒消耗翻倍</b>——这是白赚的一条锁。'],
    ['融合后可锁 2 词条', '融合词条（自动锁）+ 你再手动锁 1 条 = <b>一张卡洗点时同时锁住 2 条</b>，把最后 1–2 条洗到完美。'],
    ['熔接器：6 人高难本，一周 3 次', '裂罅熔接器仅产自新<b>6 人高难本</b>，<b>每周只能刷 3 次</b>，难度较高——极度稀缺，只投你真正要毕业的武器。'],
    ['融合词条洗不出来，只能熔', '循环（洗卡）<b>只能出基础词条</b>；融合词条不在循环池里。这也是它稀缺、值钱的原因。'],
  ];
  let h = '<div class="doc-list">';
  items.forEach((it, i) => {
    h += '<div class="doc-item"><div class="doc-num">0' + (i + 1) + '</div>' +
         '<div><h3>' + it[0] + '</h3><p>' + it[1] + '</p></div></div>';
  });
  h += '</div><div class="doc-note"><h3>熔接器一周只有 3 次机会，别浪费</h3>' +
       '<p>每次熔接前必能预览结果，所以动手前<b>先用查询台算清楚</b>：哪两条熔、熔出什么、极性是正是负，确认了再花熔接器。</p></div>';
  return h;
})();

const TUTORIAL = [
  { t:'第 1 步 · 先定目标再动手',
    b:'洗之前先想清楚三件事：<b>要几条词条</b>、<b>留不留无害负面</b>、<b>核心词条是哪一条</b>。目标不定，赤毒就是白烧。',
    tip:'推荐布局：2 正 1 负（正面数值系数最高 1.2375），或 3 正 1 负（最通用、容错高）。' },
  { t:'第 2 步 · 不锁自由洗，先把「数量」洗对',
    b:'先<b>不要锁定</b>，自由循环，只盯一件事：把<b>属性数量</b>洗到你要的布局（比如 2 正 1 负）。',
    tip:'⚠️ 锁定会冻结词条数量——想 2+1，就必须<b>在锁之前</b>先把数量洗出来。锁错就永远洗不回去了。' },
  { t:'第 3 步 · 出现 1 条满意词，立刻锁住',
    b:'一旦出现你<b>必留的核心词条</b>，马上锁它，再洗剩下的词条。带锁循环赤毒<b>翻倍</b>，但你会永远不丢这条词。',
    tip:'晚锁 = 反复整张重洗、赌它再现；早锁 = 永不丢失。只要出现 1 条满意词，早锁一定比晚锁省。' },
  { t:'第 4 步 · 用熔接器熔出稀缺属性',
    b:'熔接器把两条词条熔成一条<b>洗不出来的融合词条</b>（爆炸 / 病毒 / 异常状态伤害 / 弱点伤害 / 重击伤害……）。熔接前必能预览结果，先用查询台算好再动手。',
    tip:'熔接器产自新 6 人高难本，<b>一周只能刷 3 次</b>——极度稀缺，只投你真正要毕业的武器。' },
  { t:'第 5 步 · 融合词条 + 手动锁 = 锁 2 词条',
    b:'融合词条<b>默认锁定且不翻倍赤毒</b>，你还能<b>再手动锁 1 条</b>基础词条——等于同时锁住 2 条，却只付 1 条锁的翻倍成本。拿到可用的卡就见好就收：第 7 次循环起单次破 2000 赤毒，别上头。',
    tip:'剩下 1–2 条自由洗到完美即可。这是当前版本把卡推向毕业级、且最省赤毒的路线。' },
];

function guideHTML(){
  let h = '<div class="doc-progress">';
  TUTORIAL.forEach((_, i) => { h += '<i class="' + (i <= ui.guideIdx ? 'on' : '') + '"></i>'; });
  h += '</div><div class="doc-steps">';
  TUTORIAL.forEach((s, i) => {
    if (i !== ui.guideIdx) return;
    h += '<div class="doc-step"><div class="ds-cap">步骤 ' + (i + 1) + ' / ' + TUTORIAL.length + '</div>' +
         '<h3>' + s.t + '</h3><p>' + s.b + '</p>' +
         '<div class="ds-tip">' + s.tip + '</div></div>';
  });
  return h + '</div>';
}

function renderPanelFoot(){
  const foot = $('ovFoot');
  if (!foot) return;
  if (ui.panel !== 'guide'){ foot.innerHTML = ''; return; }
  foot.innerHTML =
    '<span class="ov-pos">步骤 ' + (ui.guideIdx + 1) + ' / ' + TUTORIAL.length + '</span>' +
    '<div class="ov-nav">' +
      '<button class="ov-btn" id="gPrev"' + (ui.guideIdx === 0 ? ' disabled' : '') + '>← 上一步</button>' +
      '<button class="ov-btn" id="gNext"' + (ui.guideIdx === TUTORIAL.length - 1 ? ' disabled' : '') + '>下一步 →</button>' +
    '</div>';
  const p = $('gPrev'), n = $('gNext');
  if (p) p.onclick = () => { if (ui.guideIdx > 0){ ui.guideIdx--; renderPanel(); } };
  if (n) n.onclick = () => { if (ui.guideIdx < TUTORIAL.length - 1){ ui.guideIdx++; renderPanel(); } };
}

function renderPanel(){
  const body = $('ovBody'), title = $('ovTitle'), cap = $('ovCap');
  if (!body) return;
  if (ui.panel === 'mech'){ if (cap) cap.textContent = '资料'; if (title) title.textContent = '新机制介绍'; body.innerHTML = DOC_MECH; }
  else if (ui.panel === 'rules'){ if (cap) cap.textContent = '资料'; if (title) title.textContent = '核心机制规则'; body.innerHTML = DOC_RULES; }
  else if (ui.panel === 'guide'){ if (cap) cap.textContent = '教程'; if (title) title.textContent = '洗卡教程 · 收益最大化'; body.innerHTML = guideHTML(); }
  renderPanelFoot();
}

function openPanel(name){
  ui.panel = name;
  if (name === 'guide') ui.guideIdx = 0;
  renderPanel();
  const ov = $('overlay');
  if (ov){ ov.hidden = false; animPanel(); }
}

function closePanel(){
  const ov = $('overlay');
  if (!ov || ov.hidden) return false;
  ov.hidden = true;
  ui.panel = null;
  return true;
}

/* ============================================================
   快速上手（首次使用教程 · Phase 3）
   叠加在真实界面之上，用真实交互走完一次
   「火焰伤害 ＋ 冰冻伤害 → 熔接 → 爆炸伤害」。
   教程本身不改业务：只驱动已有的 onCardClick / 选择与极性逻辑。
   ============================================================ */
const COACH_KEY = 'rivenFusionOnboardingDone';

const coach = {
  active:false,
  step:0,      // 0=封面 / 1=选第一条 / 2=选第二条 / 3=看结果（选满两条自动查询）
  el:null,     // 当前高亮目标
  subEl:null,  // 次级强调目标（极性 + / −）
  snapshot:null,
  mem:false,   // localStorage 不可用时的兜底
};

function coachSeen(){
  try { return localStorage.getItem(COACH_KEY) === 'true'; } catch (e) { return coach.mem; }
}
function coachMarkSeen(){
  coach.mem = true;
  try { localStorage.setItem(COACH_KEY, 'true'); } catch (e) {}
}

function coachChip(id){
  const s = statById(id);
  return '<span class="ct"><svg viewBox="0 0 24 24"><use href="' +
         groupIcon(groupOfStat(id)) + '"/></svg>' + s.name + '</span>';
}

const COACH_TEXT = {
  '0': { step:'', title:'快速上手',
         body:'这里可以查询裂罅熔接配方。<br><br>' +
              '<b>已知两个词条</b> —— 查它们能熔出什么。<br>' +
              '<b>已知一个目标词条</b> —— 查怎么熔出它。',
         next:'开始' },
  '1': { step:'步骤 1 / 3', title:'选择第一个词条',
         body:'先选择你手里的第一条词条。' + coachChip('heat') +
              '<div class="csub">注意极性</div>' +
              '卡片右上角的 <b>＋ / −</b> 可以切换词条的正负极性。<br>' +
              '<b>极性会影响熔接后融合词条的正负。</b>' +
              '<div class="cwait">点击高亮的这张卡（或先点右上角的 ＋ / −）</div>',
         next:'' },
  '2': { step:'步骤 2 / 3', title:'选择第二个词条',
         body:'再选择第二条词条。' + coachChip('cold') +
              '<br>两条词条都可以<b>分别调整自己的极性</b>（卡片右上角 ＋ / −）。' +
              '<br><b>选满两条后会自动查询</b>，不需要再点任何按钮。' +
              '<div class="cwait">点击高亮的这张卡</div>',
         next:'' },
  '3': { step:'步骤 3 / 3', title:'查看熔接结果',
         body:'选择两个词条后，<b>系统会立即显示</b>对应的融合结果。' +
              '<br><br>如果改变任意一个词条的 <b>＋ / −</b> 极性，<b>结果也会立即更新</b>。' +
              '<br><br>如果你知道自己想得到什么词条：切换到 <b>反向查询</b>，' +
              '直接选择目标词条，即可查看所有可以得到它的配方。',
         next:'完成' },
};

function coachKey(){ return String(coach.step); }

function coachTarget(){
  if (coach.step === 1) return document.querySelector('.mod-card[data-key="heat"]');
  if (coach.step === 2) return document.querySelector('.mod-card[data-key="cold"]');
  if (coach.step === 3) return $('resultPane');
  return null;
}

/* 次级强调目标：本步要顺带讲清楚的控件（极性 + / −） */
function coachSubTarget(){
  if (coach.step === 1) return document.querySelector('.mod-card[data-key="heat"] .mc-pol');
  if (coach.step === 2) return document.querySelector('.mod-card[data-key="cold"] .mc-pol');
  return null;
}

const C_PAD = 6, C_GAP = 14, C_MARGIN = 10, C_SUB_PAD = 4;

function coachLayout(){
  const card = $('coachCard'), ring = $('coachRing'), mask = $('coachMask');
  if (!coach.active || !card || !mask) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const el = coach.el;

  let x = 0, y = 0, w = 0, h = 0;
  if (el){
    const r = el.getBoundingClientRect();
    x = r.left - C_PAD; y = r.top - C_PAD;
    w = r.width + C_PAD * 2; h = r.height + C_PAD * 2;
  }

  /* 四片遮罩：只压暗高亮区之外 */
  const t = Math.max(0, y), bTop = y + h;
  const m = mask.children;
  m[0].style.cssText = 'left:0;top:0;width:100%;height:' + t + 'px';
  m[1].style.cssText = 'left:0;top:' + bTop + 'px;width:100%;height:' + Math.max(0, vh - bTop) + 'px';
  m[2].style.cssText = 'left:0;top:' + t + 'px;width:' + Math.max(0, x) + 'px;height:' + h + 'px';
  m[3].style.cssText = 'left:' + (x + w) + 'px;top:' + t + 'px;width:' +
                       Math.max(0, vw - (x + w)) + 'px;height:' + h + 'px';

  /* 高亮圈 */
  if (el){
    ring.classList.remove('off');
    ring.style.left = x + 'px'; ring.style.top = y + 'px';
    ring.style.width = w + 'px'; ring.style.height = h + 'px';
  } else {
    ring.classList.add('off');
  }

  /* 次级强调圈：指着真实的 + / − 控件 */
  const ring2 = $('coachRing2'), sub = coach.subEl;
  if (ring2){
    if (sub){
      const sr = sub.getBoundingClientRect();
      ring2.classList.remove('off');
      ring2.style.left = (sr.left - C_SUB_PAD) + 'px';
      ring2.style.top = (sr.top - C_SUB_PAD) + 'px';
      ring2.style.width = (sr.width + C_SUB_PAD * 2) + 'px';
      ring2.style.height = (sr.height + C_SUB_PAD * 2) + 'px';
    } else {
      ring2.classList.add('off');
    }
  }

  /* 说明框：优先放目标下方，放不下改上方，再放不下改左右 */
  const cw = card.offsetWidth || 300, ch = card.offsetHeight || 150;
  card.classList.remove('arrow-t', 'arrow-b', 'arrow-l', 'arrow-r');
  const arrow = $('coachArrow');
  arrow.style.cssText = '';
  let cx, cy, dir = '';

  if (!el){
    cx = Math.max(C_MARGIN, (vw - cw) / 2);
    cy = Math.max(C_MARGIN, (vh - ch) / 2);
  } else {
    const belowOK = y + h + C_GAP + ch <= vh - C_MARGIN;
    const aboveOK = y - C_GAP - ch >= C_MARGIN;
    if (belowOK){ cy = y + h + C_GAP; dir = 't'; }
    else if (aboveOK){ cy = y - C_GAP - ch; dir = 'b'; }
    else {
      cy = Math.min(Math.max(y, C_MARGIN), Math.max(C_MARGIN, vh - C_MARGIN - ch));
      dir = (x + w + C_GAP + cw <= vw - C_MARGIN) ? 'l' : 'r';
    }
    if (dir === 'l') cx = x + w + C_GAP;
    else if (dir === 'r') cx = x - C_GAP - cw;
    else cx = Math.min(Math.max(x + w / 2 - cw / 2, C_MARGIN), Math.max(C_MARGIN, vw - C_MARGIN - cw));
    card.classList.add('arrow-' + dir);

    const tcx = x + w / 2, tcy = y + h / 2;
    if (dir === 't' || dir === 'b'){
      arrow.style.left = Math.min(Math.max(tcx - cx - 5, 12), Math.max(12, cw - 22)) + 'px';
      arrow.style.top = (dir === 't' ? -5 : ch - 5) + 'px';
    } else {
      arrow.style.top = Math.min(Math.max(tcy - cy - 5, 12), Math.max(12, ch - 22)) + 'px';
      arrow.style.left = (dir === 'l' ? -5 : cw - 5) + 'px';
    }
  }
  card.style.left = Math.round(cx) + 'px';
  card.style.top = Math.round(cy) + 'px';
}

function coachRender(){
  const t = COACH_TEXT[coachKey()];
  if (!t) return;
  $('coachStep').textContent = t.step || '';
  $('coachTitle').textContent = t.title;
  $('coachBody').innerHTML = t.body;
  const next = $('coachNext');
  next.textContent = t.next || '下一步';
  next.hidden = !t.next;
  const gl = $('coachGuide');
  if (gl) gl.hidden = coachKey() !== '3';

  coach.el = coachTarget();
  coach.subEl = coachSubTarget();
  renderStatusHint();
  if (coach.el && coach.el.scrollIntoView){
    try { coach.el.scrollIntoView({ block:'nearest', inline:'nearest' }); } catch (e) {}
  }
  coachLayout();
  animCoach();
  coachFocus();
}

/* 教程是会话式浮层：打开/换步后把焦点移进来，键盘用户不必 Tab 几十次 */
function coachFocus(){
  const card = $('coachCard');
  if (!card) return;
  const next = $('coachNext');
  /* 有主按钮（封面 / 末步）→ 焦点给主按钮；
     步骤 1/2 → 焦点给高亮目标，这样 Enter 就是一次真实点击 */
  const target = (next && !next.hidden) ? next : (coach.el || $('coachSkip'));
  if (target && target.focus) { try { target.focus({ preventScroll:true }); } catch (e) { target.focus(); } }
}

/* 焦点留在说明框内循环（教程期间是模态引导） */
function coachTrapTab(e){
  const card = $('coachCard');
  if (!card) return false;
  /* 高亮目标本身也是本步骤的交互点，一并纳入循环 */
  const f = [];
  if (coach.el && coach.el.focus) f.push(coach.el);
  Array.prototype.forEach.call(
    card.querySelectorAll('button:not([hidden]):not([disabled])'), b => f.push(b));
  if (!f.length) return false;
  /* 始终接管 Tab：只在「本步高亮目标 + 说明框按钮」之间循环。
     这样键盘用户 1 次 Tab 就能从目标走到「跳过」，不会先穿过整片网格。 */
  const i = f.indexOf(document.activeElement);
  const n = e.shiftKey
    ? (i <= 0 ? f.length - 1 : i - 1)
    : (i < 0 || i === f.length - 1 ? 0 : i + 1);
  f[n].focus();
  return true;
}

function coachGo(step){
  coach.step = step;
  coachRender();
}

/* 教程唯一的「推进」入口：要么走真实点击，要么由 Enter 触发同一个真实点击 */
function coachAdvance(){
  if (!coach.active) return;
  if (coach.step === 0){ coachGo(1); return; }
  if (coach.step === 3){ coachExit(true); return; }
  if (coach.el && coach.el.click) coach.el.click();
}

function coachStart(){
  if (coach.active) return;
  closePanel();
  /* 快照当前业务状态：中途退出时原样还原 */
  coach.snapshot = {
    selected: JSON.parse(JSON.stringify(selected)),
    selectedOut: selectedOut,
    fused: fused ? JSON.parse(JSON.stringify(fused)) : null,
    weaponCat: weaponCat, calcMode: calcMode,
    group: ui.group, query: ui.query,
  };
  /* 归零，保证高亮目标一定存在且可点 */
  selected = []; selectedOut = null;
  weaponCat = 'all'; calcMode = 'fwd'; ui.group = 'all'; ui.query = '';
  const si = $('searchInput'); if (si) si.value = '';
  const ws = $('wpSelect'); if (ws) ws.value = 'all';
  renderAll();

  coach.active = true;
  coach.step = 0;
  $('coach').hidden = false;
  coachRender();
}

function coachExit(keepResult){
  if (!coach.active) return;
  coach.active = false;
  $('coach').hidden = true;
  if (!keepResult && coach.snapshot){
    selected = coach.snapshot.selected;
    selectedOut = coach.snapshot.selectedOut;
    fused = coach.snapshot.fused;
    weaponCat = coach.snapshot.weaponCat;
    calcMode = coach.snapshot.calcMode;
    ui.group = coach.snapshot.group;
    ui.query = coach.snapshot.query;
    const si = $('searchInput'); if (si) si.value = ui.query || '';
    const ws = $('wpSelect'); if (ws) ws.value = weaponCat;
  }
  coach.snapshot = null;
  coach.el = null;
  coach.subEl = null;
  renderAll();
  coachMarkSeen();
  const back = document.querySelector('.action[data-coach]');
  if (back && back.focus) { try { back.focus({ preventScroll:true }); } catch (err) {} }
}

/* 教程推进改为「看状态」而不是「听事件」：
   这样无论用户是点卡片本体、还是点右上角的 ＋ / − 把卡片选上，都能正确前进。 */
function coachSync(){
  if (!coach.active) return;
  const has = id => selected.some(s => s.id === id);
  if (coach.step === 1 && has('heat')){ coachGo(2); return; }
  if (coach.step === 2 && has('cold') && selected.length === 2){ coachGo(3); }
}

function coachKeydown(e){
  if (!coach.active) return false;
  if (e.key === 'Escape'){ coachExit(false); return true; }
  if (e.key === 'Tab'){
    if (coachTrapTab(e)) e.preventDefault();   // 只在需要回环时接管默认行为
    return true;
  }
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar'){
    const t = e.target;
    /* 焦点已经在真实控件上（说明框按钮 / 高亮卡片）时：
       交给原本的激活逻辑处理，这里只负责拦掉全局快捷键。
       否则会出现「按键被处理两次」—— 最坑的是按钮切步骤后被 hidden，
       原生 click 会落到接手焦点的那个元素上（例如「跳过」），把教程误关掉。 */
    if (t && t.closest && t.closest('button')) return true;   // 真按钮：原生激活即可
    if (e.key === 'Enter'){ coachAdvance(); return true; }    // 高亮卡片等：走一次真实点击
    return true;
  }
  return false;
}

function bindCoach(){
  document.querySelectorAll('.action[data-coach]').forEach(b => {
    b.onclick = () => coachStart();
  });
  const sk = $('coachSkip'); if (sk) sk.onclick = () => coachExit(false);
  const nx = $('coachNext'); if (nx) nx.onclick = coachAdvance;
  const gl = $('coachGuide');
  if (gl) gl.onclick = () => { coachExit(true); openPanel('guide'); };
  window.addEventListener('resize', () => { if (coach.active) coachLayout(); });
}

/* ============================================================
   动效（GSAP 只是加成；无 GSAP 时静态界面完全可用）
   ============================================================ */
const hasGSAP = typeof gsap !== 'undefined';

function animDeck(){
  if (!hasGSAP) return;
  gsap.fromTo('.topbar, .actionbar, .seam, .filterbar, .bottombar',
    { opacity:0, y:-10 }, { opacity:1, y:0, duration:.5, stagger:.05, ease:'power2.out' });
}
function animGrid(){
  if (!hasGSAP) return;
  const cards = document.querySelectorAll('.mod-card:not(.ghost)');
  if (!cards.length) return;
  gsap.fromTo(cards, { opacity:0, y:12, scale:.96 },
    { opacity:1, y:0, scale:1, duration:.32, stagger:.01, ease:'power2.out', overwrite:'auto' });
}
function animRefresh(){
  if (!hasGSAP) return;
  gsap.fromTo('.mod-card.sel', { scale:.95 }, { scale:1, duration:.26, ease:'back.out(1.6)', overwrite:'auto' });
}
function animResult(){
  if (!hasGSAP) return;
  const c = document.querySelector('.rs-card');
  const m = document.querySelector('.rs-meta');
  if (c) gsap.fromTo(c, { opacity:.3, scale:.96 }, { opacity:1, scale:1, duration:.3, ease:'power2.out', overwrite:'auto' });
  if (m) gsap.fromTo(m, { opacity:0, y:7 }, { opacity:1, y:0, duration:.26, delay:.05, ease:'power2.out', overwrite:'auto' });
}
function animPanel(){
  if (!hasGSAP) return;
  gsap.fromTo('.overlay-box', { opacity:0, y:18, scale:.985 }, { opacity:1, y:0, scale:1, duration:.32, ease:'power2.out' });
}
function animCoach(){
  if (!hasGSAP) return;
  const c = document.querySelector('.coach-card');
  if (!c) return;
  gsap.fromTo(c, { opacity:.35, y:7 }, { opacity:1, y:0, duration:.3, ease:'power2.out', overwrite:'auto' });
}

/* ============================================================
   启动
   ============================================================ */
function bindEvents(){
  const grid = $('modGrid');
  if (grid){
    grid.addEventListener('click', e => {
      const pol = e.target.closest('.mc-pol');
      const card = e.target.closest('.mod-card');
      if (!card || card.classList.contains('ghost')) return;
      if (pol){ e.stopPropagation(); onCardPol(card.dataset.key); return; }
      onCardClick(card.dataset.key, card.dataset.kind);
    });
    /* 卡片是 div[role=option]：手动补上 Enter / Space 的键盘等价操作 */
    grid.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      const el = e.target;
      if (!el || !el.closest) return;
      if (coach.active) return;                     // 教程期间交给教练层统一处理
      if (el.closest('.mc-pol')){                   // 极性是真 <button>：原生 click 自己会触发
        e.stopPropagation();
        return;
      }
      const card = el.closest('.mod-card');
      if (!card || card.classList.contains('ghost')) return;
      e.preventDefault();
      onCardClick(card.dataset.key, card.dataset.kind);
    });
  }


  const si = $('searchInput');
  if (si) si.addEventListener('input', () => { ui.query = si.value; renderGrid(); animGrid(); });

  document.querySelectorAll('.ci').forEach(b => {
    b.onclick = () => { ui.group = b.dataset.group; renderAll(); animGrid(); };
  });

  const wp = $('wpSelect');
  if (wp) wp.onchange = () => {
    weaponCat = wp.value; selected = []; selectedOut = null;
    renderAll(); animGrid();
  };

  document.querySelectorAll('.action[data-mode]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.mode === calcMode) return;
      calcMode = b.dataset.mode;
      selected = []; selectedOut = null;
      renderAll(); animGrid(); animResult();
    };
  });
  document.querySelectorAll('.action[data-panel]').forEach(b => {
    b.onclick = () => openPanel(b.dataset.panel);
  });

  const cb = $('clearBtn'); if (cb) cb.onclick = clearAll;

  const oc = $('ovClose'); if (oc) oc.onclick = closePanel;
  const ov = $('overlay');
  if (ov) ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });

  document.addEventListener('keydown', e => {
    if (coachKeydown(e)) return;                 // 快速上手期间：Esc 退出 / Enter 确认
    if (coach.active) return;                    // 教程期间全局快捷键让位（含原生按钮自身的 Enter）
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){
      if (e.key === 'Escape') e.target.blur();     // Enter 不再触发查询（无确认按钮）
      return;
    }
    if (e.key === 'Escape'){ if (!closePanel()) resetView(); return; }
  });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => padGrid($('modGrid')), 140);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  [renderAll, bindEvents, bindCoach, animDeck].forEach(fn => {
    try { fn(); } catch (err) { console.error('[riven-fusion] init step failed:', fn.name, err); }
  });
  animGrid();
  /* 首次访问自动进入「快速上手」；已看过就不再弹（localStorage 标记） */
  if (!coachSeen()){
    setTimeout(() => { try { coachStart(); } catch (err) { console.error('[riven-fusion] coach failed:', err); } }, 520);
  }
});
