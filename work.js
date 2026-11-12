
/* SHAKE / SHIFT — オリジナル7日間シェイカーゲーム */
(() => {
  'use strict';

  const SAVE_KEY = 'shake-shift-4-files-v1';
  const TARGET = { protein: 150, fat: 75, carbs: 340 };
  const LEVELS = ['なし', '少なめ', '普通', '多め'];
  const SUPPS = [
    { id: 'protein', name: 'プロテイン', en: 'WHEY PROTEIN', icon: 'P', color: '#e7c89e', use: '筋肉づくりの材料' },
    { id: 'creatine', name: 'クレアチン', en: 'CREATINE', icon: '⚡', color: '#a9bdf4', use: 'パワーをサポート' },
    { id: 'arginine', name: 'アルギニン', en: 'ARGININE', icon: '↗', color: '#f8a692', use: 'パンプ感に注目' },
    { id: 'citrulline', name: 'シトルリン', en: 'CITRULLINE', icon: '∿', color: '#9fddcf', use: 'コンディションを調整' },
    { id: 'eaa', name: 'EAA', en: 'ESSENTIAL AMINO', icon: '✳', color: '#e6df8c', use: 'リカバリーを補助' },
    { id: 'malto', name: 'マルトデキストリン', en: 'MALTODEXTRIN', icon: 'M', color: '#d7b5df', use: 'エネルギーを補給' }
  ];
  const FALLBACK = [
    [1, '脚の日', 94, 59, 268, 7.5, 29, 'タンパク質とエネルギーが少し不足気味の日。'],
    [2, '胸の日', 167, 86, 251, 6.4, 51, '脂質は多めで炭水化物が不足している日。'],
    [3, '背中の日', 113, 68, 375, 5.2, 73, '炭水化物は十分だけど睡眠不足で疲れが残っている日。'],
    [4, '肩の日', 151, 64, 321, 8.1, 31, '食事と睡眠が比較的整ったコンディションの良い日。'],
    [5, '腕の日', 78, 91, 218, 5.8, 76, '忙しくて食事が乱れた栄養不足気味の日。'],
    [6, '全身の日', 174, 67, 365, 7.8, 38, '食事はしっかり摂れたので疲労とのバランスがカギの日。'],
    [7, '最終トレーニング', 121, 72, 292, 6.8, 58, 'これまでの疲労を考えて最後の一杯を決める日。']
  ];
  const fromArray = r => ({ day: +r[0], training: r[1], protein: +r[2], fat: +r[3], carbs: +r[4], sleep: +r[5], fatigue: +r[6], story: r[7] });
  let days = FALLBACK.map(fromArray);
  let timers = [];
  let toastTimer;
  const app = document.querySelector('#app');
  const dayNav = document.querySelector('#dayNav');
  const toast = document.querySelector('#toast');
  const restartBtn = document.querySelector('#restartBtn');
  const emptyMix = () => Object.fromEntries(SUPPS.map(s => [s.id, 0]));
  const fresh = () => ({ day: 1, phase: 'night', muscle: 100, fatigue: 29, mix: emptyMix(), history: [], result: null });
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let state = load();

  function load() {
    try {
      const old = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (old && Number.isInteger(old.day) && old.day >= 1 && old.day <= 7 &&
          Array.isArray(old.history) && old.mix && Number.isFinite(old.muscle)) {
        const phase = ['mixing', 'gym', 'sleep'].includes(old.phase) ? 'morning' : old.phase;
        return { ...fresh(), ...old, phase,
          mix: Object.fromEntries(SUPPS.map(s => [s.id, clamp(Number(old.mix[s.id]) || 0, 0, 3)])) };
      }
    } catch (err) { console.warn('保存データを読み込めませんでした', err); }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (err) { console.warn(err); }
  }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, delay) { timers.push(setTimeout(fn, delay)); }
  function tell(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
  }
  function dayInfo() { return days[state.day - 1]; }
  function totalMix() { return SUPPS.reduce((sum, s) => sum + state.mix[s.id], 0); }
  function calorie(d) { return d.protein * 4 + d.fat * 9 + d.carbs * 4; }
  function percent(n, goal) { return clamp(Math.round(n / goal * 100), 0, 100); }
  function nice(n) { return Math.round(n).toLocaleString('ja-JP'); }

  async function loadCsv() {
    try {
      const response = await fetch('work.csv', { cache: 'no-store' });
      if (!response.ok) throw Error('CSVが見つかりません');
      const lines = (await response.text()).replace(/\r/g, '').trim().split('\n');
      const rows = lines.slice(1).filter(Boolean).map(line => fromArray(line.split(',')));
      if (rows.length === 7 && rows.every((d, i) => d.day === i + 1 && Number.isFinite(d.protein))) days = rows;
    } catch (err) {
      // ファイルをダブルクリックで開いても遊べるよう、同じ内容の予備データを利用。
      console.info('work.csvを取得できない環境のため、内蔵データで開始します。');
    }
    if (state.day === 1 && state.history.length === 0) state.fatigue = days[0].fatigue;
    render();
  }

  function header(eyebrow, first, accent, desc) {
    return `<div class="chapter"><div><div class="eyebrow">✳ DAY ${String(state.day).padStart(2, '0')} / 07 · ${eyebrow}</div><h1>${first}<em>${accent}</em></h1><p>${desc}</p></div><span class="chapter-no">${String(state.day).padStart(2, '0')}</span></div>`;
  }
  function renderNav() {
    dayNav.innerHTML = Array.from({ length: 7 }, (_, i) => `<span class="day-dot ${i < state.history.length ? 'done' : ''} ${state.phase !== 'final' && i === state.day - 1 ? 'active' : ''}" title="DAY ${i + 1}">${i + 1}</span>`).join('');
  }
  function render() {
    clearTimers();
    renderNav();
    if (state.phase === 'night') renderNight();
    else if (state.phase === 'mix') renderMix();
    else if (state.phase === 'morning') renderMorning();
    else if (state.phase === 'final') renderFinal();
    else renderScene(state.phase);
    window.scrollTo(0, 0);
  }

  function macro(name, value, target, color) {
    return `<div class="macro"><div class="macro-head"><b><i style="background:${color}"></i>${name}</b><span>${value} <small>/ ${target} g</small></span></div><div class="track"><span style="width:${percent(value, target)}%;background:${color}"></span></div></div>`;
  }
  function renderNight() {
    const d = dayInfo();
    const targetCalories = calorie(TARGET);
    const kcal = calorie(d);
    const diff = targetCalories - kcal;
    app.innerHTML = `${header('NIGHT REPORT · 21:00', '今日のカラダを、', '読み解け。', '食事と疲労を確認して、今夜たった1杯の配合を考えよう。')}
      <section class="night-layout">
        <article class="panel food-panel"><div class="panel-top"><h2>今日の栄養バランス</h2><span>FOOD LOG / TODAY</span></div>
          <div class="cal-overview"><div class="cal-circle" style="--p:${percent(kcal, targetCalories)}%"><div><strong>${percent(kcal, targetCalories)}%</strong><small>達成率</small></div></div>
          <div><small class="eyebrow muted">TOTAL CALORIES</small><div class="big-number">${nice(kcal)}<small> kcal</small></div><p>目標 ${nice(targetCalories)} kcal<br>${diff >= 0 ? `あと ${nice(diff)} kcal` : `${nice(-diff)} kcal オーバー`}</p></div></div>
          ${macro('タンパク質', d.protein, TARGET.protein, '#8ba3ef')}
          ${macro('脂質', d.fat, TARGET.fat, '#eda16c')}
          ${macro('炭水化物', d.carbs, TARGET.carbs, '#87c6a2')}
        </article>
        <article class="panel status-panel"><div class="panel-top"><h2>コンディション</h2><span>BODY MONITOR</span></div>
          <div class="eyebrow muted">FATIGUE LEVEL</div><div class="fatigue-number">${Math.round(state.fatigue)}<small>/100</small></div>
          <div class="fatigue-track"><span style="width:${state.fatigue}%;background:${state.fatigue >= 65 ? '#fa8967' : '#a4bd72'}"></span></div>
          <p class="status-message">${state.fatigue >= 68 ? '疲労がかなり高い。今夜の配合は慎重に。' : state.fatigue >= 47 ? '少し疲れが残っている。バランスを考えよう。' : 'コンディションは良好。配合で差がつく！'}</p>
          <dl class="status-rows"><div><dt>今日のメニュー</dt><dd>${d.training}</dd></div><div><dt>昨夜の睡眠</dt><dd>${d.sleep.toFixed(1)} h</dd></div><div><dt>現在の筋肉</dt><dd>${Math.round(state.muscle)} pt</dd></div><div><dt>今日の食事</dt><dd>${d.story}</dd></div></dl>
        </article>
        <aside class="coach"><div class="coach-star">✳</div><h2>ONE<br><em>SHAKE.</em><br>ONE SHOT.</h2><p>1日1回だけ。今日の数字を頼りにベストな一杯を選ぼう。</p><button class="btn dark" id="openMix">調合をはじめる <span>↗</span></button></aside>
      </section><p class="bottom-note">✳ 大切なのは「全部多め」ではなく、食事・疲労・睡眠に合わせた調合。</p>`;
    document.querySelector('#openMix').addEventListener('click', () => { state.phase = 'mix'; save(); render(); });
  }

  function shakerHTML() {
    return `<div class="shaker" id="shaker"><div class="shaker-cap"></div><div class="shaker-neck"></div><div class="shaker-glass"><div class="shaker-water"></div><div class="powder-stack" id="powderStack"></div><div class="measurements"><span>300</span><span>200</span><span>100</span></div><div class="shaker-print">SHAKE<br>/ SHIFT</div></div><div class="shaker-bottom"></div></div>`;
  }
  function ingredient(s, idx) {
    const count = state.mix[s.id];
    return `<article class="ingredient ${count ? 'selected' : ''}" data-card="${s.id}" style="--accent:${s.color}">
      <button type="button" class="ingredient-add" data-add="${s.id}" aria-label="${s.name}を追加。現在${LEVELS[count]}">
        <div class="ing-top"><span class="ing-symbol">${s.icon}</span><small>ITEM ${String(idx + 1).padStart(2, '0')}</small></div>
        <h3>${s.name}</h3><p class="ing-en">${s.en}</p><p class="ing-use">${s.use}</p>
        <div class="ing-bottom"><div class="ing-bars">${[1, 2, 3].map(n => `<span class="${count >= n ? 'on' : ''}"></span>`).join('')}</div><b class="level">${LEVELS[count]} ${count}/3</b></div>
      </button><button type="button" class="ingredient-minus" data-minus="${s.id}" ${count === 0 ? 'disabled' : ''} aria-label="${s.name}を1段階減らす">−</button>
    </article>`;
  }
  function renderMix() {
    const d = dayInfo();
    app.innerHTML = `${header('MIX STATION · 21:05', 'その一杯で、', '変えていけ。', 'サプリのカードを押すたびに「少なめ → 普通 → 多め」と増える。')}
      <section class="mix-layout"><div class="mix-side">
        <div class="snapshot"><span>⚑ 疲労 ${Math.round(state.fatigue)}%</span><span>P ${d.protein}/${TARGET.protein}g</span><span>F ${d.fat}/${TARGET.fat}g</span><span>C ${d.carbs}/${TARGET.carbs}g</span></div>
        <div class="shaker-stage"><div class="stage-top">YOUR MIX / LIVE PREVIEW</div><div class="stage-seal">ONE<br>CUP<br>ONLY</div><div class="halo"></div><div class="stage-floor"></div>${shakerHTML()}<div class="stage-foot" id="totalLabel">TOTAL 0 CLICKS</div></div>
        <div class="recipe"><div class="recipe-top"><strong>現在のレシピ</strong><b id="mixCount">0 CLICKS</b></div><div class="recipe-list" id="recipeList">まだ何も入っていません。</div></div>
        <div class="mix-buttons"><button class="btn outline" id="clearMix">↺ クリア</button><button class="btn dark" id="drink" disabled>これで飲む！ <span>↗</span></button></div>
      </div><div class="items-side"><div class="items-heading"><h2>THE INGREDIENTS <em>✳</em></h2><small>TAP TO ADD / − TO REMOVE</small></div><div class="ingredient-grid" id="ingredientGrid">${SUPPS.map(ingredient).join('')}</div><p class="guide">クリック1回＝少なめ、2回＝普通、3回＝多め。各サプリは最大3回まで。「−」で1段階戻せるよ。</p></div></section>`;
    document.querySelector('#ingredientGrid').addEventListener('click', e => {
      const plus = e.target.closest('[data-add]');
      const minus = e.target.closest('[data-minus]');
      if (plus) changeMix(plus.dataset.add, 1);
      if (minus) changeMix(minus.dataset.minus, -1);
    });
    document.querySelector('#clearMix').addEventListener('click', () => {
      state.mix = emptyMix(); refreshMix(); save(); tell('シェイカーを空にしました');
    });
    document.querySelector('#drink').addEventListener('click', drink);
    refreshMix();
  }
  function changeMix(id, increment) {
    if (!(id in state.mix)) return;
    const current = state.mix[id];
    const next = clamp(current + increment, 0, 3);
    if (current === next) { tell(increment > 0 ? '最大3回まで！' : 'これ以上は減らせません'); return; }
    state.mix[id] = next;
    refreshMix(); save();
    if (increment > 0) dropPowder(SUPPS.find(s => s.id === id).color);
  }
  function dropPowder(color) {
    const shaker = document.querySelector('#shaker');
    if (!shaker) return;
    for (let i = 0; i < 13; i++) {
      const p = document.createElement('i');
      p.className = 'particle';
      p.style.cssText = `--color:${color};--spread:${(Math.random() - .5) * 130}px;--delay:${Math.random() * .13}s;left:${42 + Math.random() * 16}%`;
      shaker.append(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }
  function refreshMix() {
    SUPPS.forEach(s => {
      const card = document.querySelector(`[data-card="${s.id}"]`);
      if (!card) return;
      const n = state.mix[s.id];
      card.classList.toggle('selected', n > 0);
      card.querySelector('.level').textContent = `${LEVELS[n]} ${n}/3`;
      card.querySelector('.ingredient-add').setAttribute('aria-label', `${s.name}を追加。現在${LEVELS[n]}`);
      card.querySelectorAll('.ing-bars span').forEach((bar, i) => bar.classList.toggle('on', i < n));
      card.querySelector('.ingredient-minus').disabled = n === 0;
    });
    const total = totalMix();
    document.querySelector('#mixCount').textContent = `${total} CLICKS`;
    document.querySelector('#totalLabel').textContent = `TOTAL ${total} CLICKS · LIVE MIX`;
    document.querySelector('#drink').disabled = total === 0;
    const selected = SUPPS.filter(s => state.mix[s.id]);
    document.querySelector('#recipeList').innerHTML = selected.length ? selected.map(s =>
      `<span class="recipe-tag" style="background:${s.color}">${s.name} · ${LEVELS[state.mix[s.id]]}</span>`).join('') : 'まだ何も入っていません。';
    const layers = [];
    SUPPS.forEach(s => { for (let i = 0; i < state.mix[s.id]; i++) layers.push(s.color); });
    document.querySelector('#powderStack').innerHTML = layers.map((color, i) =>
      `<span class="powder-layer" style="background:${color};bottom:${i * 4.5}%;height:4.8%"></span>`).join('');
  }

  // ここから先は、医学的判断ではなく架空のゲーム得点計算。
  function idealMix(d, fatigue) {
    return {
      protein: d.protein < 85 ? 3 : d.protein < 115 ? 2 : d.protein < 145 ? 1 : 0,
      creatine: 1,      
      arginine: fatigue < 48 && d.carbs >= 300 ? 1 : 0,
      citrulline: fatigue < 55 && d.carbs >= 295 ? 1 : 0,
      eaa: fatigue >= 68 ? 2 : fatigue >= 48 ? 1 : 0,
      malto: d.carbs < 235 ? 3 : d.carbs < 290 ? 2 : d.carbs < 325 ? 1 : 0
    };
  }
  
function evaluate() {
  const d = dayInfo();
  const ideal = idealMix(d, state.fatigue);
  const total = totalMix();

  const mismatch = SUPPS.reduce((sum, s) =>
    sum + Math.abs(state.mix[s.id] - ideal[s.id]), 0);

  const excess = Math.max(0, total - 9);

  // ゲーム独自の配合評価
  const score = 16 - mismatch * 1.6 - excess * 3;

  let delta = score >= 14 ? 10
    : score >= 11 ? 7
    : score >= 8 ? 4
    : score >= 5 ? 2
    : score >= 2 ? 0
    : score >= -3 ? -3 : -6;

  // 睡眠不足や疲労が高い日は成長幅を制限
  if (d.sleep < 6 && delta > 4) delta = 4;
  if (state.fatigue >= 80 && delta > 4) delta = 4;

  const before = state.muscle;

  state.muscle = clamp(before + delta, 65, 170);
  delta = state.muscle - before;

  const rank = score >= 14 ? 'PERFECT MIX'
    : score >= 11 ? 'GREAT MIX'
    : score >= 8 ? 'GOOD MIX'
    : score >= 5 ? 'NICE TRY'
    : score >= 2 ? 'JUST OK' : 'BAD MIX';

  const reason = excess >= 3
    ? '粉を入れすぎてバランスが崩れた！ 次は必要なものを絞ってみよう。'
    : delta >= 7
      ? '大成功！ 今日のコンディションと配合がぴったり合った。'
      : delta > 0
        ? '筋肉が成長した！ さらに良い配合も見つけられそう。'
        : delta === 0
          ? '筋肉をキープ！ 次はおすすめ配合との違いをチェック。'
          : '今回は相性が悪かった。下の答えを参考に次の日へ進もう。';

  const afterFatigue = clamp(
    state.fatigue * .34 + 28
    + Math.max(0, 8 - score) * 1.4
    - state.mix.eaa * 4 + excess * 2,
    15, 98
  );

  return {
    day: state.day,
    before,
    after: state.muscle,
    delta,
    score,
    rank,
    reason,
    total,
    afterFatigue,
    fatigue: state.fatigue,
    mix: { ...state.mix },
    ideal: { ...ideal }
  };
}
  function drink() {
    if (totalMix() === 0) return tell('粉を1つ以上入れてね！');
    state.result = evaluate();
    state.history.push(state.result);
    state.phase = 'mixing';
    save(); render();
  }

  function character(score) {
    const bulk = clamp(1 + (score - 100) * .011, .60, 1.65);
    return `<div class="character" style="--bulk:${bulk}" role="img" aria-label="筋肉スコア${Math.round(score)}のキャラクター">
      <svg viewBox="0 0 220 310" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="110" cy="297" rx="69" ry="9" fill="#2c312c26"/>
        <path d="M84 193 L79 274 Q77 283 91 285 L105 282 L110 224 L124 282 L138 283 Q149 279 144 270 L137 193Z" fill="#d4a288" stroke="#2d302e" stroke-width="4"/>
        <path d="M75 272 L105 275 L107 296 L63 296 Q57 284 75 272Z M121 275 L148 270 Q166 279 163 296 L118 296Z" fill="#f2eee2" stroke="#2d302e" stroke-width="4"/>
        <path d="M77 188 Q109 197 143 187 L140 218 Q111 226 80 217Z" fill="#526777" stroke="#2d302e" stroke-width="4"/>
        <g class="arms"><path d="M71 105 Q46 91 36 113 Q19 143 30 172 Q38 185 50 173 L76 140Z" fill="#d4a288" stroke="#2d302e" stroke-width="5"/><path d="M149 105 Q171 91 184 113 Q199 142 190 172 Q181 185 169 174 L144 140Z" fill="#d4a288" stroke="#2d302e" stroke-width="5"/></g>
        <rect x="96" y="76" width="27" height="34" rx="11" fill="#be8874"/>
        <g class="torso"><path d="M75 97 L94 100 Q110 114 126 100 L145 97 Q163 103 168 116 L151 142 L147 197 Q111 208 73 197 L69 142 L52 116 Q57 103 75 97Z" fill="#d8ed76" stroke="#2d302e" stroke-width="5"/><path d="M84 138 Q111 149 140 138" fill="none" stroke="#a3ba55" stroke-width="3"/><path d="M108 153 L121 140 L116 154 L128 154 L99 180 L106 159 L95 159Z" fill="#27332b"/></g>
        <ellipse cx="110" cy="49" rx="39" ry="44" fill="#d7a48b" stroke="#2d302e" stroke-width="5"/>
        <path d="M71 47 Q63 10 94 7 Q116 -8 142 13 Q157 23 150 48 Q135 38 130 27 Q111 39 90 28 Q85 41 71 47Z" fill="#303b3a"/>
        <path d="M91 53 L100 54 M121 54 L130 53" stroke="#27302d" stroke-width="4" stroke-linecap="round"/>
        <path d="M101 75 Q110 82 119 75" fill="none" stroke="#a06d5c" stroke-width="3" stroke-linecap="round"/>
      </svg></div>`;
  }
  function renderScene(phase) {
    const scenes = {
      mixing: ['SHAKE', 'IT!', '粉を混ぜて、今夜の一杯を完成させよう。', '◉ ◉ ◉'],
      gym: ['LIFT', 'IT!', 'ジムでトレーニング中。結果はまだわからない。', '▰ ▰ ▰'],
      sleep: ['SLEEP', 'TIGHT.', 'おやすみ。筋肉の変化は明日の朝に判明する。', '☾ ✦']
    };
    const [word, accent, desc, symbol] = scenes[phase];
    app.innerHTML = `<section class="scene ${phase}"><div><div class="eyebrow">✳ DAY ${state.day} · ${phase.toUpperCase()}</div><h1>${word}<br><em>${accent}</em></h1><p>${desc}</p><div class="loading"><span></span></div><button class="scene-skip" id="skipScene">演出をスキップして翌朝へ →</button></div><div class="scene-art"><div class="scene-symbol">${symbol}</div>${phase === 'mixing' ? shakerHTML() : phase === 'gym' ? character(state.result.before) : '<div class="moon">☾<small>z z z</small></div>'}</div></section>`;
    if (phase === 'mixing') {
      const layers = [];
      SUPPS.forEach(s => { for (let n = 0; n < state.mix[s.id]; n++) layers.push(s.color); });
      document.querySelector('#powderStack').innerHTML = layers.map((color, i) => `<span class="powder-layer" style="background:${color};bottom:${i * 4.5}%;height:4.8%"></span>`).join('');
    }
    document.querySelector('#skipScene').addEventListener('click', () => { clearTimers(); state.phase = 'morning'; save(); render(); });
    later(() => {
      state.phase = phase === 'mixing' ? 'gym' : phase === 'gym' ? 'sleep' : 'morning';
      save(); render();
    }, phase === 'sleep' ? 1600 : 1300);
  }
  
function renderMorning() {
  const r = state.result;

  if (!r) {
    state.phase = 'night';
    save();
    render();
    return;
  }

  const kind = r.delta > 0 ? 'grow'
    : r.delta < 0 ? 'shrink' : 'keep';

  const heading = r.delta > 0 ? 'GROW UP!'
    : r.delta < 0 ? 'SHRINK...' : 'KEEP IT.';

  const answer = r.ideal ||
    idealMix(days[r.day - 1], r.fatigue);

  const correctCount = SUPPS.filter(s =>
    r.mix[s.id] === answer[s.id]).length;

  const answerRows = SUPPS.map(s => {
    const chosen = r.mix[s.id];
    const recommended = answer[s.id];
    const same = chosen === recommended;

    return `
      <div class="answer-row ${same ? 'matched' : ''}">
        <span>${s.name}</span>
        <small>あなた：${LEVELS[chosen]}</small>
        <strong>${LEVELS[recommended]}</strong>
        <span class="answer-check">
          ${same ? '✓' : '→'}
        </span>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    ${header(
      'MORNING RESULT · 07:00',
      'そして、',
      '翌朝。',
      '昨日の一杯とトレーニングの結果が明らかに。'
    )}

    <section class="result-layout">
      <div class="compare">
        <div>
          <small>BEFORE</small>
          ${character(r.before)}
        </div>

        <span class="compare-arrow">
          ${r.delta > 0 ? '↗' : r.delta < 0 ? '↘' : '→'}
        </span>

        <div class="after ${kind}">
          <small>AFTER</small>
          ${character(r.after)}
        </div>
      </div>

      <article class="panel result-panel">
        <div class="panel-top">
          <span>DAY ${state.day} / MORNING CHECK</span>
          <b class="rank">${r.rank}</b>
        </div>

        <h2 class="result-heading ${kind}">
          ${heading}
        </h2>

        <div class="delta ${kind}">
          ${r.delta > 0 ? '+' : ''}${r.delta}
          <small>pt</small>
        </div>

        <p class="delta-label">
          筋肉スコアの変化
        </p>

        <p class="result-reason">
          ${r.reason}
        </p>

        <div class="result-score">
          <span>現在の筋肉スコア</span>
          <strong>${Math.round(r.after)} pt</strong>
        </div>

        <p class="small-note">
          昨日の投入量：計 ${r.total} クリック /
          昨夜の疲労 ${Math.round(r.fatigue)}%
        </p>

        <section class="answer-panel">
          <div class="answer-title">
            <strong>昨日の答え合わせ</strong>
            <span>${correctCount} / 6 種類一致</span>
          </div>

          <p>
            ゲーム内のおすすめ配合。
            右側が今回の「答え」だよ。
          </p>

          <div class="answer-columns">
            <span>サプリ</span>
            <span>自分の配合</span>
            <span>おすすめ</span>
          </div>

          ${answerRows}

          <p class="answer-note">
            ※この答えはゲーム内だけの判定基準で、
            実際の摂取量を推奨するものではありません。
          </p>
        </section>

        <button class="btn dark" id="nextDay">
          ${state.day === 7
            ? '7日間の結果を見る'
            : `DAY ${state.day + 1} の夜へ`}
          <span>↗</span>
        </button>
      </article>
    </section>
  `;

  document.querySelector('#nextDay').addEventListener(
    'click', () => {
      if (state.day === 7) {
        state.phase = 'final';
      } else {
        const base = days[state.day].fatigue;

        state.fatigue = clamp(
          base + (r.afterFatigue - 45) * .32,
          12,
          94
        );

        state.day++;
        state.phase = 'night';
        state.mix = emptyMix();
        state.result = null;
      }

      save();
      render();
    }
  );
}

  function graph() {
    const values = [100, ...state.history.map(r => r.after)];
    const min = Math.min(...values) - 6;
    const max = Math.max(...values) + 6;
    const points = values.map((v, i) => [12 + i * 50, 99 - (v - min) / (max - min) * 77]);
    const path = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y.toFixed(1)}`).join(' ');
    return `<svg class="graph" viewBox="0 0 375 115" role="img" aria-label="筋肉スコアの7日間推移"><path d="M12 104H362" stroke="#ccd2c6" stroke-dasharray="5 5"/><path d="${path}" fill="none" stroke="#6a9872" stroke-width="3" stroke-linecap="round"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 7 ? 5 : 3}" fill="${i === 7 ? '#ff7956' : '#6a9872'}"/>`).join('')}</svg>`;
  }
  function renderFinal() {
    const change = Math.round(state.muscle - 100);
    const gains = state.history.filter(x => x.delta > 0).length;
    const losses = state.history.filter(x => x.delta < 0).length;
    const rank = change >= 35 ? 'S' : change >= 23 ? 'A' : change >= 12 ? 'B' : change >= 0 ? 'C' : 'D';
    app.innerHTML = `${header('MISSION COMPLETE · 7/7', '7 DAYS.', '7 SHAKES.', '7杯の選択で作った、君だけの1週間。')}
      <section class="final-layout"><div class="final-hero"><div class="eyebrow">✳ FINAL RANK ${rank}</div><h2>GAME<br><em>OVER?</em><br>NO WAY.</h2>${character(state.muscle)}<small>EVERY SCOOP TELLS A STORY.</small></div>
        <article class="panel final-panel"><div class="panel-top"><h2>YOUR SEVEN-DAY REPORT</h2><b class="rank">RANK ${rank}</b></div>
          <h3>${change >= 23 ? '最高の成長！' : change >= 0 ? 'まだ伸びる！' : '次こそリベンジ！'}</h3>
          <p>初日の100ptから <strong>${change >= 0 ? '+' : ''}${change}pt</strong> の変化。食事、疲労、配合の相性が結果を左右した。</p>
          <div class="final-stats"><div><strong>${Math.round(state.muscle)}</strong><small>FINAL MUSCLE</small></div><div><strong>${gains}</strong><small>GROW DAYS</small></div><div><strong>${losses}</strong><small>SHRINK DAYS</small></div></div>
          <div class="chart-title">MUSCLE GROWTH / DAY 0 — DAY 7</div>${graph()}
          <button class="btn dark" id="playAgain">もう一度チャレンジ <span>↗</span></button></article></section>`;
    document.querySelector('#playAgain').addEventListener('click', restart);
  }
  function restart() { clearTimers(); state = fresh(); state.fatigue = days[0].fatigue; save(); render(); tell('新しい7日間がスタート！'); }
  restartBtn.addEventListener('click', () => {
    if (state.phase === 'night' && state.day === 1 && state.history.length === 0) return tell('すでにDAY 1です');
    if (confirm('進行状況を消して最初からやり直しますか？')) restart();
  });
  loadCsv();
})();
