// Tiny schematic renderer: each row is a left-to-right chain of symbols.
const H = 44, Y = 26;
const t = (x, y, s, cls = 'sc-t', anchor = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
const SYM = {
  pin: (x, lab) => ({ w: 74, svg: `<rect x="${x}" y="${Y - 15}" width="66" height="30" rx="4" class="sc-box"/>${t(x + 33, Y - 2, 'ESP32', 'sc-b')}${t(x + 33, Y + 10, lab, 'sc-s')}`, out: 66 }),
  R: (x, lab) => ({ w: 56, svg: `<path d="M${x} ${Y}h8l3-6 5 12 5-12 5 12 5-12 5 12 3-6h11" class="sc-l"/>${t(x + 28, Y - 12, lab, 'sc-s')}` }),
  LED: (x, col) => ({ w: 46, svg: `<path d="M${x} ${Y}h14" class="sc-l"/><path d="M${x + 14} ${Y - 8}v16l14-8z" fill="${col}" class="sc-f"/><path d="M${x + 28} ${Y - 8}v16M${x + 28} ${Y}h18" class="sc-l"/><path d="M${x + 22} ${Y - 11}l5-6M${x + 27} ${Y - 9}l5-6" class="sc-a"/>` }),
  BTN: (x) => ({ w: 46, svg: `<path d="M${x} ${Y}h12M${x + 34} ${Y}h12M${x + 12} ${Y}l20-9M${x + 23} ${Y - 12}v-6M${x + 16} ${Y - 18}h14" class="sc-l"/><circle cx="${x + 12}" cy="${Y}" r="2" class="sc-d"/><circle cx="${x + 34}" cy="${Y}" r="2" class="sc-d"/>` }),
  POT: (x, lab) => ({ w: 56, svg: `<rect x="${x + 10}" y="${Y - 6}" width="36" height="12" class="sc-l" fill="none"/><path d="M${x} ${Y}h10M${x + 46} ${Y}h10M${x + 28} ${Y + 18}v-11" class="sc-l"/><path d="M${x + 24} ${Y + 11}l4-5 4 5" class="sc-l"/>${t(x + 28, Y - 11, lab || 'pot', 'sc-s')}` }),
  LDR: (x) => ({ w: 56, svg: `<rect x="${x + 12}" y="${Y - 6}" width="32" height="12" class="sc-l" fill="none"/><circle cx="${x + 28}" cy="${Y}" r="15" class="sc-l" fill="none"/><path d="M${x} ${Y}h12M${x + 44} ${Y}h12M${x + 14} ${Y - 22}l7 7M${x + 22} ${Y - 25}l7 7" class="sc-a"/>${t(x + 28, Y + 28, 'LDR', 'sc-s')}` }),
  BUZ: (x) => ({ w: 46, svg: `<path d="M${x} ${Y}h12M${x + 34} ${Y}h12" class="sc-l"/><rect x="${x + 12}" y="${Y - 7}" width="9" height="14" class="sc-l" fill="none"/><path d="M${x + 21} ${Y - 7}l10-7v28l-10-7" class="sc-l" fill="none"/>${t(x + 23, Y + 26, 'buzzer', 'sc-s')}` }),
  BOX: (x, lab) => { const w = Math.max(64, lab.length * 7 + 18); return { w: w + 14, svg: `<path d="M${x} ${Y}h7" class="sc-l"/><rect x="${x + 7}" y="${Y - 14}" width="${w}" height="28" rx="4" class="sc-box"/>${t(x + 7 + w / 2, Y + 4, lab, 'sc-b')}`, out: w + 7 }; },
  NODE: (x, lab) => ({ w: 10, svg: `<path d="M${x} ${Y}h10" class="sc-l"/><circle cx="${x + 5}" cy="${Y}" r="3" class="sc-d"/><path d="M${x + 5} ${Y}v-14" class="sc-l"/>${t(x + 5, Y - 18, lab, 'sc-s')}` }),
  GND: (x) => ({ w: 22, svg: `<path d="M${x} ${Y}h10v8M${x + 2} ${Y + 8}h16M${x + 5} ${Y + 12}h10M${x + 8} ${Y + 16}h4" class="sc-l"/>`, end: true }),
  VCC: (x, lab) => ({ w: 40, svg: `<path d="M${x + 10} ${Y}v-12M${x + 4} ${Y - 12}h12M${x + 10} ${Y}h30" class="sc-l"/>${t(x + 10, Y - 16, lab, 'sc-s')}` }),
  TXT: (x, lab) => ({ w: lab.length * 6 + 12, svg: t(x + 6, Y + 4, lab, 'sc-s', 'start') }),
  ANT: (x) => ({ w: 40, svg: `<path d="M${x} ${Y}h14v-16M${x + 6} ${Y - 26}l8 10 8-10M${x + 14} ${Y - 16}v-10" class="sc-l"/><path d="M${x + 26} ${Y - 22}a8 8 0 0 1 0 12M${x + 31} ${Y - 26}a14 14 0 0 1 0 20" class="sc-a"/>` }),
};

export function schematicSVG(rows) {
  let maxW = 0; const parts = [];
  rows.forEach((row, ri) => {
    let x = 6; let svg = ''; let pinKey = '';
    row.forEach((el, i) => {
      const [k, ...rest] = String(el).split(':'); const arg = rest.join(':');
      if (k === 'pin') pinKey = arg.replace(/\D/g, '');
      const s = SYM[k] ? SYM[k](x, arg) : SYM.TXT(x, el);
      svg += s.svg; x += s.w;
      const nxt = row[i + 1];
      if (nxt && !s.end) { svg += `<path d="M${x - (s.out ? s.w - s.out : 0)} ${Y}h${12 + (s.out ? s.w - s.out : 0)}" class="sc-l ${i === 0 && pinKey ? 'sc-hot' : ''}"/>`; x += 12; }
    });
    maxW = Math.max(maxW, x + 6);
    parts.push(`<g transform="translate(0 ${ri * H})" class="sc-row" data-pin="${pinKey}">${svg}</g>`);
  });
  const h = rows.length * H + 10;
  return `<svg viewBox="0 0 ${maxW} ${h}" width="${maxW}" height="${h}" role="img" aria-label="Circuit schematic">${parts.join('')}</svg>`;
}
