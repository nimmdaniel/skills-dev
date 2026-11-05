// Design A — „Iron Room“: brutalistisch, Beton + Warnstreifen, Anton/Plex Mono.
import Core from './core.js';
import css from './a-iron-room.css?inline';

const TICKER = ['Push', 'Pull', 'Core', 'Nichts geschenkt', 'Stufe für Stufe', 'Schwerkraft verliert', 'Halten', 'Wiederholen', 'Meistern'];
const SEL = '[data-open],[data-back],[data-run],[data-train],[data-fin],[data-skip],[data-pause],[data-add],[data-adj],[data-skipblock], [data-end],[data-rpe],[data-save],[data-exit],[data-video]';

function mount(host) {
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<style>${css}</style><div class="root"><div id="app"></div></div>`;
  const $ = s => sr.querySelector(s);
  const app = $('#app');
  let runner = null;

  const ticker = () => {
    const t = [...TICKER, ...TICKER].map(x => `${x} ✦`).join('  ');
    return `<div class="ticker"><div>${t}  ${t}</div></div>`;
  };

  function renderList() {
    const mastered = Core.skills.filter(Core.done).length;
    let i = 0;
    app.innerHTML = ticker() + `<div class="wrap">
      <header class="top rv">
        <h1 class="mega">Skills<br><span class="o">Iron</span> Room</h1>
        <div class="meta"><b>${Core.pad(mastered)}/${Core.pad(Core.skills.length)}</b>gemeistert</div>
      </header>
      ${Object.keys(Core.CATS).map(c => `
        <section class="cat">
          <div class="cat-label">${Core.CATS[c]}</div>
          <div class="cat-rows">
            ${Core.skills.filter(s => s.category === c).map(s => {
              const st = Core.stage(s.id), n = s.progressions.length, done = Core.done(s);
              return `<button class="row rv" style="--i:${i++}" data-open="${s.id}">
                <span class="no">${Core.pad(Core.skills.indexOf(s) + 1)}</span>
                <span><div class="nm">${s.name}</div>
                  <div class="segs">${s.progressions.map((_, k) => `<i class="${k < st || done ? 'on' : k === st ? 'cur' : ''}"></i>`).join('')}</div>
                  <div class="st">${done ? 'Alle Stufen durch' : `Stufe ${st + 1}/${n} — ${s.progressions[st].name}`}</div></span>
                ${done ? '<span class="stamp">Gemeistert</span>' : ''}
                <span class="arrow">→</span>
              </button>`;
            }).join('')}
          </div>
        </section>`).join('')}
    </div>`;
  }

  function renderDetail(id) {
    const s = Core.byId(id), st = Core.stage(id), ts = Core.trainStage(id), p = s.progressions[ts], last = Core.done(s);
    const hist = Core.history(id);
    app.innerHTML = ticker() + `<div class="wrap">
      <button class="back" data-back>← Alle Skills</button>
      <div class="d-head rv"><div class="d-cat">${Core.CATS[s.category]}</div><div class="d-name">${s.name}</div></div>
      <div class="now rv" style="--i:2">
        <div class="now-top"><div class="lvl">${Core.pad(st + 1)}</div>
          <small>${last ? 'Endstufe' : 'Jetzt dran'}</small>
          <div class="big">${p.name}</div><div class="tg">${Core.target(p)}</div></div>
        <button class="go" data-run>Workout starten <span>→</span></button>
      </div>
      <h2 class="sec rv" style="--i:3">Die Kette</h2>
      <div class="chain">
        ${s.progressions.map((q, k) => `<div class="link rv ${k < st ? 'done' : k === st ? 'cur' : k > st ? 'lock' : ''}" style="--i:${4 + k}" data-vrow ${k <= st ? 'data-train="' + k + '"' : 'data-locked aria-disabled="true"'}>
          <span class="n">${Core.pad(k + 1)}</span><span class="t">${q.name}</span>
          <span class="g">${k < st ? '<span class="tag">✓ Fertig</span>' : k === st ? '<span class="tag">Jetzt</span>' : Core.short(q)}<button class="vbtn" data-video="${k}">Video</button></span></div>`).join('')}
      </div>
      <div class="actions">${Core.expHTML(id)}</div>
      ${hist.length ? `<h2 class="sec">Verlauf</h2><div class="hist">${hist.slice().reverse().map(h => `<div><b>${h.reset ? '↓ ' : '✓ '}${Core.esc(h.name)}</b><span>${h.reset ? 'zurückgesetzt · ' : ''}${Core.date(h.masteredAt)}</span></div>`).join('')}</div>` : ''}
    </div>`;
    scrollTo(0, 0);
  }

  function renderRun(r) {
    let el = $('#run');
    if (!el) { el = document.createElement('div'); el.id = 'run'; $('.root').appendChild(el); }
    const b = r.p, isHold = r.isHold;
    const num = Core.runNum(r);
    const sig = r.sig();
    if (el.dataset.sig === sig) { el.querySelector('.r-num').textContent = num; Core.paintLive(el, r); return; }
    el.dataset.sig = sig;
    const phaseTxt = { prep: 'Bereit machen', work: isHold ? 'Halten!' : 'Wiederholungen', rest: 'Pause', done: r.metTarget() ? 'Ziel erreicht' : 'Geschafft' }[r.phase];
    const pips = Array.from({ length: r.sets }, (_, k) => `<i class="${k < r.logCur.length ? 'on' : k === r.si && r.phase !== 'done' ? 'cur' : ''}"></i>`).join('');
    const sub = r.phase === 'work' || r.phase === 'prep' ? Core.runView(r).hint
      : r.phase === 'rest' ? (r.si + 1 < r.p.sets ? `Gleich: Satz ${r.si + 2}/${r.p.sets}` : `Gleich: ${r.blocks[r.bi + 1]?.name || 'Ende'}`)
      : r.phase === 'done' ? `${r.skill.name} · ${r.log[0].join(' · ')}${r.blocks[0].type === 'hold' ? ' s' : ' Wdh'} · +${Core.runView(r).exp?.session ?? 0} % EXP` : Core.target(b);
    el.className = 'run ' + r.phase;
    el.innerHTML = `<div class="hz t"></div><div class="hz b"></div>
      <div class="r-top"><div><div class="lab">${r.phase === 'done' ? 'Workout komplett' : `Übung ${r.bi + 1}/${r.blocks.length} · ${b.role} · Satz ${r.si + 1}/${r.sets}`}</div><div class="nm">${r.phase === 'done' ? r.skill.name : b.name}</div>
        ${r.phase !== 'done' ? '<button class="skipb" data-skipblock>Übung überspringen →</button>' : ''}</div>
        <button class="lab" data-exit style="font:700 12px var(--mono);letter-spacing:.2em">SPÄTER FORTSETZEN</button></div>
      <div class="r-mid">
        <div class="r-phase">${phaseTxt}</div>
        <div class="r-num ${r.phase === 'work' && isHold ? 'out' : ''}">${num}</div>
        <div class="r-sub">${sub}</div>
        ${r.phase === 'done' ? `<div class="rpe">${Core.RPE.map(o => `<button class="${r.rpe === o.id ? 'on' : ''}" data-rpe="${o.id}">${o.label}</button>`).join('')}</div>` : `<div class="pips">${pips}</div>`}
      </div>
      ${r.persistenceError ? `<p role="alert">Nicht gesichert: ${Core.esc(r.persistenceError)}</p>` : ''}
      ${r.paused && r.phase !== 'done' ? '<p role="status">Pausiert · Weiter zum Fortsetzen</p>' : ''}
      ${r.phase !== 'done' ? '<button data-end style="min-height:48px">Training beenden</button>' : ''}
      ${Core.resultHTML(r)}
      ${r.phase === 'done' ? Core.qualityHTML(r) : ''}
      <div class="r-bot ${r.phase === 'rest' ? 'three' : ''}">
        ${r.phase === 'work' ? `<button class="r-btn pri" data-fin>${isHold ? 'Halten beenden' : 'Satz fertig'}</button>` : ''}
        ${r.phase === 'rest' ? `<button class="r-btn pri" data-skip>${Core.runView(r).primaryButton}</button>` : ''}
        ${r.phase === 'prep' ? '<button class="r-btn pri" data-skip>Los</button>' : ''}
        ${r.phase === 'done' ? '<button class="r-btn pri" data-save>Speichern</button>' : `<button class="r-btn" data-pause>${r.paused ? 'Weiter' : 'Pause'}</button>`}
      </div>`;
  }

  function closeRun(saved = false) { if (runner) runner.stop({ persist: !saved }); runner = null; $('#run')?.remove(); }
  function route() { const id = Core.hash(); id && Core.byId(id) ? renderDetail(id) : renderList(); }

  let saving = false;
  const onClick = async e => {
    if (saving) return;
    try {
    const t = e.target.closest(SEL);
    if (!t) return;
    const id = Core.hash(), ds = t.dataset;
    if (runner && Core.act(runner, ds)) return;
    if (ds.open) { Core.setHash(ds.open); route(); }
    else if ('back' in ds) { Core.setHash(null); route(); }
    else if ('run' in ds) { runner = Core.runner(Core.byId(id), Core.trainStage(id), renderRun); runner.start(); }
    else if ('train' in ds) { Core.setTrain(id, +ds.train); renderDetail(id); }
    else if ('save' in ds) { saving = true; await Core.saveWorkout(runner); closeRun(true); renderDetail(id); }
    else if ('exit' in ds) { closeRun(); }
    else if ('video' in ds) Core.toggleVideo(t, Core.byId(id).progressions[+ds.video].name);
    } catch (error) { window.alert(`Nicht gespeichert: ${error.message}`); } finally { saving = false; }
  };
  const onKey = e => { if (e.key === 'Escape' && runner) { e.preventDefault(); closeRun(); } };
  const onQuality = e => { if (e.target.dataset.result === undefined) Core.qualityInput(runner,e.target); };
  const onResult = e => { if (e.target.dataset.result !== undefined) Core.qualityInput(runner,e.target); };
  sr.addEventListener('input',onQuality);
  sr.addEventListener('change',onResult);
  const stopProgress = Core.subscribe(() => { if (!runner) route(); });
  sr.addEventListener('click', onClick);
  addEventListener('keydown', onKey);
  const stopNav = Core.nav(sr, route, () => !runner && !saving);
  route();

  return () => { stopNav(); stopProgress(); sr.removeEventListener('input',onQuality); sr.removeEventListener('change',onResult); closeRun(); sr.removeEventListener('click', onClick); removeEventListener('keydown', onKey); };
}

export default {
  id: 'a', name: 'Iron Room', hint: 'Brutalistisch · Beton & Warnstreifen',
  swatch: ['#0b0b0a', '#c8ff00', '#ffb000'], bg: '#0b0b0a',
  fonts: 'https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;700&display=swap',
  mount,
};
