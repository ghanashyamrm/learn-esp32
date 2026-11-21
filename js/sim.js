// ESP32 Arduino sketch simulator: transpiles a C++ subset to async JS and runs it
// against a simulated board. Not cycle-accurate; built for learning.

const TYPES = 'void|int|long|short|float|double|bool|boolean|char|byte|word|String|size_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|unsigned|signed|auto|TaskHandle_t|IPAddress|esp_sleep_wakeup_cause_t|wl_status_t|SemaphoreHandle_t|touch_pad_t';
const INTISH = /^(?:unsigned\s+|signed\s+)?(int|long|short|byte|word|size_t|u?int\d+_t|unsigned|signed)(\s+(long|int))?$/;
const CLASSES = 'WebServer|Servo|DHT|Adafruit_SSD1306|BluetoothSerial|Preferences';
const ASYNC_API = ['delay', 'delayMicroseconds', 'vTaskDelay', 'pulseIn', '__yield', 'esp_light_sleep_start'];

export const ADC1 = { 36: 0, 37: 1, 38: 2, 39: 3, 32: 4, 33: 5, 34: 6, 35: 7 };
export const ADC2 = { 4: 0, 0: 1, 2: 2, 15: 3, 13: 4, 12: 5, 14: 6, 27: 7, 25: 8, 26: 9 };
export const TOUCH = { 4: 0, 0: 1, 2: 2, 15: 3, 13: 4, 12: 5, 14: 6, 27: 7, 33: 8, 32: 9 };
const INPUT_ONLY = [34, 35, 36, 39];
const FLASH = [6, 7, 8, 9, 10, 11];
const VALID = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];

// fast macrotask yield (setTimeout(0) is clamped to 4 ms when nested)
const _mc = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null; const _mq = [];
if (_mc) _mc.port1.onmessage = () => { const f = _mq.shift(); if (f) f(); };
let _lastFrameYield = 0;
function macro() {
  const now = performance.now();
  if (!_mc || now - _lastFrameYield > 30) { _lastFrameYield = now; return new Promise(r => setTimeout(r, 0)); }
  return new Promise(r => { _mq.push(r); _mc.port2.postMessage(0); });
}
class Stop { }
class Sleep { constructor(kind) { this.kind = kind; } }
class Restart { }
class TaskEnd { }
const STOP = new Stop();

// ---------------- transpiler ----------------
function matchParen(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') { d--; if (d === 0) return i; } }
  return -1;
}
function splitTop(s) {
  const out = []; let d = 0, cur = '';
  for (const c of s) { if ('([{'.includes(c)) d++; if (')]}'.includes(c)) d--; if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c; }
  out.push(cur); return out;
}
function convParams(p) {
  const nl = (p.match(/\n/g) || []).length;
  const t = p.trim(); if (!t || t === 'void') return '\n'.repeat(nl);
  return splitTop(t).map(x => {
    let [decl, def] = x.split('='); decl = decl.replace(/[*&]/g, ' ').replace(/\[\s*\w*\s*\]/g, '').trim();
    const name = decl.split(/\s+/).pop(); return def !== undefined ? `${name} = ${def.trim()}` : name;
  }).join(', ') + '\n'.repeat(nl);
}

export function transpile(src) {
  const strs = []; let out = ''; let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++; } i += 2; continue; }
    if (c === 'R' && d === '"' && !/\w/.test(src[i - 1] || '')) {
      const open = src.indexOf('(', i + 2); const delim = src.slice(i + 2, open);
      const close = open > 0 ? src.indexOf(')' + delim + '"', open) : -1;
      if (open > 0 && close > 0 && delim.length < 20) {
        const body = src.slice(open + 1, close); const nl = (body.match(/\n/g) || []).length;
        strs.push({ js: '`' + body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`', nl });
        out += `__S${strs.length - 1}__` + '\n'.repeat(nl); i = close + delim.length + 2; continue;
      }
    }
    if (c === '"' || c === "'") {
      let j = i + 1; while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      strs.push({ js: src.slice(i, j + 1), nl: 0 }); out += `__S${strs.length - 1}__`; i = j + 1; continue;
    }
    out += c; i++;
  }
  // preprocessor
  let code = out.split('\n').map(l => {
    const t = l.trim();
    if (/^#\s*(include|pragma|if|ifdef|ifndef|endif|else|elif|undef|error|warning)\b/.test(t)) return '';
    let m = t.match(/^#define\s+(\w+)\(([^)]*)\)\s+(.+)$/); if (m) return `const ${m[1]} = (${m[2]}) => (${m[3]});`;
    m = t.match(/^#define\s+(\w+)\s+(.+)$/); if (m) return `const ${m[1]} = ${m[2]};`;
    if (/^#define\s+\w+\s*$/.test(t)) return '';
    return l;
  }).join('\n');
  // adjacent string literal concatenation
  code = code.replace(/(__S\d+__)([ \t\n]+)(?=__S\d+__)/g, '$1 +$2');
  const rtc = [];
  code = code
    .replace(/->/g, '.').replace(/::/g, '.').replace(/\bstd\./g, '')
    .replace(/\bnullptr\b|\bNULL\b/g, 'null')
    .replace(/\b(0x[0-9a-fA-F]+|\d+)(?:ULL|UL|LL|L|U)\b/g, '$1').replace(/\b(\d+\.\d*|\.\d+)[fF]\b/g, '$1')
    .replace(/\bGPIO_NUM_(\d+)\b/g, '$1')
    .replace(/\bsizeof\s*\(\s*(\w+)\s*\)\s*\/\s*sizeof\s*\(\s*\1\s*\[\s*0\s*\]\s*\)/g, '$1.length')
    .replace(/RTC_DATA_ATTR\s+(?:const\s+)?(?:unsigned\s+)?\w+\s+(\w+)\s*=\s*([^;]+);/g, (m, a, b) => { rtc.push(a); return `let ${a} = __rtc('${a}', ${b});`; })
    .replace(/RTC_DATA_ATTR\s+(?:const\s+)?(?:unsigned\s+)?\w+\s+(\w+)\s*;/g, (m, a) => { rtc.push(a); return `let ${a} = __rtc('${a}', 0);`; })
    .replace(/\b(PROGMEM|static|volatile|IRAM_ATTR|inline|extern|register|DRAM_ATTR|ICACHE_RAM_ATTR)\b[ \t]*/g, '')
    .replace(/\(\s*(?:unsigned\s+)?(?:int|long|float|double|byte|char|bool|uint8_t|uint16_t|uint32_t|int16_t|int32_t|size_t)\s*\)\s*/g, '')
    .replace(/([(,=]\s*)&(?=[A-Za-z_])/g, '$1')
    .replace(/(?<![\w.])String\s*\(/g, '__S(').replace(/(?<![\w.])yield\s*\(\s*\)/g, '__yield()')
    .replace(/\.length\s*\(\s*\)/g, '.length')
    .replace(/\b(\w+)\.(trim|toUpperCase|toLowerCase)\s*\(\s*\)\s*;/g, '$1 = $1.$2();')
    .replace(/\b(\w+)\.replace\s*\(([^;\n]*)\)\s*;/g, '$1 = $1.replaceAll($2);')
    .replace(/\b(\w+)\.concat\s*\(([^;\n]*)\)\s*;/g, '$1 = $1 + ($2);')
    .replace(/\bsnprintf\s*\(\s*(\w+)\s*,\s*[^,]+,/g, '$1 = __fmt(').replace(/\bsprintf\s*\(\s*(\w+)\s*,/g, '$1 = __fmt(');
  // objects:  WebServer server(80);  Servo s;
  code = code.replace(new RegExp(`(^|[;{}\\n])([ \\t]*)(${CLASSES})\\s+(\\w+)\\s*(?:\\(([^;\\n]*)\\))?\\s*;`, 'g'), (m, pre, ws, cls, name, args) => `${pre}${ws}let ${name} = new ${cls}(${args || ''});`);
  // C++ lambdas → async arrows
  code = code.replace(/\[\s*[&=]?\s*\]\s*\(([^)]*)\)\s*(?:->\s*\w+\s*)?\{/g, (m, p) => `async (${convParams(p)}) => {`);
  // functions
  const fns = new Set();
  code = code.replace(new RegExp(`^([ \\t]*)(?:const\\s+)?(?:unsigned\\s+|signed\\s+)?(?:${TYPES})(?:\\s+(?:long|int|char))?\\s*[*&]?\\s+(\\w+)\\s*\\(([^)]*)\\)(\\s*)\\{`, 'gm'), (m, ws, name, params, sp) => {
    fns.add(name); return `${ws}async function ${name}(${convParams(params)})${sp}{`;
  });
  code = code.replace(new RegExp(`^([ \\t]*)(?:const\\s+)?(?:unsigned\\s+)?(?:${TYPES})(?:\\s+(?:long|int))?\\s*[*&]?\\s+(\\w+)\\s*\\([^)]*\\)\\s*;`, 'gm'), (m, ws, name) => fns.has(name) ? ws : m);
  // range-for
  code = code.replace(new RegExp(`for\\s*\\(\\s*(?:const\\s+)?(?:${TYPES})\\s*[&*]?\\s*(\\w+)\\s*:\\s*([\\w.]+)\\s*\\)`, 'g'), 'for (let $1 of $2)');
  // declarations
  const DECL = new RegExp(`(^|[;{}(\\n])([ \\t]*)(const\\s+)?((?:unsigned\\s+|signed\\s+)?(?:${TYPES})(?:\\s+(?:long|int))?)\\s*[*&]?\\s+(?=[A-Za-z_])`, 'g');
  let res = '', pos = 0, m;
  while ((m = DECL.exec(code))) {
    const start = m.index + m[1].length; const after = m.index + m[0].length;
    // find end ';' at depth 0 (or ')' for weird cases)
    let j = after, d = 0;
    for (; j < code.length; j++) { const c = code[j]; if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) { if (d === 0) break; d--; } else if (c === ';' && d === 0) break; }
    const body = code.slice(after, j);
    const decls = splitTop(body).map(dc => {
      const mm = dc.match(/^(\s*)(\w+)\s*((?:\[\s*[^\]]*\]\s*)*)([\s\S]*)$/); if (!mm) return dc;
      let [, ws0, name, arr, rest] = mm; rest = rest.replace(/^\s+/, '');
      let init = rest.startsWith('=') ? rest.slice(1) : null;
      const isArr = !!arr.trim(); const base = m[4].trim();
      if (isArr) {
        if (init !== null) { const t = init.trim(); if (t.startsWith('{')) { const k = init.indexOf('{'); const e = init.lastIndexOf('}'); init = init.slice(0, k) + '[' + init.slice(k + 1, e) + ']' + init.slice(e + 1); } }
        else { const size = (arr.match(/\[\s*([^\]]*)\]/) || [])[1] || '0'; init = base === 'char' ? ' ""' : ` new Array(${size}).fill(0)`; }
      } else if (init === null) {
        init = base === 'String' ? ' ""' : /bool/.test(base) ? ' false' : base === 'IPAddress' ? ' null' : ' 0';
      } else if (INTISH.test(base) && /\//.test(init)) init = ` __i(${init.trim()})`;
      return `${ws0}${name} =${init}`;
    });
    res += code.slice(pos, start) + m[2] + (m[3] ? 'const ' : 'let ') + decls.join(',');
    pos = j; DECL.lastIndex = j;
  }
  code = res + code.slice(pos);
  // awaits
  const names = [...fns, ...ASYNC_API];
  code = code.replace(new RegExp(`(?<![\\w.])(?<!function )(${names.join('|')})\\s*\\(`, 'g'), 'await $1(');
  code = code.replace(/\b(\w+\.(?:handleClient|scanNetworks))\s*\(/g, 'await $1(');
  code = code.replace(/\bfor\s*\(\s*;\s*;\s*\)/g, 'while (true)');
  // guard while-loops so they can't freeze the page
  let k = 0;
  while ((k = code.indexOf('while', k)) !== -1) {
    if (/\w/.test(code[k - 1] || '') || /\w/.test(code[k + 5] || '')) { k += 5; continue; }
    const o = code.indexOf('(', k); if (o < 0 || code.slice(k + 5, o).trim()) { k += 5; continue; }
    const cl = matchParen(code, o); if (cl < 0) break;
    code = code.slice(0, o) + '(await __ly() && (' + code.slice(o + 1, cl) + '))' + code.slice(cl + 1); k = cl + 20;
  }
  // per-line instrumentation
  const lines = code.split('\n'); let prev = '';
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li]; const t = l.trim();
    const ctl = /^(if|for|while|else|do)\b/.test(prev) && !/[;{}]$/.test(prev);
    const cont = /[,(+\-*/&|?:=]$/.test(prev) && !/\+\+$|--$/.test(prev);
    if (t && t.endsWith(';') && !/^(for\b|[}\])]|else\b|case\b|default\b|async function|;|\.|const \w+ = \(.*=>)/.test(t) && !ctl && !cont)
      lines[li] = l.replace(/^(\s*)/, `$1await __ln(${li + 1}); `);
    if (t) prev = t;
    lines[li] = lines[li].replace(/xPortGetCoreID\s*\(\s*\)/g, `xPortGetCoreID(${li + 1})`);
  }
  code = lines.join('\n');
  const fnLines = {}; const re = /async function (\w+)\s*\(/g; let fm;
  while ((fm = re.exec(code))) {
    const ob = code.indexOf('{', code.indexOf(')', fm.index)); const cb = matchParen(code, ob);
    const ln = (ix) => code.slice(0, ix).split('\n').length;
    if (cb > 0) fnLines[fm[1]] = [ln(fm.index), ln(cb)];
  }
  code = code.replace(/__S(\d+)__(\n*)/g, (m, id, nls) => { const s = strs[+id]; return s.js + nls.slice(s.nl); });
  return { code, fns: [...fns], rtc, fnLines };
}

// lint: things Arduino would reject that JS would silently accept
export function lint(src) {
  const lines = src.split('\n'); let depth = 0; let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (inBlock) { if (l.includes('*/')) { inBlock = false; l = l.slice(l.indexOf('*/') + 2); } else continue; }
    l = l.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/\/\/.*$/, '');
    if (l.includes('/*')) { inBlock = !l.includes('*/'); l = l.replace(/\/\*.*?(\*\/|$)/, ''); }
    const t = l.trim(); if (!t || t.startsWith('#')) continue;
    for (const c of t) { if (c === '{') depth++; if (c === '}') depth--; }
    if (depth < 0) return { line: i + 1, msg: "expected declaration before '}' token" };
    const next = (lines.slice(i + 1).find(x => x.trim() && !x.trim().startsWith('//')) || '').trim();
    if (!/[;{},]$/.test(t) && /^[\w.\[\]]+\s*(\(.*\)|[+-]{2}|\s*[+\-*/]?=\s*.+)$/.test(t) && !/^(if|for|while|switch|else|return|do)\b/.test(t) && !/^(void|int|bool|float|String|long|double|char)\b.*\)$/.test(t)
      && !next.startsWith('{') && !next.startsWith('.') && !/^[+\-*/&|?:]/.test(next) && !/[,(]$/.test(t) && depth > 0)
      return { line: i + 1, msg: "expected ';' before next statement" };
  }
  if (depth > 0) return { line: lines.length, msg: "expected '}' at end of input" };
  return null;
}

// Arduino String methods on JS strings
for (const [k, f] of Object.entries({
  toInt() { return parseInt(this) || 0; }, toFloat() { return parseFloat(this) || 0; }, toDouble() { return parseFloat(this) || 0; },
  c_str() { return String(this); }, equals(o) { return String(this) === String(o); }, equalsIgnoreCase(o) { return String(this).toLowerCase() === String(o).toLowerCase(); },
  isEmpty() { return this.length === 0; }, compareTo(o) { return String(this) < o ? -1 : String(this) > o ? 1 : 0; },
})) if (!String.prototype[k]) Object.defineProperty(String.prototype, k, { value: f, configurable: true, writable: true });

// ---------------- formatting helpers ----------------
export function cfmt(f, ...a) {
  let ai = 0;
  return String(f).replace(/%([-+ 0#]*)(\d+|\*)?(?:\.(\d+))?(hh|h|ll|l|z)?([diufFsScxXoeEgp%])/g, (m, flags, w, prec, len, t) => {
    if (t === '%') return '%';
    let v = a[ai++]; let s;
    switch (t) {
      case 'd': case 'i': case 'u': s = String(Math.trunc(Number(v) || 0)); break;
      case 'f': case 'F': s = (Number(v) || 0).toFixed(prec === undefined ? 6 : +prec); break;
      case 'e': case 'E': s = (Number(v) || 0).toExponential(prec === undefined ? 6 : +prec); break;
      case 'g': s = String(+(Number(v) || 0).toPrecision(prec ? +prec : 6)); break;
      case 'x': s = (Number(v) >>> 0).toString(16); break; case 'X': s = (Number(v) >>> 0).toString(16).toUpperCase(); break;
      case 'o': s = (Number(v) >>> 0).toString(8); break;
      case 'c': s = typeof v === 'number' ? String.fromCharCode(v) : String(v)[0] || ''; break;
      case 'p': s = '0x3ffb0000'; break;
      default: s = v === undefined ? '' : String(v); if (prec !== undefined) s = s.slice(0, +prec);
    }
    const W = +(w || 0);
    if (s.length < W) s = flags.includes('-') ? s.padEnd(W) : flags.includes('0') && /[diufFxXo]/.test(t) ? (s[0] === '-' ? '-' + s.slice(1).padStart(W - 1, '0') : s.padStart(W, '0')) : s.padStart(W);
    return s;
  });
}
function valStr(v, f) {
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') {
    if (f === 16 || f === 2 || f === 8) return Number.isInteger(v) ? (v >>> 0).toString(f).toUpperCase() : v.toFixed(2);
    if (f === 10) return String(Math.trunc(v));
    if (Number.isInteger(v)) return String(v);
    if (!isFinite(v)) return isNaN(v) ? 'nan' : 'inf';
    return v.toFixed(f ?? 2);
  }
  if (v === null || v === undefined) return '';
  return String(v);
}

// ---------------- 5x7 OLED font (rasterised once from a mono font) ----------------
let FONT = null;
function font() {
  if (FONT) return FONT;
  const c = document.createElement('canvas'); c.width = 48; c.height = 80; const x = c.getContext('2d', { willReadFrequently: true });
  FONT = {};
  for (let ch = 32; ch < 127; ch++) {
    x.clearRect(0, 0, 48, 80); x.fillStyle = '#fff'; x.font = 'bold 56px "IBM Plex Mono", "Courier New", monospace'; x.textBaseline = 'alphabetic';
    x.fillText(String.fromCharCode(ch), 4, 56);
    const d = x.getImageData(0, 0, 48, 80).data; const rows = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let q = 0; q < 5; q++) {
        let s = 0, cnt = 0;
        for (let yy = 13 + r * 7; yy < 13 + (r + 1) * 7; yy++) for (let xx = 4 + q * 6.6; xx < 4 + (q + 1) * 6.6; xx++) { s += d[(yy * 48 + Math.floor(xx)) * 4 + 3]; cnt++; }
        row.push(s / cnt / 255 > 0.33 ? 1 : 0);
      }
      rows.push(row);
    }
    FONT[ch] = rows;
  }
  return FONT;
}

// ---------------- simulated hardware state (read by the 3D stage) ----------------
export class Hardware {
  constructor() { this.inputs = {}; this.reset(); }
  reset() { this.pins = {}; this.servos = {}; this.tones = {}; this.oled = null; this.running = false; this.sleeping = false; this.radio = 0; this.pings = 0; this.coreAct = [0, 0]; }
  pin(n) { return this.pins[n] || (this.pins[n] = { mode: null, out: 0, duty: null, res: 8, dac: null }); }
  level(n) {
    const p = this.pins[n]; if (!p || this.sleeping || !this.running) return 0;
    if (p.duty !== null) return Math.max(0, Math.min(1, p.duty / ((1 << p.res) - 1)));
    if (p.dac !== null) return p.dac / 255;
    return p.mode === 'OUTPUT' ? p.out : 0;
  }
  tone(n) { return this.sleeping || !this.running ? 0 : (this.tones[n] || 0); }
  servo(n) { return this.servos[n] ?? null; }
  input(id) { return this.inputs[id]; }
}

const NETWORKS = [
  { ssid: 'Workshop_2G', rssi: -47, enc: 3, ch: 6 }, { ssid: 'ESP32-Lab', rssi: -55, enc: 3, ch: 1 },
  { ssid: 'Cafe_Free_WiFi', rssi: -68, enc: 0, ch: 11 }, { ssid: 'Hostel_Block_C', rssi: -73, enc: 4, ch: 6 }, { ssid: 'AndroidAP_7F3A', rssi: -82, enc: 3, ch: 3 },
];

// ---------------- the simulator ----------------
export class Sim {
  constructor(hw, io) {
    this.hw = hw; this.io = io; this.gen = 0; this.speed = 1; this.uiBaud = 115200; this.pinLog = true;
    this.lesson = null; this.rtcStore = {}; this.rx = ''; this.wakeCause = 0;
  }
  setLesson(L) {
    this.lesson = L; this.devices = (L.layout && L.layout.parts) || [];
    const inp = {};
    for (const d of this.devices) {
      if (d.type === 'button' || d.type === 'touch') inp[d.id] = false;
      if (d.type === 'pot') inp[d.id] = 0.5;
      if (d.type === 'ldr') inp[d.id] = 0.6;
      if (d.type === 'dht') inp[d.id] = { t: 26.4, h: 58 };
      if (d.type === 'sonar') inp[d.id] = 42;
    }
    inp.boot = false; this.hw.inputs = inp;
  }
  dev(pred) { return this.devices.find(pred); }

  // inputs from the UI
  setInput(id, v) {
    const before = this._pinLevelsFor(id);
    this.hw.inputs[id] = v;
    const after = this._pinLevelsFor(id);
    for (const [pin, b] of Object.entries(before)) {
      const a = after[pin];
      const isr = this.isrs && this.isrs[pin];
      if (isr && a !== b && this.hw.running && !this.hw.sleeping) {
        if (isr.mode === 'CHANGE' || (isr.mode === 'FALLING' && a === 0) || (isr.mode === 'RISING' && a === 1)) this.isrQ.push(isr.fn);
      }
    }
    const t = this.touchIsr && this.touchIsr[this._touchPinOf(id)];
    if (t && v === true && this.hw.running) this.isrQ.push(t.fn);
    if (this.hw.sleeping && this.wakeOn) {
      if (this.wakeOn.ext0 && id === this._devIdForPin(this.wakeOn.ext0.pin) && after[this.wakeOn.ext0.pin] === this.wakeOn.ext0.level) this._wake(2);
      if (this.wakeOn.touch && this.dev(d => d.id === id && d.type === 'touch') && v) this._wake(5);
    }
  }
  _touchPinOf(id) { const d = this.dev(x => x.id === id && x.type === 'touch'); return d ? d.pin : -1; }
  _devIdForPin(pin) { if (+pin === 0) return 'boot'; const d = this.dev(x => x.pin === +pin); return d ? d.id : null; }
  _pinLevelsFor(id) {
    const r = {};
    if (id === 'boot') r[0] = this._dread(0);
    for (const d of this.devices) if (d.id === id && d.pin !== undefined) r[d.pin] = this._dread(d.pin);
    return r;
  }
  _dread(pin) {
    pin = +pin; const p = this.hw.pins[pin] || {};
    if (p.mode === 'OUTPUT') return p.out;
    if (pin === 0) return this.hw.inputs.boot ? 0 : 1;
    const d = this.devices.find(x => x.pin === pin);
    if (d && d.type === 'button') {
      const pressed = !!this.hw.inputs[d.id];
      if (pressed) return d.active === 'high' ? 1 : 0;
    }
    if (d && d.type === 'dht') return 1;
    if (p.mode === 'INPUT_PULLUP') return 1;
    if (p.mode === 'INPUT_PULLDOWN') return 0;
    return 0;
  }

  // ---- output ----
  out(text, kind = 'out') { this.io.serial(text, kind); }
  warnOnce(key, msg) { this._warned = this._warned || new Set(); if (this._warned.has(key)) return; this._warned.add(key); this.out(`⚠ ${msg}\n`, 'warn'); }
  plog(msg) {
    if (!this.pinLog) return; const now = performance.now();
    if (now - (this._plT || 0) > 250) { this._plT = now; this._plN = 0; }
    if (++this._plN > 14) return; this.out(msg + '\n', 'pin');
  }
  serialWrite(s) {
    if (!this.serialOn) return;
    if (this.baud !== this.uiBaud) { s = s.replace(/[^\n]/g, () => String.fromCharCode(0xA1 + Math.floor(Math.random() * 90))); if (!this._baudHint) { this._baudHint = true; this.io.baudMismatch(this.baud); } }
    this.out(s, 'out');
  }

  // ---- compile ----
  compile(src) {
    const lerr = lint(src);
    if (lerr) return { error: lerr.msg, line: lerr.line };
    let t;
    try { t = transpile(src); } catch (e) { return { error: 'could not parse sketch: ' + e.message, line: 0 }; }
    const keys = Object.keys(this._api(-1));
    const body = `const {${keys.join(',')}} = __api;\nreturn (async () => {\n${t.code}\n;__api.__snap = () => ({${t.rtc.join(',')}});\nreturn { setup: typeof setup === 'function' ? setup : null, loop: typeof loop === 'function' ? loop : null };\n})();`;
    let factory = null;
    try { factory = new Function('__api', body); } catch (e) {
      if (e instanceof SyntaxError) return { error: this._syntaxHint(e.message), line: 0 };
      try { factory = this._scriptFactory(body); } catch (e2) { return { error: 'compiler unavailable: ' + e2.message, line: 0 }; }
    }
    if (!t.code.includes('async function setup')) return { error: "undefined reference to 'setup()'", line: 0 };
    if (!t.code.includes('async function loop')) return { error: "undefined reference to 'loop()'", line: 0 };
    const lineFn = []; for (const [f, [a, b]] of Object.entries(t.fnLines)) for (let i = a; i <= b; i++) if (!lineFn[i]) lineFn[i] = f;
    return { factory, js: t.code, lineFn };
  }
  _syntaxHint(m) { return m.replace(/^Unexpected token/, 'expected primary-expression before').replace(/Invalid or unexpected token/, 'stray character in program'); }
  _scriptFactory(body) {
    const id = '__sk' + Math.random().toString(36).slice(2);
    const s = document.createElement('script'); s.textContent = `window.${id} = function(__api){${body}}`;
    document.head.appendChild(s); s.remove(); const f = window[id]; delete window[id];
    if (!f) throw new Error('script injection blocked'); return f;
  }

  // ---- run / stop ----
  stop(reason) {
    this.gen++; for (const t of this.timers || []) clearTimeout(t); this.timers = new Set();
    this.hw.running = false; this.hw.sleeping = false; this.hw.radio = 0; this.hw.tones = {};
    this.io.status('stopped', reason); this.io.line(0); this._stopAudio && this._stopAudio();
  }
  async run(src, opts = {}) {
    try { return await this._run(src, opts); } catch (e) { if (e !== STOP) console.error(e); return false; }
  }
  async _run(src, opts) {
    this.stop(); const gen = this.gen;
    this.io.status('compiling');
    await this._wait(380, gen, true);
    const c = this.compile(src);
    if (c.error) { this.io.compileError(c.error, c.line); this.io.status('error'); return false; }
    this.compiled = c; this.rtcStore = {}; this.wakeCause = 0; this.bootCount = 0;
    this.io.status('uploading'); this.out('Connecting....\nChip is ESP32-D0WD-V3 (revision v3.1)\nFeatures: WiFi, BT, Dual Core, 240MHz\nWriting at 0x00010000... (100 %)\nHard resetting via RTS pin...\n', 'sys');
    await this._wait(650, gen, true);
    if (gen !== this.gen) return false;
    this._boot(gen, 1);
    return true;
  }
  _wait(ms, gen, real) { return new Promise((res, rej) => { const id = setTimeout(() => { this.timers.delete(id); gen === this.gen ? res() : rej(STOP); }, real ? ms : ms / this.speed); this.timers.add(id); }); }

  async _boot(gen, rst) {
    const hw = this.hw; hw.reset(); hw.running = true; this.io.status('running');
    this._warned = new Set(); this.serialOn = false; this.baud = 115200; this._baudHint = false;
    this.t0 = performance.now(); this.ops = 0; this.isrs = {}; this.isrQ = []; this.touchIsr = {}; this.ledcCh = {};
    this.wifi = { state: 'off', connectAt: 0, ssid: '', ap: false }; this.server = null; this.bt = null; this.wakeOn = null; this.tasks = [];
    this.core = 1; this.taskCore = {}; this.io.wifi(null); this.io.phone({ type: 'reset' });
    const rstMsg = rst === 5 ? 'rst:0x5 (DEEPSLEEP_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)' : rst === 12 ? 'rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)' : 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)';
    this.out(`\nets Jul 29 2019 12:21:46\n\n${rstMsg}\nconfigsip: 0, SPIWP:0xee\nmode:DIO, clock div:1\nentry 0x400805e4\n`, 'sys');
    const api = this._api(gen); this.api = api;
    try {
      const prog = await this.compiled.factory(api);
      if (prog.setup) await prog.setup();
      let iter = 0;
      while (gen === this.gen) {
        const before = this.ops;
        if (prog.loop) await prog.loop(); else await this._wait(50, gen);
        if (this.ops - before < 1) await this._wait(8, gen, true);
        else if (++iter % 150 === 0) { await macro(); if (gen !== this.gen) return; }
      }
    } catch (e) { this._handle(e, gen); }
  }
  _handle(e, gen) {
    if (e === STOP || e instanceof Stop || gen !== this.gen) return;
    if (e instanceof TaskEnd) return;
    if (e instanceof Sleep) return this._sleep(gen, e.kind);
    if (e instanceof Restart) { this.gen++; const g = this.gen; this.out('\nRebooting...\n', 'sys'); setTimeout(() => this._boot(g, 12), 400); return; }
    const line = this.lineNo || 0;
    let msg = String(e && e.message || e);
    let m;
    if (e instanceof ReferenceError && (m = msg.match(/^(\w+) is not defined/))) msg = `'${m[1]}' was not declared in this scope`;
    else if (e instanceof TypeError && (m = msg.match(/(\S+) is not a function/))) msg = `'${m[1]}' is not available in this simulator`;
    else if (e instanceof TypeError && /Assignment to constant/.test(msg)) msg = 'assignment of read-only variable';
    this.io.runtimeError(msg, line); this.stop('error'); this.io.status('error');
  }
  async _sleep(gen, kind) {
    const hw = this.hw;
    this.rtcStore = this.api.__snap ? this.api.__snap() : {};
    this.gen++; const g = this.gen; hw.sleeping = true; hw.radio = 0; hw.tones = {}; this.io.wifi(null); this.io.status('sleeping');
    const us = this.wakeOn && this.wakeOn.timer;
    this.out(kind === 'light' ? '' : '', 'sys');
    if (us) {
      const ms = us / 1000 / this.speed; const shown = Math.min(ms, 12000);
      if (ms > 12000) this.out(`(sleep of ${(us / 1e6).toFixed(0)} s shortened to 12 s in the simulator)\n`, 'sys');
      this._sleepTimer = setTimeout(() => { if (g === this.gen) this._wake(4); }, shown);
    } else if (!this.wakeOn || (!this.wakeOn.ext0 && !this.wakeOn.touch)) this.out('(no wake-up source set: the chip would sleep forever — press Run or EN to reset)\n', 'sys');
  }
  _wake(cause) {
    clearTimeout(this._sleepTimer); this.gen++; const g = this.gen; this.wakeCause = cause; this.hw.sleeping = false;
    this._boot(g, 5);
  }
  pressEN() { if (!this.compiled) return; this.gen++; const g = this.gen; clearTimeout(this._sleepTimer); this.wakeCause = 0; this.rtcStore = {}; this.out('\n', 'sys'); this._boot(g, 1); }
  get running() { return this.hw.running; }

  // ---- phone / bluetooth bridge ----
  phoneRequest(path) {
    return new Promise((resolve) => {
      const reachable = this.hw.running && !this.hw.sleeping && this.server && this.server.begun && (this.wifi.state === 'connected' || this.wifi.ap);
      if (!reachable) return setTimeout(() => resolve({ code: 0, body: this.hw.running ? 'The ESP32 is not serving pages yet. Is WiFi connected and server.begin() called?' : 'No response. Run the sketch first.' }), 700);
      const [p, q] = path.split('?'); const args = {};
      (q || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); args[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' ')); });
      const req = { path: p || '/', args, resolve, done: false };
      this.server.queue.push(req);
      setTimeout(() => { if (!req.done) { req.done = true; resolve({ code: 0, body: 'Request timed out. Does loop() call server.handleClient()?' }); } }, 5000);
    });
  }
  btConnect(on) { if (this.bt) { this.bt.connected = on; this.io.phone({ type: 'btstate', connected: on }); } }
  btSend(text) { if (this.bt && this.bt.connected) this.bt.rx += text; }
  serialSend(text) { this.rx += text; }

  // ---------------- Arduino / ESP32 API ----------------
  _api(gen) {
    const sim = this, hw = this.hw;
    const now = () => (performance.now() - sim.t0) * sim.speed;
    const pinOk = (p, what) => {
      p = +p;
      if (!VALID.includes(p)) sim.warnOnce('inv' + p, `GPIO${p} does not exist on the ESP32 (${what})`);
      else if (FLASH.includes(p)) sim.warnOnce('fl' + p, `GPIO${p} is wired to the SPI flash chip. Using it will crash a real board.`);
      return p;
    };
    const sleepMs = async (ms) => {
      if (gen !== sim.gen) throw STOP; const c = sim.core;
      await new Promise((res) => { const id = setTimeout(() => { sim.timers.delete(id); res(); }, Math.max(0, ms) / sim.speed); sim.timers.add(id); });
      if (gen !== sim.gen) throw STOP; sim.core = c;
    };
    const yieldNow = async () => { const c = sim.core; await macro(); if (gen !== sim.gen) throw STOP; sim.core = c; };
    const runIsrs = async () => { const q = sim.isrQ.splice(0); for (const f of q) await f(); };
    const ln = (n) => {
      if (gen !== sim.gen) throw STOP;
      sim.lineNo = n; sim.io.line(n);
      const fnm = sim.compiled.lineFn[n]; sim.core = fnm && fnm in sim.taskCore ? sim.taskCore[fnm] : 1; hw.coreAct[sim.core] = performance.now();
      if (++sim.ops % 1500 === 0) return yieldNow();
      if (sim.isrQ.length) return runIsrs();
    };
    const ly = async () => {
      if (gen !== sim.gen) throw STOP; if (++sim.ops % 400 === 0) await yieldNow(); if (sim.isrQ.length) await runIsrs(); return true; };

    const A = {
      __ln: ln, __ly: ly,
      __i: (v) => Math.trunc(v),
      __S: (v, d) => typeof v === 'number' && d !== undefined ? (d === 16 || d === 2 ? (v >>> 0).toString(d).toUpperCase() : (d === 10 ? String(Math.trunc(v)) : v.toFixed(d))) : valStr(v),
      __fmt: (f, ...a) => cfmt(f, ...a),
      __rtc: (name, init) => (name in sim.rtcStore ? sim.rtcStore[name] : init),
      F: (s) => s, PSTR: (s) => s,
      HIGH: 1, LOW: 0, INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP', INPUT_PULLDOWN: 'INPUT_PULLDOWN', OUTPUT_OPEN_DRAIN: 'OUTPUT',
      LED_BUILTIN: 2, RISING: 'RISING', FALLING: 'FALLING', CHANGE: 'CHANGE', ONLOW: 'FALLING', ONHIGH: 'RISING',
      DEC: 10, HEX: 16, BIN: 2, OCT: 8, PI: Math.PI, TWO_PI: Math.PI * 2, HALF_PI: Math.PI / 2, DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI,
      A0: 36, A3: 39, A4: 32, A5: 33, A6: 34, A7: 35, DAC1: 25, DAC2: 26,
      T0: 4, T1: 0, T2: 2, T3: 15, T4: 13, T5: 12, T6: 14, T7: 27, T8: 33, T9: 32,
      SDA: 21, SCL: 22, MOSI: 23, MISO: 19, SCK: 18, SS: 5, TX: 1, RX: 3,
      pinMode(p, m) {
        p = pinOk(p, 'pinMode');
        if (m === 'OUTPUT' && INPUT_ONLY.includes(p)) { sim.warnOnce('io' + p, `GPIO${p} is input-only (GPIO34–39 have no output driver). It can't light an LED.`); m = 'INPUT'; }
        hw.pin(p).mode = m; sim.plog(`pinMode(${p}, ${m})`);
      },
      digitalWrite(p, v) {
        p = +p; const pin = hw.pin(p); v = v ? 1 : 0;
        if (INPUT_ONLY.includes(p)) { sim.warnOnce('io' + p, `GPIO${p} is input-only (GPIO34–39 have no output driver). It can't light an LED.`); return; }
        if (pin.mode !== 'OUTPUT') sim.warnOnce('nm' + p, `digitalWrite(${p}) but pinMode(${p}, OUTPUT) was never called, so the pin isn't driving anything.`);
        pin.duty = null; pin.dac = null;
        if (pin.out !== v || pin.mode !== 'OUTPUT') sim.plog(`GPIO${p} → ${v ? 'HIGH' : 'LOW'}`);
        pin.out = v;
      },
      digitalRead(p) { return sim._dread(+p); },
      analogRead(p) {
        p = +p;
        if (!(p in ADC1) && !(p in ADC2)) { sim.warnOnce('na' + p, `GPIO${p} has no ADC. Use 32–39 (ADC1) for analog input.`); return 0; }
        if ((p in ADC2) && (sim.wifi.state !== 'off')) { sim.warnOnce('adc2' + p, `GPIO${p} is on ADC2, which Wi-Fi takes over. Use an ADC1 pin (32–39) with Wi-Fi.`); return 0; }
        return Math.round(sim._analog(p) * 4095);
      },
      analogReadMilliVolts(p) { return Math.round(sim._analog(+p) * 3100 + 75); },
      analogReadResolution() { }, analogSetAttenuation() { }, analogSetPinAttenuation() { }, adcAttachPin() { return true; },
      analogWrite(p, v) { p = +p; const pin = hw.pin(p); if (pin.mode !== 'OUTPUT') pin.mode = 'OUTPUT'; pin.res = 8; pin.duty = Math.max(0, Math.min(255, v)); sim.plog(`GPIO${p} PWM ${pin.duty}/255`); },
      ledcAttach(p, f, r) { p = pinOk(p, 'ledcAttach'); const pin = hw.pin(p); pin.mode = 'OUTPUT'; pin.res = r || 8; pin.duty = 0; pin.freq = f; sim.plog(`LEDC on GPIO${p}: ${f} Hz, ${r}-bit`); return true; },
      ledcAttachChannel(p, f, r, ch) { return A.ledcAttach(p, f, r); },
      ledcSetup(ch, f, r) { sim.ledcCh[ch] = { f, r, pins: [] }; return f; },
      ledcAttachPin(p, ch) { const c = sim.ledcCh[ch] || (sim.ledcCh[ch] = { f: 5000, r: 8, pins: [] }); c.pins.push(+p); const pin = hw.pin(+p); pin.mode = 'OUTPUT'; pin.res = c.r; pin.duty = 0; },
      ledcWrite(x, duty) {
        const ch = sim.ledcCh[x]; const pins = ch && ch.pins.length ? ch.pins : [+x];
        for (const p of pins) { const pin = hw.pin(p); if (pin.duty === null) { pin.res = pin.res || 8; } pin.mode = 'OUTPUT'; pin.duty = Math.max(0, duty); }
      },
      ledcWriteTone(x, f) { const ch = sim.ledcCh[x]; const pins = ch && ch.pins.length ? ch.pins : [+x]; for (const p of pins) { hw.tones[p] = f; sim.io.tone(f); } return f; },
      ledcDetach(p) { const pin = hw.pin(+p); pin.duty = null; return true; },
      ledcDetachPin(p) { A.ledcDetach(p); },
      dacWrite(p, v) { p = +p; if (p !== 25 && p !== 26) { sim.warnOnce('dac' + p, `GPIO${p} has no DAC. The ESP32's DACs are on GPIO25 and GPIO26.`); return; } hw.pin(p).dac = Math.max(0, Math.min(255, v)); },
      tone(p, f, dur) { p = +p; hw.tones[p] = f; hw.pin(p).mode = 'OUTPUT'; sim.io.tone(f); if (dur) { const g = sim.gen; const id = setTimeout(() => { if (g === sim.gen) { hw.tones[p] = 0; sim.io.tone(0); } }, dur / sim.speed); sim.timers.add(id); } },
      noTone(p) { hw.tones[+p] = 0; sim.io.tone(0); },
      touchRead(p) {
        p = +p; if (!(p in TOUCH)) { sim.warnOnce('tch' + p, `GPIO${p} is not a touch pin. Touch pins: T0=4, T2=2, T3=15, T4=13, T5=12, T6=14, T7=27, T8=33, T9=32.`); return 0; }
        const d = sim.devices.find(x => x.type === 'touch' && x.pin === p);
        const touched = d && hw.inputs[d.id];
        return Math.round((touched ? 11 : 62) + (Math.random() - 0.5) * 5);
      },
      touchAttachInterrupt(p, fn, thr) { sim.touchIsr[+p] = { fn, thr }; },
      touchSleepWakeUpEnable(p, thr) { sim.wakeOn = sim.wakeOn || {}; sim.wakeOn.touch = { pin: +p, thr }; },
      esp_sleep_enable_touchpad_wakeup() { sim.wakeOn = sim.wakeOn || {}; sim.wakeOn.touch = sim.wakeOn.touch || { pin: 4 }; return 0; },
      pulseIn: async (p, state, timeout) => {
        p = +p; const d = sim.devices.find(x => x.type === 'sonar' && x.echo === p);
        await sleepMs(2);
        if (!d) return 0;
        hw.pings++;
        const cm = hw.inputs[d.id]; if (cm > 400) return 0;
        return Math.round(cm * 58.3 + (Math.random() - 0.5) * 20);
      },
      millis: () => Math.floor(now()), micros: () => Math.floor(now() * 1000),
      delay: (ms) => sleepMs(+ms), delayMicroseconds: (us) => (us > 2000 ? sleepMs(us / 1000) : undefined), __yield: () => yieldNow(),
      map: (x, a, b, c, d) => Math.trunc((x - a) * (d - c) / (b - a) + c),
      constrain: (x, a, b) => Math.min(Math.max(x, a), b),
      min: Math.min, max: Math.max, abs: Math.abs, pow: Math.pow, sqrt: Math.sqrt, sq: (x) => x * x, sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2,
      floor: Math.floor, ceil: Math.ceil, round: Math.round, fabs: Math.abs, log: Math.log, exp: Math.exp, isnan: isNaN, isinf: (x) => !isFinite(x),
      random: (a, b) => (b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a))), randomSeed() { }, esp_random: () => Math.floor(Math.random() * 2 ** 32),
      bitRead: (v, b) => (v >> b) & 1, bitSet: (v, b) => v | (1 << b), bitClear: (v, b) => v & ~(1 << b), bit: (b) => 1 << b, lowByte: (v) => v & 255, highByte: (v) => (v >> 8) & 255,
      isDigit: (c) => /[0-9]/.test(c), isAlpha: (c) => /[a-z]/i.test(c), isSpace: (c) => /\s/.test(c),
      strcmp: (a, b) => (a < b ? -1 : a > b ? 1 : 0), strlen: (s) => String(s).length, atoi: (s) => parseInt(s) || 0, atof: (s) => parseFloat(s) || 0,
      digitalPinToInterrupt: (p) => p,
      attachInterrupt(p, fn, mode) { sim.isrs[+p] = { fn, mode }; },
      detachInterrupt(p) { delete sim.isrs[+p]; }, noInterrupts() { }, interrupts() { },
      temperatureRead: () => 48.5 + Math.random() * 2,
      getCpuFrequencyMhz: () => 240, setCpuFrequencyMhz() { return true; },
      Serial: {
        begin(b) { sim.serialOn = true; sim.baud = +b || 115200; },
        end() { sim.serialOn = false; },
        print(v, f) { sim.serialWrite(valStr(v, f)); return 1; },
        println(v, f) { sim.serialWrite((v === undefined ? '' : valStr(v, f)) + '\n'); return 1; },
        printf(f, ...a) { sim.serialWrite(cfmt(f, ...a)); return 1; },
        write(v) { sim.serialWrite(typeof v === 'number' ? String.fromCharCode(v) : String(v)); return 1; },
        available() { return sim.rx.length; },
        read() { if (!sim.rx.length) return -1; const c = sim.rx[0]; sim.rx = sim.rx.slice(1); return c; },
        peek() { return sim.rx.length ? sim.rx[0] : -1; },
        readString() { const s = sim.rx; sim.rx = ''; return s; },
        readStringUntil(ch) { const i = sim.rx.indexOf(ch); if (i < 0) { const s = sim.rx; sim.rx = ''; return s; } const s = sim.rx.slice(0, i); sim.rx = sim.rx.slice(i + 1); return s; },
        parseInt() { const m = sim.rx.match(/-?\d+/); if (!m) { sim.rx = ''; return 0; } sim.rx = sim.rx.slice(m.index + m[0].length); return +m[0]; },
        parseFloat() { const m = sim.rx.match(/-?\d+(\.\d+)?/); if (!m) { sim.rx = ''; return 0; } sim.rx = sim.rx.slice(m.index + m[0].length); return +m[0]; },
        flush() { }, setTimeout() { }, availableForWrite: () => 128,
        valueOf() { return sim.serialOn ? 1 : 0; },
      },
      ESP: {
        getChipModel: () => 'ESP32-D0WD-V3', getChipRevision: () => 3, getChipCores: () => 2, getCpuFreqMHz: () => 240,
        getFlashChipSize: () => 4194304, getFlashChipSpeed: () => 40000000, getHeapSize: () => 327680, getFreeHeap: () => 291000 - Math.floor(Math.random() * 400),
        getMinFreeHeap: () => 285000, getSketchSize: () => 286000, getFreeSketchSpace: () => 1310720, getEfuseMac: () => 0x4E2C1A86F0A4, getSdkVersion: () => 'v5.1.4',
        restart() { throw new Restart(); },
      },
      esp_restart() { throw new Restart(); },
      // sleep
      ESP_SLEEP_WAKEUP_UNDEFINED: 0, ESP_SLEEP_WAKEUP_EXT0: 2, ESP_SLEEP_WAKEUP_EXT1: 3, ESP_SLEEP_WAKEUP_TIMER: 4, ESP_SLEEP_WAKEUP_TOUCHPAD: 5, ESP_SLEEP_WAKEUP_ULP: 6,
      esp_sleep_enable_timer_wakeup(us) { sim.wakeOn = sim.wakeOn || {}; sim.wakeOn.timer = +us; return 0; },
      esp_sleep_enable_ext0_wakeup(p, lvl) { sim.wakeOn = sim.wakeOn || {}; sim.wakeOn.ext0 = { pin: +p, level: +lvl }; return 0; },
      esp_sleep_get_wakeup_cause: () => sim.wakeCause,
      esp_sleep_get_touchpad_wakeup_status: () => 0,
      esp_deep_sleep_start() { sim.out('Entering deep sleep…\n', 'sys'); throw new Sleep('deep'); },
      esp_deep_sleep(us) { A.esp_sleep_enable_timer_wakeup(us); A.esp_deep_sleep_start(); },
      esp_light_sleep_start: async () => { const us = (sim.wakeOn && sim.wakeOn.timer) || 1e6; hw.sleeping = true; await sleepMs(us / 1000); hw.sleeping = false; return 0; },
      // FreeRTOS
      portTICK_PERIOD_MS: 1, pdPASS: 1, pdTRUE: 1, pdFALSE: 0, portMAX_DELAY: 0xffffffff, tskNO_AFFINITY: 0, ARDUINO_RUNNING_CORE: 1, CONFIG_ARDUINO_RUNNING_CORE: 1,
      pdMS_TO_TICKS: (ms) => ms,
      vTaskDelay: (t) => sleepMs(+t),
      xPortGetCoreID: (n) => { const f = n && sim.compiled.lineFn[n]; return f && f in sim.taskCore ? sim.taskCore[f] : n ? 1 : sim.core; },
      xTaskCreatePinnedToCore(fn, name, stack, param, prio, handle, core) {
        const g = gen;
        sim.taskCore[fn.name] = core === 0 ? 0 : 1;
        const run = async () => {
          try { await fn(param); }
          catch (e) { if (!(e instanceof TaskEnd)) sim._handle(e, g); }
        };
        sim.tasks.push(run()); sim.plog(`task "${name}" started on core ${core}`); return 1;
      },
      xTaskCreate(fn, name, stack, param, prio, handle) { return A.xTaskCreatePinnedToCore(fn, name, stack, param, prio, handle, 0); },
      vTaskDelete() { throw new TaskEnd(); },
      uxTaskGetStackHighWaterMark: () => 1480,
      // WiFi
      WL_IDLE_STATUS: 0, WL_NO_SSID_AVAIL: 1, WL_SCAN_COMPLETED: 2, WL_CONNECTED: 3, WL_CONNECT_FAILED: 4, WL_CONNECTION_LOST: 5, WL_DISCONNECTED: 6,
      WIFI_OFF: 0, WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3, WIFI_AUTH_OPEN: 0, WIFI_AUTH_WEP: 1, WIFI_AUTH_WPA_PSK: 2, WIFI_AUTH_WPA2_PSK: 3, WIFI_AUTH_WPA_WPA2_PSK: 4, WIFI_AUTH_WPA3_PSK: 6,
      HTTP_GET: 1, HTTP_POST: 3, HTTP_ANY: 0,
      WiFi: sim._wifiApi(sleepMs),
      // libraries
      WebServer: sim._webServerClass(), Servo: sim._servoClass(), ESP32PWM: { allocateTimer() { } },
      DHT: sim._dhtClass(), DHT22: 22, DHT11: 11,
      Adafruit_SSD1306: sim._oledClass(), SSD1306_SWITCHCAPVCC: 2, SSD1306_WHITE: 1, SSD1306_BLACK: 0, SSD1306_INVERSE: 2, WHITE: 1, BLACK: 0, INVERSE: 2,
      Wire: { begin() { return true; }, setClock() { } },
      BluetoothSerial: sim._btClass(),
    };
    return A;
  }

  _analog(p) {
    const d = this.devices.find(x => x.pin === p && (x.type === 'pot' || x.type === 'ldr'));
    const noise = (Math.random() - 0.5) * 0.006;
    if (!d) return Math.max(0, 0.02 + noise * 3);
    const v = this.hw.inputs[d.id];
    if (d.type === 'ldr') { const r = 1000 + (1 - v) ** 2 * 80000; return Math.max(0, Math.min(1, 10000 / (10000 + r) * 1.02 + noise)); }
    return Math.max(0, Math.min(1, v + noise));
  }

  _wifiApi(sleepMs) {
    const sim = this; const hw = this.hw;
    const ip = (s) => ({ toString: () => s, [Symbol.toPrimitive]: () => s });
    const W = {
      mode(m) { sim.wifi.mode = m; return true; },
      begin(ssid, pass) {
        sim.wifi.state = 'connecting'; sim.wifi.ssid = String(ssid || ''); sim.wifi.connectAt = performance.now() + 1700 / sim.speed; hw.radio = 1;
        sim.plog(`WiFi.begin("${ssid}")`); sim.io.wifi({ state: 'connecting', ssid });
        return 0;
      },
      status() {
        const w = sim.wifi;
        if (w.state === 'connecting' && performance.now() >= w.connectAt) {
          if (!w.ssid) { w.state = 'failed'; return 1; }
          w.state = 'connected'; sim.io.wifi({ state: 'connected', ssid: w.ssid, ip: '192.168.1.42', rssi: -52 });
        }
        return w.state === 'connected' ? 3 : w.state === 'failed' ? 1 : w.state === 'off' ? 0 : 6;
      },
      isConnected() { return W.status() === 3; },
      localIP: () => ip(sim.wifi.state === 'connected' ? '192.168.1.42' : '0.0.0.0'),
      gatewayIP: () => ip('192.168.1.1'), subnetMask: () => ip('255.255.255.0'), dnsIP: () => ip('192.168.1.1'),
      macAddress: () => 'A4:F0:86:1A:2C:4E', BSSIDstr: () => '3C:84:6A:11:22:33', channel: () => 6,
      RSSI(i) { if (i === undefined) return -52 + Math.round((Math.random() - 0.5) * 4); return (sim._scan[i] || {}).rssi ?? 0; },
      SSID(i) { if (i === undefined) return sim.wifi.ssid; return (sim._scan[i] || {}).ssid ?? ''; },
      encryptionType(i) { return (sim._scan[i] || {}).enc ?? 0; },
      async scanNetworks() { hw.radio = 1; sim.io.wifi({ state: 'scanning' }); await sleepMs(1800); sim._scan = NETWORKS.map(n => ({ ...n, rssi: n.rssi + Math.round((Math.random() - 0.5) * 6) })).sort((a, b) => b.rssi - a.rssi); if (sim.wifi.state === 'off') { hw.radio = 0; sim.io.wifi(null); } return sim._scan.length; },
      scanDelete() { sim._scan = []; },
      disconnect() { sim.wifi.state = 'off'; hw.radio = sim.bt ? 2 : 0; sim.io.wifi(null); return true; },
      softAP(ssid, pass) { sim.wifi.ap = true; sim.wifi.apName = ssid; hw.radio = 1; sim.io.wifi({ state: 'ap', ssid, ip: '192.168.4.1' }); return true; },
      softAPIP: () => ip('192.168.4.1'), softAPgetStationNum: () => (sim._phoneOnAP ? 1 : 0),
      setHostname() { return true; }, getHostname: () => 'esp32-lab', setSleep() { }, persistent() { }, setAutoReconnect() { },
    };
    sim._scan = [];
    return W;
  }

  _webServerClass() {
    const sim = this;
    return class WebServer {
      constructor(port = 80) { this.port = port; this.routes = []; this.nf = null; this.begun = false; this.queue = []; this.cur = null; this.hdrs = {}; sim.server = this; }
      on(path, a, b) { const fn = b || a; this.routes.push({ path, fn }); }
      onNotFound(fn) { this.nf = fn; }
      begin() { this.begun = true; sim.io.phone({ type: 'server', routes: this.routes.map(r => r.path) }); sim.plog(`HTTP server started on port ${this.port}`); }
      close() { this.begun = false; } stop() { this.begun = false; }
      async handleClient() {
        const req = this.queue.shift(); if (!req || req.done) return;
        this.cur = req; this.hdrs = {}; req.sent = null;
        const r = this.routes.find(x => x.path === req.path);
        sim.plog(`HTTP GET ${req.path}${Object.keys(req.args).length ? '?' + Object.entries(req.args).map(([k, v]) => k + '=' + v).join('&') : ''}`);
        if (r) await r.fn(); else if (this.nf) await this.nf(); else this.send(404, 'text/plain', 'Not found: ' + req.path);
        if (!req.sent) req.sent = { code: 500, type: 'text/plain', body: 'The handler did not call server.send().' };
        req.done = true; req.resolve({ ...req.sent, headers: this.hdrs });
        this.cur = null;
      }
      send(code, type = 'text/plain', body = '') { if (this.cur) this.cur.sent = { code, type, body: String(body) }; }
      send_P(code, type, body) { this.send(code, type, body); }
      sendHeader(k, v) { this.hdrs[k] = v; }
      arg(n) { return this.cur ? (this.cur.args[n] ?? '') : ''; } hasArg(n) { return !!(this.cur && n in this.cur.args); }
      args() { return this.cur ? Object.keys(this.cur.args).length : 0; } argName(i) { return this.cur ? Object.keys(this.cur.args)[i] : ''; }
      uri() { return this.cur ? this.cur.path : '/'; } method() { return 1; }
    };
  }
  _servoClass() {
    const sim = this;
    return class Servo {
      constructor() { this.pin = -1; this.angle = 90; }
      attach(p, min = 500, max = 2400) { this.pin = +p; this.min = min; this.max = max; sim.hw.servos[this.pin] = this.angle; sim.hw.pin(this.pin).mode = 'OUTPUT'; return 1; }
      setPeriodHertz() { } attached() { return this.pin >= 0; }
      write(a) { this.angle = Math.max(0, Math.min(180, a)); if (this.pin >= 0) sim.hw.servos[this.pin] = this.angle; }
      writeMicroseconds(us) { this.write((us - this.min) / (this.max - this.min) * 180); }
      read() { return Math.round(this.angle); } detach() { this.pin = -1; }
    };
  }
  _dhtClass() {
    const sim = this;
    return class DHT {
      constructor(pin, type) { this.pin = +pin; this.type = type; }
      begin() { }
      _d() { const d = sim.devices.find(x => x.type === 'dht' && x.pin === this.pin); return d ? sim.hw.inputs[d.id] : null; }
      readTemperature(f) { const d = this._d(); if (!d) return NaN; const t = Math.round((d.t + (Math.random() - 0.5) * 0.2) * 10) / 10; return f ? Math.round((t * 1.8 + 32) * 10) / 10 : t; }
      readHumidity() { const d = this._d(); if (!d) return NaN; return Math.round((d.h + (Math.random() - 0.5) * 0.6) * 10) / 10; }
      computeHeatIndex(t, h, f = true) {
        const T = f ? t : t * 1.8 + 32;
        let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + h * 0.094);
        if (hi > 79) hi = -42.379 + 2.04901523 * T + 10.14333127 * h - 0.22475541 * T * h - 0.00683783 * T * T - 0.05481717 * h * h + 0.00122874 * T * T * h + 0.00085282 * T * h * h - 0.00000199 * T * T * h * h;
        return f ? hi : (hi - 32) / 1.8;
      }
    };
  }
  _btClass() {
    const sim = this;
    return class BluetoothSerial {
      begin(name = 'ESP32') { sim.bt = { name, connected: false, rx: '' }; sim.hw.radio = 2; sim.io.phone({ type: 'bt', name }); sim.plog(`Bluetooth "${name}" is discoverable`); return true; }
      available() { return sim.bt ? sim.bt.rx.length : 0; }
      read() { if (!sim.bt || !sim.bt.rx.length) return -1; const c = sim.bt.rx[0]; sim.bt.rx = sim.bt.rx.slice(1); return c; }
      readString() { const s = sim.bt ? sim.bt.rx : ''; if (sim.bt) sim.bt.rx = ''; return s; }
      readStringUntil(ch) { if (!sim.bt) return ''; const i = sim.bt.rx.indexOf(ch); if (i < 0) { const s = sim.bt.rx; sim.bt.rx = ''; return s; } const s = sim.bt.rx.slice(0, i); sim.bt.rx = sim.bt.rx.slice(i + 1); return s; }
      print(v, f) { if (sim.bt && sim.bt.connected) sim.io.phone({ type: 'btmsg', text: valStr(v, f) }); return 1; }
      println(v, f) { return this.print((v === undefined ? '' : valStr(v, f)) + '\n'); }
      write(v) { return this.print(typeof v === 'number' ? String.fromCharCode(v) : v); }
      printf(f, ...a) { return this.print(cfmt(f, ...a)); }
      connected() { return !!(sim.bt && sim.bt.connected); } hasClient() { return this.connected(); }
      end() { sim.bt = null; sim.hw.radio = sim.wifi.state !== 'off' ? 1 : 0; }
    };
  }
  _oledClass() {
    const sim = this;
    return class Adafruit_SSD1306 {
      constructor(w = 128, h = 64) {
        this.W = w; this.H = h; this.buf = new Uint8Array(w * h); this.cx = 0; this.cy = 0; this.size = 1; this.col = 1; this.wrap = true; this.inv = false;
        this.canvas = document.createElement('canvas'); this.canvas.width = 128; this.canvas.height = 64; this.version = 0;
      }
      begin() { const d = sim.devices.find(x => x.type === 'oled'); if (!d) return false; sim.hw.oled = this; this.display(); return true; }
      width() { return this.W; } height() { return this.H; }
      clearDisplay() { this.buf.fill(0); this.cx = 0; this.cy = 0; }
      display() {
        const x = this.canvas.getContext('2d'); const img = x.createImageData(128, 64);
        for (let i = 0; i < 8192; i++) { const on = this.buf[i] ^ (this.inv ? 1 : 0); const o = i * 4; img.data[o] = on ? 205 : 6; img.data[o + 1] = on ? 240 : 8; img.data[o + 2] = on ? 255 : 12; img.data[o + 3] = 255; }
        x.putImageData(img, 0, 0); this.version++; sim.io.oled && sim.io.oled(this.canvas);
      }
      invertDisplay(i) { this.inv = !!i; this.display(); } dim() { } setRotation() { } cp437() { } setTextWrap(w) { this.wrap = !!w; }
      startscrollright() { } startscrollleft() { } stopscroll() { }
      px(x, y, c = this.col) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.W || y >= this.H) return; const i = y * this.W + x; this.buf[i] = c === 2 ? this.buf[i] ^ 1 : c ? 1 : 0; }
      drawPixel(x, y, c) { this.px(x, y, c); }
      drawLine(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) this.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); }
      drawFastHLine(x, y, w, c) { this.drawLine(x, y, x + w - 1, y, c); } drawFastVLine(x, y, h, c) { this.drawLine(x, y, x, y + h - 1, c); }
      drawRect(x, y, w, h, c) { this.drawFastHLine(x, y, w, c); this.drawFastHLine(x, y + h - 1, w, c); this.drawFastVLine(x, y, h, c); this.drawFastVLine(x + w - 1, y, h, c); }
      fillRect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
      fillScreen(c) { this.buf.fill(c ? 1 : 0); }
      drawRoundRect(x, y, w, h, r, c) { this.drawRect(x, y, w, h, c); } fillRoundRect(x, y, w, h, r, c) { this.fillRect(x, y, w, h, c); }
      drawCircle(x0, y0, r, c) { for (let a = 0; a < 360; a += 2) { const t = a * Math.PI / 180; this.px(x0 + Math.cos(t) * r, y0 + Math.sin(t) * r, c); } }
      fillCircle(x0, y0, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) this.px(x0 + x, y0 + y, c); }
      drawTriangle(a, b, c2, d, e, f, c) { this.drawLine(a, b, c2, d, c); this.drawLine(c2, d, e, f, c); this.drawLine(e, f, a, b, c); }
      fillTriangle(a, b, c2, d, e, f, c) { const minY = Math.min(b, d, f), maxY = Math.max(b, d, f); for (let y = minY; y <= maxY; y++) for (let x = Math.min(a, c2, e); x <= Math.max(a, c2, e); x++) { const s = (p, q, r2, t, u, v) => (p - u) * (t - v) - (r2 - u) * (q - v); const d1 = s(x, y, a, b, c2, d), d2 = s(x, y, c2, d, e, f), d3 = s(x, y, e, f, a, b); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) this.px(x, y, c); } }
      setTextSize(s) { this.size = Math.max(1, Math.floor(s)); } setTextColor(c, bg) { this.col = c; this.bg = bg; } setCursor(x, y) { this.cx = x; this.cy = y; }
      getCursorX() { return this.cx; } getCursorY() { return this.cy; }
      _ch(ch) {
        if (ch === '\n') { this.cx = 0; this.cy += 8 * this.size; return; } if (ch === '\r') return;
        if (this.wrap && this.cx + 6 * this.size > this.W) { this.cx = 0; this.cy += 8 * this.size; }
        const g = font()[ch.charCodeAt(0)] || font()[63]; const s = this.size;
        if (this.bg !== undefined && this.bg !== this.col) this.fillRect(this.cx, this.cy, 6 * s, 8 * s, this.bg);
        for (let r = 0; r < 8; r++) for (let q = 0; q < 5; q++) if (g[r][q]) this.fillRect(this.cx + q * s, this.cy + r * s, s, s, this.col);
        this.cx += 6 * s;
      }
      print(v, f) { for (const ch of valStr(v, f)) this._ch(ch); return 1; }
      println(v, f) { this.print((v === undefined ? '' : valStr(v, f)) + '\n'); return 1; }
      write(v) { this._ch(typeof v === 'number' ? String.fromCharCode(v) : String(v)); return 1; }
      printf(f, ...a) { this.print(cfmt(f, ...a)); }
      drawBitmap() { }
    };
  }
}
