import { Stage, pinPos, resistorBands } from './scene.js';
import { Sim, Hardware } from './sim.js';
import { LESSONS, TRACKS, PINS, TAGS, pinKey, COMPONENTS } from './lessons.js';
import { schematicSVG } from './schematic.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('learn-esp32:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('learn-esp32:' + k, JSON.stringify(v)); } catch (e) { } },
};
let toastT;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

// ---------- icons ----------
const IC = {
  chip: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>', usb: '<path d="M12 21V8M8 12l4-4 4 4M9 4h6v4H9zM7 15h10"/>',
  out: '<path d="M4 12h11M11 8l4 4-4 4M18 5v14"/>', in: '<path d="M20 12H9M13 8l-4 4 4 4M6 5v14"/>',
  res: '<path d="M2 12h4l2-4 3 8 3-8 3 8 2-4h3"/>', led: '<path d="M7 7l10 5-10 5zM17 7v10M14 4l2-2M18 6l2-2"/>',
  up: '<path d="M12 20V6M7 11l5-5 5 5M6 20h12"/>', hand: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>',
  knob: '<circle cx="12" cy="13" r="7"/><path d="M12 13l3-4M5 4l2 2M19 4l-2 2"/>', adc: '<path d="M3 15c3-8 5-8 8 0s5 8 8 0"/><path d="M4 20h16" stroke-dasharray="2 2"/>',
  wave: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>', rgb: '<circle cx="9" cy="10" r="4"/><circle cx="15" cy="10" r="4"/><circle cx="12" cy="15" r="4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', vol: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 010 6M19.5 6.5a8 8 0 010 11"/>',
  temp: '<path d="M10 14V5a2 2 0 014 0v9a4 4 0 11-4 0z"/>', rule: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>',
  servo: '<rect x="3" y="9" width="12" height="9" rx="1"/><circle cx="8" cy="9" r="2"/><path d="M8 9l11-5"/>', i2c: '<path d="M3 8h18M3 16h18M7 5l-3 3 3 3M17 13l3 3-3 3"/>',
  screen: '<rect x="3" y="5" width="18" height="12" rx="1"/><path d="M8 21h8M12 17v4"/>', wifi: '<path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0"/><circle cx="12" cy="19.5" r="1"/>',
  link: '<path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1"/>', warn: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>', loop: '<path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2M20 4v5h-5M4 20v-5h5"/>',
  bt: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>', moon: '<path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z"/>', mem: '<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M8 6v12M12 6v12M16 6v12"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>', web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
  cores: '<rect x="3" y="6" width="8" height="12" rx="1"/><rect x="13" y="6" width="8" height="12" rx="1"/>', sleep: '<path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z"/>',
  check: '<path d="M5 12l5 5 9-10"/>', play: '<path d="M8 5l11 7-11 7z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const icon = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24">${IC[k] || '<circle cx="12" cy="12" r="3"/>'}</svg>`;

// ---------- state ----------
const DEF = { theme: 'auto', labels: true, detail: false, flow: false, sound: true, speed: 1, pinLog: true };
const S = { ...DEF, ...store.get('settings', {}) };
const done = new Set(store.get('done', []));
const quiz = store.get('quiz', {});
const drafts = store.get('drafts', {});
let L = null, li = 0, tab = 'overview';
const thumbs = new Map();

// ---------- core objects ----------
const stage = new Stage($('#gl'), $('#labels'), $('#leaders'));
const hw = new Hardware();
stage.hw = hw;
let curLine = 0, errLine = 0, runState = 'stopped', runStart = 0;
const io = {
  serial: (t, k) => monWrite(t, k),
  status: (st, why) => setStatus(st),
  line: (n) => { curLine = n; },
  compileError: (msg, line) => { errLine = line; monWrite(`sketch.ino${line ? ':' + line : ''}: error: ${msg}\nCompilation failed.\n`, 'err'); showErr(line); },
  runtimeError: (msg, line) => { errLine = line; monWrite(`\nRuntime error${line ? ' at line ' + line : ''}: ${msg}\n`, 'err'); showErr(line); },
  baudMismatch: (b) => monWrite(`\n[monitor] Garbled? The sketch uses Serial.begin(${b}) but the monitor is set to ${$('#baud').value} baud. Change the baud menu above.\n`, 'warn'),
  wifi: (w) => { wifiInfo = w; renderChips(); phoneNet(); if (w && w.state === 'connected' && phone.serverReady && !phone.loaded) phoneLoad('/'); },
  phone: (e) => phoneEvent(e),
  tone: (f) => tone(f),
  oled: () => { },
};
const sim = new Sim(hw, io);
window.__esp = { sim, hw, stage };
sim._stopAudio = () => tone(0);
let wifiInfo = null;

// ---------- theme / settings ----------
function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  stage.setTheme(dark);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
function applySettings() {
  applyTheme();
  stage.labelsOn = S.labels; $('#vLabels').setAttribute('aria-pressed', S.labels);
  $('#labels').classList.toggle('detail', S.detail); stage.poke();
  sim.speed = S.speed;
  store.set('settings', S);
}

// ---------- lessons strip ----------
function renderStrip() {
  $('#strip').innerHTML = LESSONS.map((l, i) => `
    <button class="lc" data-i="${i}" aria-label="Lesson ${i + 1}: ${esc(l.title)}">
      ${thumbs.get(l.thumb) ? `<img src="${thumbs.get(l.thumb)}" alt="">` : '<span class="ph"></span>'}
      ${l.badge ? `<span class="bdg">${icon(l.badge)}</span>` : ''}
      <span><span class="tt" style="display:block">${i + 1}. ${esc(l.title)}</span><span class="tr">${esc(l.track)}</span></span>
      <svg class="i chev" viewBox="0 0 24 24">${IC.chev}</svg>
      ${done.has(l.id) ? `<span class="done" title="Completed">${icon('check')}</span>` : ''}
    </button>`).join('');
  markStrip();
}
function markStrip() {
  $$('.lc').forEach(b => b.setAttribute('aria-current', +b.dataset.i === li));
  $('#allProg').textContent = `${done.size} of ${LESSONS.length} complete`;
}
$('#strip').addEventListener('click', (e) => { const b = e.target.closest('.lc'); if (b) select(+b.dataset.i); });
$('#more').addEventListener('click', () => { const s = $('#strip'); s.scrollBy({ left: s.clientWidth * 0.8 }); });

function renderHud() {
  const tr = L.track; const ls = LESSONS.filter(l => l.track === tr); const n = ls.filter(l => done.has(l.id)).length;
  $('#trackName').textContent = tr; $('#trackN').textContent = `${n}/${ls.length}`; $('#trackBar').style.width = (n / ls.length * 100) + '%';
}

// ---------- select a lesson ----------
function select(i, opts = {}) {
  if (i < 0 || i >= LESSONS.length) return;
  sim.stop(); li = i; L = LESSONS[i];
  errLine = 0; curLine = 0; phone.reset();
  sim.setLesson(L); stage.setLesson(L);
  sim.pinLog = S.pinLog && !L.noPinLog; $('#pinTg').setAttribute('aria-pressed', sim.pinLog);
  setCode(drafts[L.id] ?? L.code);
  renderTab(); renderSchematic(); buildInputs(); setupPhone(); renderHud(); markStrip();
  $('#log').textContent = ''; monWrite(`Lesson ${i + 1}: ${L.title}. Press Run to upload the sketch.\n`, 'sys');
  document.title = `${L.title} · Learn ESP32`;
  if (location.hash.slice(1) !== L.id) history.replaceState(null, '', '#' + L.id);
  const card = $(`.lc[data-i="${i}"]`); if (card && !opts.noScroll) card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  stage.flowOn = S.flow; $('#vFlow').setAttribute('aria-pressed', S.flow);
  resetGains();
}

// ---------- tabs ----------
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderTab(); });
$('#tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const ts = $$('#tabs [data-tab]'); const k = ts.findIndex(t => t.dataset.tab === tab);
  const n = ts[(k + (e.key === 'ArrowRight' ? 1 : ts.length - 1)) % ts.length]; tab = n.dataset.tab; renderTab(); n.focus();
});
function renderTab() {
  $$('#tabs [data-tab]').forEach(b => { b.setAttribute('aria-selected', b.dataset.tab === tab); b.tabIndex = b.dataset.tab === tab ? 0 : -1; });
  const B = $('#tabBody'); B.scrollTop = 0;
  if (tab === 'overview') {
    const o = L.overview;
    B.innerHTML = `<h2>${esc(o.title)}</h2><p>${o.text}</p><ul class="feat">${o.bullets.map(([k, t]) => `<li><span class="ic">${icon(k)}</span><span>${t}</span></li>`).join('')}</ul>
      <div class="try"><b>Try this</b>${esc(L.challenge)}</div>`;
  } else if (tab === 'pinout') {
    if (L.pinout === 'ALL') B.innerHTML = `<h2>Pinout</h2><p>${L.pinoutCaption}</p>${pinTable(PINS)}`;
    else B.innerHTML = `<h2>Pinout</h2><p>What each wire in this circuit does. Hover a row to find the pin.</p>
      <table class="pt"><thead><tr><th>Pin</th><th>Connects to</th><th>What it does</th></tr></thead><tbody>${L.pinout.map(([col, p, to, what]) => `<tr data-pin="${esc(pinFromLabel(p))}"><td><span class="pin-n"><i style="background:${col}"></i>${esc(p)}</span></td><td>${esc(to)}</td><td>${esc(what)}</td></tr>`).join('')}</tbody></table>`;
    hookPinRows(B);
  } else if (tab === 'example') {
    B.innerHTML = `<h2>How the code works</h2><ol class="steps">${L.steps.map(s => `<li><span>${s}</span></li>`).join('')}</ol><div class="try"><b>Try this</b>${esc(L.challenge)}</div>`;
  } else if (tab === 'specs') {
    B.innerHTML = `<h2>Specifications</h2><div class="specs">${L.specs.map(([k, v]) => `<div class="spec"><div class="cap">${esc(k)}</div><div>${esc(v)}</div></div>`).join('')}</div>`;
  } else if (tab === 'quiz') renderQuiz(B);
}
function pinFromLabel(p) { const m = String(p).match(/GPIO(\d+)/); if (m) return m[1]; if (/^3V3/.test(p)) return '3V3'; if (/^5V/.test(p)) return '5V'; if (/^GND/.test(p)) return 'GND'; return ''; }
function pinTable(rows) {
  return `<table class="pt"><thead><tr><th>Pin</th><th>Can do</th></tr></thead><tbody>${rows.map(p => `<tr data-pin="${esc(pinKey(p))}"><td><span class="pin-n">${esc(p[3] !== null && p[2] !== String(p[3]) ? `${p[2]} · GPIO${p[3]}` : p[3] !== null ? 'GPIO' + p[3] : p[2])}</span><div style="font-size:11px;color:var(--muted)">${p[0] === 'L' ? 'Left' : 'Right'} header, pin ${p[1] + 1}</div></td><td><div class="tags">${p[4].map(t => `<span class="tag" style="background:${TAGS[t][1]}">${TAGS[t][0]}</span>`).join('')}</div>${esc(p[5])}</td></tr>`).join('')}</tbody></table>`;
}
function hookPinRows(root) {
  root.addEventListener('mouseover', (e) => { const r = e.target.closest('tr[data-pin]'); stage.highlightPins(r && r.dataset.pin ? [r.dataset.pin] : []); });
  root.addEventListener('mouseleave', () => stage.highlightPins([]));
  root.addEventListener('click', (e) => { const r = e.target.closest('tr[data-pin]'); if (r && r.dataset.pin) focusPin(r.dataset.pin); });
}
function focusPin(k) {
  try { const p = pinPos(k); stage.highlightPins([k]); stage.tweenTo({ target: p, az: stage.view.az, el: stage.view.el, zoom: Math.max(stage.view.zoom, 2.2) }, 700); } catch (e) { }
}
function renderQuiz(B) {
  const st = quiz[L.id] || {};
  const score = L.quiz.filter((q, i) => st[i] === q.a).length;
  const answered = Object.keys(st).length;
  B.innerHTML = `<h2>Check yourself</h2>${answered === L.quiz.length ? `<div class="score">${icon(score === L.quiz.length ? 'star' : 'check')}<span><b>${score}/${L.quiz.length}</b> correct. ${score === L.quiz.length ? 'Nicely done.' : 'Read the explanations, then retry.'}</span><button class="btn" id="qRetry" style="margin-left:auto">Retry</button></div>` : ''}
    ${L.quiz.map((q, i) => `<div class="q" data-q="${i}"><p>${i + 1}. ${esc(q.q)}</p><div class="opts">${q.o.map((o, j) => `<button data-o="${j}" class="${st[i] !== undefined ? (j === q.a ? 'right' : st[i] === j ? 'wrong' : '') : ''}" ${st[i] !== undefined ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>${st[i] !== undefined ? `<div class="why">${st[i] === q.a ? 'Correct. ' : 'Not quite. '}${esc(q.why)}</div>` : ''}</div>`).join('')}`;
  B.onclick = (e) => {
    if (e.target.id === 'qRetry') { delete quiz[L.id]; store.set('quiz', quiz); renderQuiz(B); return; }
    const b = e.target.closest('button[data-o]'); if (!b) return; const qi = +b.closest('.q').dataset.q;
    quiz[L.id] = { ...(quiz[L.id] || {}), [qi]: +b.dataset.o }; store.set('quiz', quiz); const top = B.scrollTop; renderQuiz(B); B.scrollTop = top;
  };
}
$('#tabsMax').addEventListener('click', () => toggleMax($('#tabsCard')));

// ---------- editor ----------
const ta = $('#code'), hl = $('#hl'), gut = $('#gut'), cur = $('#cur');
const LH = 20.25;
const KW = new Set('void if else for while do return switch case break continue default true false const static volatile new delete sizeof struct class public private unsigned signed auto nullptr NULL'.split(' '));
const TY = new Set('int long short float double bool boolean char byte word String size_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t TaskHandle_t IPAddress esp_sleep_wakeup_cause_t WebServer Servo DHT Adafruit_SSD1306 BluetoothSerial'.split(' '));
function highlight(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(R"(\w*)\([\s\S]*?\)\3"|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(^[ \t]*#[^\n]*)|\b(0x[0-9a-fA-F]+|\d+\.?\d*(?:[eE][-+]?\d+)?[fFuUlL]*)\b|\b([A-Za-z_]\w*)\b(?=(\s*\())?/gm;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index)); last = re.lastIndex;
    const [all, cm, str, , pp, num, id, call] = m;
    if (cm) out += `<span class="t-cm">${esc(cm)}</span>`;
    else if (str) out += `<span class="t-st">${esc(str)}</span>`;
    else if (pp) out += `<span class="t-pp">${esc(pp)}</span>`;
    else if (num) out += `<span class="t-nu">${esc(num)}</span>`;
    else if (id) {
      const c = KW.has(id) ? 't-kw' : TY.has(id) ? 't-ty' : call ? 't-fn' : /^[A-Z][A-Z0-9_]+$/.test(id) ? 't-co' : '';
      out += c ? `<span class="${c}">${id}</span>` : id;
    } else out += esc(all);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out + esc(src.slice(last));
}
function renderCode() {
  hl.innerHTML = highlight(ta.value) + '\n';
  const n = ta.value.split('\n').length;
  gut.innerHTML = Array.from({ length: n }, (_, i) => `<div${i + 1 === errLine ? ' class="err"' : ''} style="padding-top:${i ? 0 : 8}px">${i + 1}</div>`).join('');
  $('#modTag').hidden = ta.value === L.code;
  syncScroll();
}
function syncScroll() {
  const x = ta.scrollLeft, y = ta.scrollTop;
  hl.style.transform = `translate(${-x}px,${-y}px)`; gut.style.transform = `translateY(${-y}px)`; placeCur();
}
function placeCur() {
  const n = runState === 'running' || runState === 'sleeping' ? curLine : errLine;
  if (!n) { cur.style.display = 'none'; return; }
  cur.style.display = 'block'; cur.classList.toggle('err', !!errLine && runState !== 'running');
  cur.style.top = (8 + (n - 1) * LH - ta.scrollTop) + 'px';
}
function setCode(s) { ta.value = s; ta.scrollTop = 0; ta.scrollLeft = 0; errLine = 0; renderCode(); }
let saveT;
ta.addEventListener('input', () => {
  errLine = 0; renderCode();
  clearTimeout(saveT); saveT = setTimeout(() => { if (ta.value === L.code) delete drafts[L.id]; else drafts[L.id] = ta.value; store.set('drafts', drafts); }, 400);
});
ta.addEventListener('scroll', syncScroll);
ta.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runToggle(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); toast('Your edits are saved in this browser automatically.'); return; }
  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    const s = ta.selectionStart; const line = ta.value.slice(ta.value.lastIndexOf('\n', s - 1) + 1, s);
    let ind = (line.match(/^\s*/) || [''])[0]; if (/\{\s*$/.test(line)) ind += '  ';
    e.preventDefault(); document.execCommand('insertText', false, '\n' + ind);
  }
  if (e.key === 'Escape') ta.blur();
});
function showErr(line) { renderCode(); if (line) { const y = 8 + (line - 1) * LH; if (y < ta.scrollTop || y > ta.scrollTop + ta.clientHeight - 40) ta.scrollTop = y - ta.clientHeight / 2; } placeCur(); }
$('#cCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(ta.value); toast('Sketch copied. Paste it into the Arduino IDE.'); }
  catch (e) { ta.focus(); ta.select(); toast('Press Ctrl+C (or ⌘C) to copy the selected sketch.'); }
});
$('#cReset').addEventListener('click', () => { if (ta.value === L.code) { toast('This is already the original sketch.'); return; } const keep = ta.value; setCode(L.code); delete drafts[L.id]; store.set('drafts', drafts); toast('Original sketch restored.'); lastUndo = keep; });
let lastUndo = null;
$('#cMax').addEventListener('click', () => toggleMax($('#codeCard')));
function toggleMax(el) {
  const on = !el.classList.contains('max');
  $$('.max').forEach(x => { if (x !== el && x.classList.contains('card')) x.classList.remove('max'); });
  el.classList.toggle('max', on);
  let scrim = $('.scrim');
  if (on && !scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.onclick = () => { $$('.card.max').forEach(x => x.classList.remove('max')); scrim.remove(); }; document.body.append(scrim); }
  if (!on && scrim) scrim.remove();
  requestAnimationFrame(syncScroll);
}

// ---------- serial monitor ----------
const log = $('#log'); let pend = [], monRaf = 0;
function monWrite(t, k = 'out') { pend.push([t, k]); if (!monRaf) monRaf = requestAnimationFrame(flushMon); }
function flushMon() {
  monRaf = 0; const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 40;
  for (const [t, k] of pend) {
    const last = log.lastElementChild;
    if (last && last.className === k && last.textContent.length < 4000) last.textContent += t;
    else { const s = document.createElement('span'); s.className = k; s.textContent = t; log.append(s); }
  }
  pend = [];
  while (log.childElementCount > 400) log.firstElementChild.remove();
  if (atBottom) log.scrollTop = log.scrollHeight;
}
$('#mClear').addEventListener('click', () => { log.textContent = ''; });
$('#mFold').addEventListener('click', () => { const m = $('#mon'); m.classList.toggle('closed'); $('#mFold').setAttribute('aria-label', m.classList.contains('closed') ? 'Expand monitor' : 'Collapse monitor'); });
$('#baud').addEventListener('change', (e) => { sim.uiBaud = +e.target.value; sim._baudHint = false; });
$('#pinTg').addEventListener('click', () => { sim.pinLog = !sim.pinLog; $('#pinTg').setAttribute('aria-pressed', sim.pinLog); S.pinLog = sim.pinLog; store.set('settings', S); });
$('#monIn').addEventListener('submit', (e) => {
  e.preventDefault(); const v = $('#monTxt').value; if (!sim.running) { toast('Run the sketch first, then send it text.'); return; }
  sim.serialSend(v + '\n'); monWrite('> ' + v + '\n', 'sys'); $('#monTxt').value = '';
});
(() => { // resize between editor and monitor
  const sp = $('#split'), mon = $('#mon'); let y0, h0;
  sp.addEventListener('pointerdown', (e) => { sp.setPointerCapture(e.pointerId); y0 = e.clientY; h0 = mon.offsetHeight; mon.classList.remove('closed'); });
  sp.addEventListener('pointermove', (e) => { if (y0 === undefined) return; const max = $('#codeCard').clientHeight - 140; mon.style.height = Math.max(34, Math.min(max, h0 - (e.clientY - y0))) + 'px'; });
  sp.addEventListener('pointerup', () => { y0 = undefined; });
  sp.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); mon.style.height = Math.max(34, mon.offsetHeight + (e.key === 'ArrowUp' ? 20 : -20)) + 'px'; } });
})();

// ---------- run / stop ----------
const STLABEL = { stopped: 'Stopped', compiling: 'Compiling…', uploading: 'Uploading…', running: 'Running', sleeping: 'Deep sleep', error: 'Error' };
function setStatus(st) {
  runState = st; $('#sst').textContent = STLABEL[st] || st;
  const d = $('#sdot'); d.className = 'sdot ' + (st === 'running' ? 'running' : st === 'error' ? 'error' : st === 'sleeping' ? 'sleeping' : st === 'compiling' || st === 'uploading' ? 'busy' : '');
  const active = st !== 'stopped' && st !== 'error';
  const b = $('#runBtn'); b.classList.toggle('stop', active); b.innerHTML = icon(active ? 'stop' : 'play'); b.setAttribute('aria-label', active ? 'Stop sketch' : 'Run sketch');
  if (st === 'running') { runStart = performance.now(); setTimeout(checkDone, 1600); }
  if (st === 'stopped') { curLine = 0; tone(0); }
  placeCur(); renderChips();
}
function checkDone() {
  if ((runState === 'running' || runState === 'sleeping') && performance.now() - runStart >= 1500 && !done.has(L.id)) {
    done.add(L.id); store.set('done', [...done]); renderStrip(); renderHud(); toast(`Lesson ${li + 1} complete. ${li + 1 < LESSONS.length ? 'Next: ' + LESSONS[li + 1].title : 'You finished the course!'}`, 3400);
  }
}
function runToggle() {
  initAudio();
  if (runState !== 'stopped' && runState !== 'error') { sim.stop(); monWrite('\n[stopped]\n', 'sys'); return; }
  errLine = 0; renderCode(); log.textContent = ''; sim.uiBaud = +$('#baud').value;
  sim.run(ta.value);
}
$('#runBtn').addEventListener('click', runToggle);

// ---------- audio ----------
let ac = null, osc = null, gain = null;
function initAudio() {
  if (ac || !S.sound) return;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); osc = ac.createOscillator(); osc.type = 'square'; gain = ac.createGain(); gain.gain.value = 0; osc.connect(gain).connect(ac.destination); osc.start(); } catch (e) { ac = null; }
}
function tone(f) {
  if (!ac || !gain) return;
  const on = S.sound && f > 0;
  if (on) osc.frequency.setTargetAtTime(f, ac.currentTime, 0.004);
  gain.gain.setTargetAtTime(on ? 0.035 : 0, ac.currentTime, 0.008);
}

// ---------- inputs panel ----------
function buildInputs() {
  const rows = []; const P = L.layout.parts || [];
  for (const p of P) {
    if (p.type === 'button') rows.push(`<div class="row"><button class="hold" data-hold="${p.id}">${icon('hand')}Hold to press · GPIO${p.pin}</button></div>`);
    if (p.type === 'touch') rows.push(`<div class="row"><button class="hold" data-hold="${p.id}">${icon('hand')}Hold to touch · T0</button></div>`);
    if (p.type === 'pot') rows.push(`<div class="row"><label for="in-${p.id}">Knob · GPIO${p.pin}</label><output id="o-${p.id}"></output><input type="range" id="in-${p.id}" data-in="${p.id}" min="0" max="100" value="50"></div>`);
    if (p.type === 'ldr') rows.push(`<div class="row"><label for="in-${p.id}">Light level</label><output id="o-${p.id}"></output><input type="range" id="in-${p.id}" data-in="${p.id}" min="0" max="100" value="60"></div>`);
    if (p.type === 'dht') rows.push(`<div class="row"><label for="in-${p.id}-t">Temperature</label><output id="o-${p.id}-t"></output><input type="range" id="in-${p.id}-t" data-dht="${p.id}" data-k="t" min="-10" max="50" step="0.5" value="26.5"></div><div class="row"><label for="in-${p.id}-h">Humidity</label><output id="o-${p.id}-h"></output><input type="range" id="in-${p.id}-h" data-dht="${p.id}" data-k="h" min="0" max="100" value="58"></div>`);
    if (p.type === 'sonar') rows.push(`<div class="row"><label for="in-${p.id}">Wall distance</label><output id="o-${p.id}"></output><input type="range" id="in-${p.id}" data-in="${p.id}" data-cm="1" min="2" max="400" value="42"></div>`);
    if (p.type === 'oled') rows.push(`<div class="row"><label>OLED (zoomed)</label><output></output><canvas class="oledp" id="oledp" width="128" height="64"></canvas></div>`);
  }
  if (L.id === 'sleep') rows.push(`<div class="row"><button class="hold" data-hold="boot">${icon('hand')}Hold BOOT · GPIO0</button></div>`);
  $('#inpBody').innerHTML = rows.join('');
  $('#inp').hidden = !rows.length;
  $$('#inpBody input[type=range]').forEach(r => { r.addEventListener('input', onRange); onRange({ target: r }); });
  $$('#inpBody .hold').forEach(b => {
    const id = b.dataset.hold;
    const set = (v) => { setIn(id, v); };
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); set(true); });
    b.addEventListener('pointerup', () => set(false)); b.addEventListener('pointercancel', () => set(false));
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') set(false); });
  });
}
function setIn(id, v) {
  stage.poke();
  if (id === 'en') { if (v) { if (sim.compiled && runState !== 'stopped' && runState !== 'error') { sim.pressEN(); toast('EN pressed: the ESP32 restarts.'); } else toast('EN resets the chip. Run a sketch first.'); } return; }
  sim.setInput(id, v);
  $$(`[data-hold="${id}"]`).forEach(b => b.classList.toggle('on', !!v));
}
function onRange(e) {
  const r = e.target; stage.poke();
  if (r.dataset.dht) { const id = r.dataset.dht; const cur = { ...(hw.inputs[id] || { t: 26.5, h: 58 }) }; cur[r.dataset.k] = +r.value; sim.setInput(id, cur); $(`#o-${id}-${r.dataset.k}`).textContent = r.dataset.k === 't' ? `${(+r.value).toFixed(1)} °C` : `${r.value} %`; return; }
  const id = r.dataset.in;
  if (r.dataset.cm) { sim.setInput(id, +r.value); $(`#o-${id}`).textContent = `${r.value} cm`; return; }
  const v = +r.value / 100; sim.setInput(id, v);
  const part = (L.layout.parts || []).find(p => p.id === id);
  $(`#o-${id}`).textContent = part && part.type === 'pot' ? `${r.value} % · ≈ ${Math.round(v * 4095)}` : `${r.value} %`;
}
stage.onPress = (id, down) => setIn(id, down);
stage.onWheelPart = (id, dir) => { const r = $(`#in-${id}`); if (!r) return; r.value = Math.max(0, Math.min(100, +r.value + dir * 4)); onRange({ target: r }); };

// ---------- clicking parts ----------
const RVALS = [220, 330, 1000, 10000, 100];
const LEDCOLS = [['#ff3b30', 'red', 2.0], ['#ffcc00', 'yellow', 2.1], ['#35c759', 'green', 2.2], ['#2f7dff', 'blue', 3.0], ['#f4f4f4', 'white', 3.0]];
const partState = {};
function resetGains() { for (const k in partState) delete partState[k]; }
function ledFor(rid) { return rid === 'r1' ? 'led' : rid === 'r2' ? 'led2' : null; }
function updateGain(ledId) {
  const led = stage.part(ledId); if (!led) return;
  const rid = ledId === 'led' ? 'r1' : 'r2'; const R = (partState[rid] && partState[rid].ohms) || 220;
  const vf = (partState[ledId] && partState[ledId].vf) || 2.0;
  const mA = Math.max(0, (3.3 - vf) / R * 1000); const ref = (3.3 - 2.0) / 220 * 1000;
  led.userData.gain = Math.max(0.12, Math.min(1.5, Math.pow(mA / ref, 0.55)));
  return mA;
}
const fmtR = (r) => r >= 1000 ? (r / 1000) + ' kΩ' : r + ' Ω';
stage.onPartClick = (id, spec) => {
  if (id === 'pin') { const P = PINS.find(p => p[0] === spec.side && p[1] === spec.i); if (P) { stage.highlightPins([pinKey(P)]); toast(`${P[3] !== null ? 'GPIO' + P[3] : P[2]}: ${P[5]}`, 4000); } return; }
  if (!spec) return;
  if (spec.type === 'res' && ledFor(id)) {
    const cur = (partState[id] && partState[id].ohms) || spec.ohms; const nx = RVALS[(RVALS.indexOf(cur) + 1) % RVALS.length];
    partState[id] = { ohms: nx }; stage.rebuildPart(id, { ...spec, ohms: nx });
    const mA = updateGain(ledFor(id));
    toast(`Resistor ${fmtR(nx)} → LED current ≈ ${mA.toFixed(1)} mA${nx > 220 ? ' (dimmer)' : nx < 220 ? ' (brighter, still safe)' : ''}. Click again for another value.`, 3600);
    return;
  }
  if (spec.type === 'led') {
    const k = ((partState[id] && partState[id].ci) ?? 0) + 1; const [hex, name, vf] = LEDCOLS[k % LEDCOLS.length];
    partState[id] = { ...(partState[id] || {}), ci: k % LEDCOLS.length, vf }; stage.part(id).userData.setColor(hex); stage.poke();
    const mA = updateGain(id);
    toast(`${name[0].toUpperCase() + name.slice(1)} LED: forward voltage ≈ ${vf} V, so ≈ ${mA.toFixed(1)} mA flows${vf >= 3 ? '. Blue and white LEDs barely light from 3.3 V.' : '.'}`, 4000);
    return;
  }
  const h = (L.hotspots || []).find(x => x.at && x.at.part === id);
  if (h) { const el = $(`.hs[data-id="${h.id}"]`); if (el) { $$('.hs.on').forEach(x => x !== el && x.classList.remove('on')); el.classList.toggle('on'); } }
};
stage.onHotspot = (h) => { const el = $(`.hs[data-id="${h.id}"]`); $$('.hs.on').forEach(x => x !== el && x.classList.remove('on')); el.classList.toggle('on'); };

// ---------- pin hover tooltip ----------
const tip = $('#pinTip');
stage.onPinHover = (pin, x, y) => {
  if (!pin) { tip.hidden = true; if (!$('.pt tr:hover')) stage.highlightPins([]); return; }
  const P = PINS.find(p => p[0] === pin.side && p[1] === pin.i); if (!P) return;
  tip.innerHTML = `<b>${P[3] !== null ? 'GPIO' + P[3] : P[2]}</b>${P[3] !== null && P[2] !== String(P[3]) ? ` <span style="color:var(--muted)">(${P[2]})</span>` : ''}<div class="tags">${P[4].map(t => `<span class="tag" style="background:${TAGS[t][1]}">${TAGS[t][0]}</span>`).join('')}</div>${esc(P[5])}`;
  tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(innerWidth - w - 8, x + 14) + 'px'; tip.style.top = Math.max(8, y - h - 12) + 'px';
  stage.highlightPins([pinKey(P)]);
};

// ---------- schematic ----------
function renderSchematic() {
  $('#schSub').textContent = L.title; $('#schBody').innerHTML = schematicSVG(L.schematic || []);
  $('#schNote').textContent = L.id === 'meet' ? 'The GPIO2 LED and its resistor are on the board itself.' : '';
}
function setSch(on) { $('#sch').hidden = !on; $('#vSch').setAttribute('aria-pressed', on); if (on && L.phone) $('#phone').style.top = ($('#sch').offsetHeight + 96) + 'px'; else $('#phone').style.top = ''; }
$('#vSch').addEventListener('click', () => setSch($('#sch').hidden));
$('#schX').addEventListener('click', () => setSch(false));

// ---------- view controls ----------
$('#vL').addEventListener('click', () => stage.rotate(1));
$('#vR').addEventListener('click', () => stage.rotate(-1));
$('#vIn').addEventListener('click', () => stage.zoomBy(1.25));
$('#vOut').addEventListener('click', () => stage.zoomBy(0.8));
$('#vReset').addEventListener('click', () => stage.resetView());
$('#vLabels').addEventListener('click', () => { S.labels = !S.labels; applySettings(); stage.poke(); });
$('#vFlow').addEventListener('click', () => { stage.flowOn = !stage.flowOn; $('#vFlow').setAttribute('aria-pressed', stage.flowOn); if (stage.flowOn && runState !== 'running') toast('Run the sketch to see current flow along the wires.'); });

// ---------- status chips (power, Wi-Fi, CPU cores) ----------
function ledmA(p) { const st = partState[p.id] || {}; const R = (partState[p.id === 'led2' ? 'r2' : 'r1'] || {}).ohms || 220; const vf = st.vf || (p.color === '#35c759' ? 2.2 : 2.0); return (3.3 - vf) / R * 1000; }
function renderChips() {
  const c = []; const running = hw.running;
  if (running || runState === 'sleeping') {
    let txt;
    if (hw.sleeping) txt = '≈ 10 µA · deep sleep';
    else {
      let ma = 48 + (wifiInfo ? 72 : 0) + (hw.radio === 2 ? 50 : 0);
      for (const p of L.layout.parts || []) {
        if (p.type === 'led') ma += hw.level(p.pin) * ledmA(p);
        if (p.type === 'rgb') ma += (hw.level(p.pins.r) + hw.level(p.pins.g) + hw.level(p.pins.b)) * 4.5;
      }
      ma += hw.level(2) * 3;
      txt = `≈ ${Math.round(ma)} mA`;
    }
    c.push(`<span class="chip" title="Rough current estimate for the ESP32 chip and parts. The dev board's USB chip and power LED add a few mA.">${icon('bolt')}${txt}</span>`);
    const now = performance.now();
    c.push(`<span class="chip" title="CPU core activity">CPU <span class="core ${now - hw.coreAct[0] < 150 ? 'on' : ''}" title="Core 0"></span><span class="core ${now - hw.coreAct[1] < 150 && !hw.sleeping ? 'on' : ''}" title="Core 1"></span></span>`);
  }
  if (wifiInfo) {
    const w = wifiInfo; const t = w.state === 'connected' ? `${esc(w.ssid)} · ${w.ip}` : w.state === 'ap' ? `AP ${esc(w.ssid)} · ${w.ip}` : w.state === 'scanning' ? 'Scanning…' : `Connecting to ${esc(w.ssid || '')}…`;
    c.push(`<span class="chip">${icon('wifi')}${t}</span>`);
  }
  if (hw.radio === 2 && sim.bt) c.push(`<span class="chip">${icon('bt')}${esc(sim.bt.name)}${sim.bt.connected ? ' · paired' : ' · discoverable'}</span>`);
  const h = c.join(''); const el = $('#chips'); if (el._h !== h) { el.innerHTML = h; el._h = h; }
}
setInterval(() => {
  renderChips();
  $$('#schBody .sc-row').forEach(r => { const p = r.dataset.pin; r.classList.toggle('hot', !!p && hw.level(+p) > 0.02); });
  const oc = $('#oledp'); if (oc && hw.oled && oc._v !== hw.oled.version) { oc._v = hw.oled.version; oc.getContext('2d').drawImage(hw.oled.canvas, 0, 0); }
  if (oc && !hw.oled && oc._v !== -1) { oc._v = -1; const x = oc.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 64); }
}, 120);
(function curLoop() { if (runState === 'running' || runState === 'sleeping') placeCur(); requestAnimationFrame(curLoop); })();

// ---------- phone ----------
const phone = { mode: null, serverReady: false, loaded: false, path: '/', btBuf: '', reset() { this.serverReady = false; this.loaded = false; this.btBuf = ''; } };
let shadow = null;
function setupPhone() {
  const on = !!L.phone; $('#phone').hidden = !on; phone.mode = L.phone; phone.reset();
  $('#phBar').hidden = L.phone !== 'web'; $('#phIn').hidden = true; $('#btQ').hidden = true;
  phoneMsg(L.phone === 'web' ? 'Press Run. Once the ESP32 joins Wi-Fi and starts its server, its page opens here.' : 'Press Run. The ESP32 will appear here as a Bluetooth device you can pair with.');
  phoneNet();
}
function phoneMsg(t) { $('#phBody').innerHTML = `<div class="ph-msg">${esc(t)}</div>`; shadow = null; }
function phoneNet() {
  const d = new Date(); $('#phTime').textContent = d.toTimeString().slice(0, 5);
  $('#phNet').textContent = phone.mode === 'bt' ? 'Bluetooth on' : wifiInfo && wifiInfo.state === 'connected' ? `Wi-Fi · ${wifiInfo.ssid}` : 'Wi-Fi · Workshop_2G';
}
function phoneEvent(e) {
  if (!phone.mode) return;
  if (e.type === 'reset') { phone.reset(); if (phone.mode === 'web') phoneMsg('ESP32 is starting…'); else phoneMsg('Searching for Bluetooth devices…'); $('#phIn').hidden = true; $('#btQ').hidden = true; }
  if (e.type === 'server') { phone.serverReady = true; if (wifiInfo && wifiInfo.state === 'connected') setTimeout(() => phoneLoad('/'), 300); }
  if (e.type === 'bt') {
    $('#phBody').innerHTML = `<div class="cap" style="color:#5b606b;margin:4px 2px 8px">Available devices</div><div class="bt-dev"><span><b>${esc(e.name)}</b><br><small style="color:#5b606b">ESP32 · Serial port</small></span><button id="btPair">Pair</button></div>`;
    $('#btPair').onclick = () => { sim.btConnect(true); };
  }
  if (e.type === 'btstate' && e.connected) {
    $('#phBody').innerHTML = `<div class="ph-msg" style="margin:6px 0 10px">Paired with ${esc(sim.bt ? sim.bt.name : 'ESP32')}. Send "on" or "off".</div>`;
    $('#phIn').hidden = false; $('#btQ').hidden = false; $('#phText').focus({ preventScroll: true });
  }
  if (e.type === 'btmsg') {
    phone.btBuf += e.text; let i;
    while ((i = phone.btBuf.indexOf('\n')) >= 0) { const line = phone.btBuf.slice(0, i).replace(/\r$/, ''); phone.btBuf = phone.btBuf.slice(i + 1); bubble(line, 'it'); }
  }
}
function bubble(t, who) { const b = document.createElement('div'); b.className = 'bub ' + who; b.textContent = t; $('#phBody').append(b); $('#phBody').scrollTop = 1e6; }
function sendBT(t) { if (!t) return; bubble(t, 'me'); sim.btSend(t + '\n'); }
$('#phIn').addEventListener('submit', (e) => { e.preventDefault(); sendBT($('#phText').value.trim()); $('#phText').value = ''; });
$('#btQ').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) sendBT(b.dataset.q); });
$('#phGo').addEventListener('click', () => { const v = $('#phUrl').value.replace(/^https?:\/\//, ''); const i = v.indexOf('/'); phoneLoad(i >= 0 ? v.slice(i) : '/'); });
$('#phUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#phGo').click(); });
async function phoneLoad(path, hops = 0) {
  phone.loaded = true; phone.path = path; $('#phUrl').value = '192.168.1.42' + path;
  const r = await sim.phoneRequest(path);
  if (r.code === 0) { phoneMsg(r.body); return; }
  if (r.code >= 300 && r.code < 400 && r.headers && r.headers.Location && hops < 3) return phoneLoad(r.headers.Location, hops + 1);
  const body = $('#phBody'); body.innerHTML = ''; const host = document.createElement('div'); body.append(host);
  shadow = host.attachShadow({ mode: 'open' });
  const base = `<style>:host{display:block;font:14px/1.45 system-ui,sans-serif;color:#1b1d22}h1{font-size:19px;margin:6px 0 10px}a{color:#2f6fd0}.btn,button{display:inline-block;background:#2f6fd0;color:#fff;border:0;border-radius:8px;padding:9px 14px;margin:4px 4px 4px 0;text-decoration:none;font-weight:600}pre{white-space:pre-wrap}</style>`;
  if (/html/.test(r.type || '')) {
    const doc = new DOMParser().parseFromString(r.body, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,meta,base').forEach(n => n.remove());
    doc.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name); }));
    shadow.innerHTML = base + [...doc.head.querySelectorAll('style')].map(s => s.outerHTML).join('') + doc.body.innerHTML;
  } else shadow.innerHTML = base + `<pre>${esc(r.body)}</pre>`;
  if (r.code >= 400) shadow.prepend(Object.assign(document.createElement('div'), { textContent: `HTTP ${r.code}`, style: 'color:#b42318;font-weight:600' }));
  shadow.addEventListener('click', (e) => {
    const a = e.composedPath().find(n => n.tagName === 'A'); if (!a) return; e.preventDefault();
    const href = a.getAttribute('href') || '/'; if (/^https?:/.test(href) && !href.includes('192.168.')) { toast('The phone only talks to the ESP32 in this simulator.'); return; }
    phoneLoad(href.replace(/^https?:\/\/[^/]+/, '') || '/');
  });
  shadow.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; const q = new URLSearchParams(new FormData(f)).toString(); phoneLoad((f.getAttribute('action') || phone.path) + (q ? '?' + q : '')); });
}

// ---------- overlays ----------
const ovl = $('#ovl');
function openOverlay(kind) {
  closeOverlay(); $$('.rail .nb').forEach(b => b.setAttribute('aria-current', b.dataset.nav === kind));
  const box = $('#ovlBox'); box.classList.toggle('drawer', kind === 'pinout'); ovl.classList.toggle('side', kind === 'pinout');
  const T = $('#ovlTitle'), B = $('#ovlBody');
  if (kind === 'lessons') {
    T.textContent = 'Lessons';
    B.innerHTML = `<p style="margin:0 0 12px;color:var(--ink2)">${done.size} of ${LESSONS.length} lessons complete. Quizzes marked with a star are all correct.</p>` + TRACKS.map(tr => `<div class="trk-h"><span class="cap">${tr}</span><span style="font-size:12px;color:var(--muted)">${LESSONS.filter(l => l.track === tr && done.has(l.id)).length}/${LESSONS.filter(l => l.track === tr).length}</span></div><div class="grid">${LESSONS.map((l, i) => l.track !== tr ? '' : `<button class="lc" style="width:auto" data-go="${i}" ${i === li ? 'aria-current="true"' : ''}>${thumbs.get(l.thumb) ? `<img src="${thumbs.get(l.thumb)}" alt="">` : '<span class="ph"></span>'}${l.badge ? `<span class="bdg">${icon(l.badge)}</span>` : ''}<span><span class="tt" style="display:block">${i + 1}. ${esc(l.title)}</span><span class="tr">${quizStar(l) ? '★ quiz · ' : ''}${done.has(l.id) ? 'Done' : 'Not started'}</span></span>${done.has(l.id) ? `<span class="done">${icon('check')}</span>` : ''}</button>`).join('')}</div>`).join('');
  } else if (kind === 'components') {
    T.textContent = 'Components';
    B.innerHTML = `<div class="grid">${COMPONENTS.map(cm => { const uses = LESSONS.map((l, i) => [l, i]).filter(([l]) => cm.id === 'board' ? true : (l.layout.parts || []).some(p => cm.types.includes(p.type)) || (cm.id === 'res' && (l.layout.parts || []).some(p => p.type === 'res'))); return `<div class="cc">${thumbs.get(cm.thumb) ? `<img src="${thumbs.get(cm.thumb)}" alt="">` : ''}<h3>${esc(cm.name)}</h3><p>${esc(cm.what)}</p><dl>${cm.specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${cm.id === 'board' ? '' : `<div class="uses">${uses.map(([l, i]) => `<button data-go="${i}">${i + 1}. ${esc(l.title)}</button>`).join('')}</div>`}</div>`; }).join('')}</div>`;
  } else if (kind === 'pinout') {
    T.textContent = 'Pin reference';
    const fl = ['all', 'io', 'adc1', 'adc2', 'touch', 'pwm', 'dac', 'i2c', 'spi', 'uart', 'in', 'strap', 'flash', 'power'];
    B.innerHTML = `<p style="margin:0 0 10px;color:var(--ink2);font-size:13px">All 38 header pins of the DevKitC V4. Hover a row to light it up on the board; click to zoom in.</p><div class="filters" id="pf">${fl.map(f => `<button data-f="${f}" aria-pressed="${f === 'all'}">${f === 'all' ? 'All' : TAGS[f][0]}</button>`).join('')}</div><div id="pfT">${pinTable(PINS)}</div>`;
    hookPinRows($('#pfT'));
    $('#pf').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; $$('#pf button').forEach(x => x.setAttribute('aria-pressed', x === b)); const f = b.dataset.f; $('#pfT').innerHTML = pinTable(f === 'all' ? PINS : PINS.filter(p => p[4].includes(f))); };
  } else if (kind === 'settings') {
    T.textContent = 'Settings';
    const seg = (k, opts) => `<div class="seg" data-set="${k}">${opts.map(([v, lab]) => `<button data-v="${v}" aria-pressed="${String(S[k]) === String(v)}">${lab}</button>`).join('')}</div>`;
    B.innerHTML = `<div class="set">
      <div><b>Theme</b><div class="d">Night blueprint is easier on the eyes in the dark.</div></div>${seg('theme', [['auto', 'Auto'], ['light', 'Day'], ['dark', 'Night']])}
      <div><b>Part labels</b><div class="d">Call-outs on the 3D view.</div></div>${seg('labels', [[true, 'On'], [false, 'Off']])}
      <div><b>Label detail</b><div class="d">Detailed shows descriptions without hovering.</div></div>${seg('detail', [[false, 'Compact'], [true, 'Detailed']])}
      <div><b>Current flow</b><div class="d">Animate current along wires while running.</div></div>${seg('flow', [[false, 'Off'], [true, 'On']])}
      <div><b>Sound</b><div class="d">Hear the buzzer through your speakers.</div></div>${seg('sound', [[true, 'On'], [false, 'Off']])}
      <div><b>Simulation speed</b><div class="d">Scales delay() and millis().</div></div>${seg('speed', [[0.5, '0.5×'], [1, '1×'], [2, '2×'], [4, '4×']])}
      <div><b>Pin activity in monitor</b><div class="d">Log pinMode / digitalWrite changes.</div></div>${seg('pinLog', [[true, 'On'], [false, 'Off']])}
      <div><b>Progress</b><div class="d">${done.size} lessons complete, saved in this browser.</div></div><button class="btn danger" id="rstProg">Reset progress</button>
      <div><b>Edited sketches</b><div class="d">${Object.keys(drafts).length} lesson${Object.keys(drafts).length === 1 ? '' : 's'} with your own edits.</div></div><button class="btn danger" id="rstCode">Restore all sketches</button>
    </div>`;
    B.onclick = (e) => {
      const b = e.target.closest('[data-v]');
      if (b) { const k = b.parentElement.dataset.set; let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; S[k] = v; applySettings(); if (k === 'flow') { stage.flowOn = v; $('#vFlow').setAttribute('aria-pressed', v); } if (k === 'pinLog') { sim.pinLog = v; $('#pinTg').setAttribute('aria-pressed', v); } if (k === 'sound' && v) initAudio(); [...b.parentElement.children].forEach(x => x.setAttribute('aria-pressed', x === b)); }
      if (e.target.id === 'rstProg') { done.clear(); store.set('done', []); for (const k in quiz) delete quiz[k]; store.set('quiz', quiz); renderStrip(); renderHud(); toast('Progress reset.'); openOverlay('settings'); }
      if (e.target.id === 'rstCode') { for (const k in drafts) delete drafts[k]; store.set('drafts', drafts); setCode(L.code); toast('All sketches restored to the originals.'); openOverlay('settings'); }
    };
  }
  B.addEventListener('click', goHandler);
  ovl.hidden = false; $('#ovlX').focus();
}
function goHandler(e) { const b = e.target.closest('[data-go]'); if (b) { closeOverlay(); select(+b.dataset.go); } }
function quizStar(l) { const st = quiz[l.id]; return st && l.quiz.every((q, i) => st[i] === q.a); }
function closeOverlay() { ovl.hidden = true; $('#ovlBody').onclick = null; $('#ovlBody').removeEventListener('click', goHandler); stage.highlightPins([]); $$('.rail .nb').forEach(b => b.removeAttribute('aria-current')); }
$('#ovlX').addEventListener('click', closeOverlay);
ovl.addEventListener('click', (e) => { if (e.target === ovl) closeOverlay(); });
$$('.rail .nb').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.nav; $('#app').classList.remove('rail-open'); $('#railBtn').setAttribute('aria-expanded', false);
  if (k === 'home') { closeOverlay(); select(0); stage.resetView(); }
  else if (k === 'sim') { closeOverlay(); if (!$('#codeCard').classList.contains('max')) toggleMax($('#codeCard')); ta.focus(); }
  else openOverlay(k);
}));
$('#railBtn').addEventListener('click', () => { const o = $('#app').classList.toggle('rail-open'); $('#railBtn').setAttribute('aria-expanded', o); });
$('#menuBtn').addEventListener('click', () => { $('#app').classList.add('rail-open'); });
document.addEventListener('click', (e) => { if (innerWidth <= 900 && $('#app').classList.contains('rail-open') && !e.target.closest('.rail,#menuBtn')) $('#app').classList.remove('rail-open'); });

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!ovl.hidden) closeOverlay(); $$('.card.max').forEach(x => x.classList.remove('max')); const s = $('.scrim'); if (s) s.remove(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement !== ta) { e.preventDefault(); runToggle(); }
});

// ---------- clock ----------
function tick() {
  const d = new Date(); const mo = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  $('#clock').innerHTML = `${mo} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}<br>${d.toTimeString().slice(0, 8)}`;
}
setInterval(tick, 1000); tick();

// ---------- routing ----------
window.addEventListener('hashchange', () => { const i = LESSONS.findIndex(l => l.id === location.hash.slice(1)); if (i >= 0 && i !== li) select(i); });

// ---------- boot ----------
(async () => {
  applySettings();
  renderStrip();
  const start = Math.max(0, LESSONS.findIndex(l => l.id === location.hash.slice(1)));
  try {
    const { default: b64 } = await import('./model.js');
    const bin = atob(b64); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    await stage.loadBoard(bytes.buffer);
  } catch (e) {
    console.error(e); $('#loader .cap').textContent = 'Could not load the 3D board. Reload to try again.'; return;
  }
  select(start, { noScroll: true });
  $('#loader').classList.add('gone'); setTimeout(() => $('#loader').remove(), 600);
  // thumbnails, one per frame
  const kinds = [...new Set([...LESSONS.map(l => l.thumb), ...COMPONENTS.map(c => c.thumb)])];
  let k = 0;
  const next = () => { if (k >= kinds.length) { renderStrip(); return; } try { thumbs.set(kinds[k], stage.thumb(kinds[k])); } catch (e) { console.warn('thumb', kinds[k], e); } k++; if (k % 4 === 0) renderStrip(); setTimeout(next, 30); };
  setTimeout(next, 200);
})();
