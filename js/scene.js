// 3D stage: ESP32 DevKitC model, breadboard, components, wires, hotspots, camera.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const V3 = THREE.Vector3;
export const P = 0.48333; // 2.54 mm header pitch in world units
export const BOARD = { x: -4.6, z: 0, lift: 1.815, top: 1.97 };
export const BB = { x: 4.2, z: -P / 2, h: 0.85 };
const ROWX = { a: -5.5, b: -4.5, c: -3.5, d: -2.5, e: -1.5, f: 1.5, g: 2.5, h: 3.5, i: 4.5, j: 5.5, 'L+': -8.5, 'L-': -7.5, 'R-': 7.5, 'R+': 8.5 };

// Header order as seen from the component side, antenna end first (matches the real DevKitC V4).
export const HEADER = {
  L: ['3V3', 'EN', '36', '39', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', '9', '10', '11', '5V'],
  R: ['GND', '23', '22', '1', '3', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', '8', '7', '6'],
};
const SILK = {
  L: ['3V3', 'EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', 'D2', 'D3', 'CMD', '5V'],
  R: ['GND', '23', '22', 'TX', 'RX', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', 'D1', 'D0', 'CLK'],
};
export function pinIndex(name) {
  name = String(name);
  if (name === 'GND' || name === 'GND1') return ['R', 0];
  if (name === 'GND2') return ['R', 6];
  if (name === 'GNDL') return ['L', 13];
  for (const s of ['R', 'L']) { const i = HEADER[s].indexOf(name); if (i >= 0) return [s, i]; }
  return null;
}
export function pinPos(name, up = 0) {
  const [s, i] = pinIndex(name);
  return new V3(BOARD.x + (s === 'R' ? 2.38 : -2.38), BOARD.top + up, BOARD.z - 4.35 + i * P);
}
export function holePos(col, row, up = 0) {
  return new V3(BB.x + ROWX[row] * P, BB.h + up, BB.z + (col - 10.5) * P);
}
// model-space (board local) → world
const bw = (x, y, z) => new V3(BOARD.x + x, BOARD.lift + z, BOARD.z - y);

// ---------- small helpers ----------
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.62, metalness: o.m ?? 0.04, ...(o.x || {}) });
const metal = () => M(0xc8ccd2, { r: 0.32, m: 0.85 });
function mesh(geo, mat, pos, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  m.castShadow = shadow; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const UP = new V3(0, 1, 0);
function rod(a, b, r, mat, parent) {
  const d = new V3().subVectors(b, a); const len = d.length();
  if (len < 1e-4) return null;
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 8), mat, a.clone().add(b).multiplyScalar(0.5), parent);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
const legs = (pts, r, mat, parent) => { for (let i = 0; i < pts.length - 1; i++) rod(pts[i], pts[i + 1], r, mat, parent); };
const mid = (a, b) => a.clone().add(b).multiplyScalar(0.5);

let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c); _glowTex.colorSpace = THREE.SRGBColorSpace; return _glowTex;
}
function makeGlow(color, scale = 2) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false }));
  s.scale.setScalar(scale); s.renderOrder = 5; return s;
}
let _ringTex = null;
function ringTex() {
  if (_ringTex) return _ringTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  _ringTex = new THREE.CanvasTexture(c); _ringTex.colorSpace = THREE.SRGBColorSpace; return _ringTex;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- resistor colour code ----------
const BANDC = ['#1b1b1b', '#7a4a1e', '#d0312d', '#f08a24', '#f2d43a', '#3f9b4a', '#2f62c9', '#8a49b8', '#8e8e8e', '#f5f5f5'];
export function resistorBands(ohms) {
  let v = ohms, exp = 0;
  while (v >= 100) { v /= 10; exp++; }
  if (v < 10) { v *= 10; exp--; }
  v = Math.round(v);
  return [Math.floor(v / 10), v % 10, Math.max(exp, 0)];
}

// ================= component factories =================
const F = {};

F.led = (s) => {
  const g = new THREE.Group(); const A = holePos(...s.a), B = holePos(...s.b);
  const c = mid(A, B); const y0 = BB.h + 0.72; const col = new THREE.Color(s.color || '#ff3b30');
  const lm = metal(); const d = B.clone().sub(A).normalize();
  legs([A, A.clone().setY(BB.h + 0.3), c.clone().addScaledVector(d, -0.12).setY(y0)], 0.022, lm, g);
  legs([B, B.clone().setY(BB.h + 0.3), c.clone().addScaledVector(d, 0.12).setY(y0)], 0.022, lm, g);
  const bm = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.9, roughness: 0.18, emissive: col, emissiveIntensity: 0.06 });
  const p1 = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.07, 24), bm, c.clone().setY(y0 + 0.035), g);
  const p2 = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.42, 24), bm, c.clone().setY(y0 + 0.28), g);
  const p3 = mesh(new THREE.SphereGeometry(0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), bm, c.clone().setY(y0 + 0.49), g);
  const glow = makeGlow(col); glow.position.copy(c).setY(y0 + 0.42); g.add(glow);
  g.userData = {
    anchor: c.clone().setY(y0 + 0.8), pick: [p1, p2, p3], glowCol: col,
    tick(hw) {
      const l = Math.min(1, (hw ? hw.level(s.pin) : 0) * (g.userData.gain ?? 1));
      bm.emissiveIntensity = 0.06 + l * 2.6; glow.material.opacity = Math.min(0.62, l * 0.62); glow.scale.setScalar(1.2 + l * 1.5);
    },
    setColor(hex) { const k = new THREE.Color(hex); bm.color.copy(k); bm.emissive.copy(k); glow.material.color.copy(k); },
  };
  return g;
};

F.res = (s) => {
  const g = new THREE.Group(); const A = holePos(...s.a), B = holePos(...s.b);
  const y = BB.h + 0.34; const c = mid(A, B).setY(y);
  const d = B.clone().sub(A); d.y = 0; const L = d.length(); d.normalize();
  const bl = Math.min(0.8, L - 0.32); const lm = metal();
  legs([A, A.clone().setY(y), c.clone().addScaledVector(d, -bl / 2)], 0.02, lm, g);
  legs([B, B.clone().setY(y), c.clone().addScaledVector(d, bl / 2)], 0.02, lm, g);
  const body = new THREE.Group(); body.position.copy(c); body.quaternion.setFromUnitVectors(UP, d); g.add(body);
  const bm = M('#e2cc9f', { r: 0.55 });
  const k = bl / 0.8;
  const core = mesh(new THREE.CylinderGeometry(0.105, 0.105, bl * 0.64, 16), bm, null, body);
  for (const sg of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.14, 16, 12), bm, new V3(0, sg * bl * 0.3, 0), body); e.scale.set(1, 0.95, 1); }
  const b = resistorBands(s.ohms);
  [[BANDC[b[0]], -0.27, 0.142], [BANDC[b[1]], -0.15, 0.112], [BANDC[b[2]], -0.04, 0.112], ['#c9a227', 0.26, 0.142]].forEach(([col, yy, r]) => {
    mesh(new THREE.CylinderGeometry(r, r, 0.055, 16), M(col, { r: 0.5 }), new V3(0, yy * k, 0), body);
  });
  g.userData = { anchor: c.clone().setY(y + 0.35), pick: [core] };
  return g;
};

F.button = (s) => {
  const g = new THREE.Group(); const cl = s.col;
  const H = [holePos(cl, 'e'), holePos(cl, 'f'), holePos(cl + 2, 'e'), holePos(cl + 2, 'f')];
  const c = mid(H[0], H[3]); const lm = metal(); const by = BB.h + 0.16;
  H.forEach(h => legs([h, h.clone().lerp(c, 0.22).setY(by)], 0.028, lm, g));
  const base = mesh(new THREE.BoxGeometry(1.2, 0.42, 1.2), M('#34312d', { r: 0.7 }), c.clone().setY(by + 0.21), g);
  mesh(new THREE.BoxGeometry(1.16, 0.04, 1.16), M('#b9bcc0', { r: 0.4, m: 0.7 }), c.clone().setY(by + 0.43), g);
  const capM = M(s.color || '#d9533f', { r: 0.45 });
  const cap = mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.3, 28), capM, c.clone().setY(by + 0.58), g);
  const capY = by + 0.58;
  g.userData = {
    anchor: c.clone().setY(by + 0.95), pick: [cap, base], press: s.id,
    tick(hw) { const p = hw && hw.input(s.id) ? 1 : 0; cap.position.y += ((capY - p * 0.12) - cap.position.y) * 0.5; capM.emissive.set(p ? '#401008' : '#000'); },
  };
  return g;
};

F.pot = (s) => {
  const g = new THREE.Group(); const H = [0, 1, 2].map(i => holePos(s.col + i, s.row)); const c = H[1].clone();
  const lm = metal(); const by = BB.h + 0.22;
  H.forEach(h => legs([h, h.clone().setY(by)], 0.03, lm, g));
  const body = mesh(new THREE.BoxGeometry(1.25, 0.62, 1.5), M('#2f5fae', { r: 0.55 }), c.clone().setY(by + 0.31), g);
  mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 16), M('#d8d0bd', { r: 0.4, m: 0.6 }), c.clone().setY(by + 0.72), g);
  const knob = new THREE.Group(); knob.position.copy(c).setY(by + 0.82); g.add(knob);
  const km = M('#2a2a2a', { r: 0.5 });
  const k1 = mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.42, 24), km, new V3(0, 0.21, 0), knob);
  mesh(new THREE.BoxGeometry(0.07, 0.03, 0.34), M('#f4efe4'), new V3(0, 0.43, -0.17), knob);
  g.userData = {
    anchor: c.clone().setY(by + 1.4), pick: [k1, body], knob: s.id,
    tick(hw) { const v = hw ? hw.input(s.id) : 0.5; const a = THREE.MathUtils.degToRad(135 - 270 * v); knob.rotation.y += (a - knob.rotation.y) * 0.4; },
  };
  return g;
};

F.rgb = (s) => {
  const g = new THREE.Group(); const H = [0, 1, 2, 3].map(i => holePos(s.col + i, s.row));
  const c = mid(H[1], H[2]); const y0 = BB.h + 0.85; const lm = metal(); const lenAdd = [0.2, 0.35, 0.2, 0.1];
  H.forEach((h, i) => legs([h, h.clone().setY(BB.h + 0.25 + lenAdd[i]), c.clone().add(new V3(0, 0, (i - 1.5) * 0.11)).setY(y0)], 0.02, lm, g));
  const bm = new THREE.MeshStandardMaterial({ color: '#f3f1ec', transparent: true, opacity: 0.9, roughness: 0.3, emissive: '#000', emissiveIntensity: 1 });
  const p1 = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.07, 24), bm, c.clone().setY(y0 + 0.035), g);
  const p2 = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.45, 24), bm, c.clone().setY(y0 + 0.3), g);
  const p3 = mesh(new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), bm, c.clone().setY(y0 + 0.52), g);
  const glow = makeGlow('#fff', 2.4); glow.position.copy(c).setY(y0 + 0.45); g.add(glow);
  const tmp = new THREE.Color();
  g.userData = {
    anchor: c.clone().setY(y0 + 0.85), pick: [p1, p2, p3],
    tick(hw) {
      const r = hw ? hw.level(s.pins.r) : 0, gg = hw ? hw.level(s.pins.g) : 0, b = hw ? hw.level(s.pins.b) : 0;
      const m = Math.max(r, gg, b);
      tmp.setRGB(r, gg, b); bm.emissive.copy(tmp).multiplyScalar(1.6);
      glow.material.color.copy(tmp); glow.material.opacity = Math.min(0.62, m * 0.62); glow.scale.setScalar(1.3 + m * 1.6);
    },
  };
  return g;
};

F.ldr = (s) => {
  const g = new THREE.Group(); const A = holePos(...s.a), B = holePos(...s.b); const c = mid(A, B);
  const y0 = BB.h + 0.75; const lm = metal();
  legs([A, A.clone().setY(BB.h + 0.3), c.clone().add(new V3(0, 0, -0.1)).setY(y0)], 0.02, lm, g);
  legs([B, B.clone().setY(BB.h + 0.3), c.clone().add(new V3(0, 0, 0.1)).setY(y0)], 0.02, lm, g);
  const top = canvasTex(128, 128, (x) => {
    x.fillStyle = '#e9d7b2'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#c0432b'; x.lineWidth = 9; x.beginPath();
    for (let i = 0; i < 6; i++) { const yy = 22 + i * 17; x.moveTo(26, yy); x.lineTo(102, yy); }
    x.stroke(); x.lineWidth = 9; x.beginPath(); x.moveTo(102, 22); x.lineTo(102, 39); x.moveTo(26, 39); x.lineTo(26, 56); x.moveTo(102, 56); x.lineTo(102, 73); x.moveTo(26, 73); x.lineTo(26, 90); x.moveTo(102, 90); x.lineTo(102, 107); x.stroke();
  });
  const side = M('#b9a27a', { r: 0.4 });
  const head = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 28), [side, M('#fff', { x: { map: top }, r: 0.35 }), side], c.clone().setY(y0 + 0.06), g);
  const sun = makeGlow('#ffd35a', 3); sun.position.copy(c).setY(y0 + 2.4); g.add(sun);
  const core = makeGlow('#fff2c4', 0.9); core.position.copy(sun.position); g.add(core);
  g.userData = {
    anchor: c.clone().setY(y0 + 0.5), pick: [head], slider: s.id,
    tick(hw) { const v = hw ? hw.input(s.id) : 0.5; sun.material.opacity = 0.15 + v * 0.8; sun.scale.setScalar(1.5 + v * 3); core.material.opacity = 0.3 + v * 0.7; },
  };
  return g;
};

F.buzzer = (s) => {
  const g = new THREE.Group(); const A = holePos(...s.a), B = holePos(...s.b); const c = mid(A, B);
  const lm = metal(); const y0 = BB.h + 0.15;
  legs([A, A.clone().setY(y0)], 0.025, lm, g); legs([B, B.clone().setY(y0)], 0.025, lm, g);
  const body = new THREE.Group(); body.position.copy(c).setY(y0); g.add(body);
  const bm = M('#232323', { r: 0.6 });
  const cyl = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.55, 36), bm, new V3(0, 0.275, 0), body);
  mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 32), M('#3a3a3a'), new V3(0, 0.555, 0), body).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), M('#0c0c0c'), new V3(0, 0.56, 0), body);
  mesh(new THREE.BoxGeometry(0.18, 0.02, 0.05), M('#d9d3c7'), new V3(0.32, 0.56, 0), body);
  mesh(new THREE.BoxGeometry(0.05, 0.02, 0.18), M('#d9d3c7'), new V3(0.32, 0.56, 0), body);
  const rings = [0, 1, 2].map(() => {
    const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: '#2fb8c4', transparent: true, opacity: 0, depthWrite: false }));
    r.position.copy(c).setY(y0 + 0.9); g.add(r); return r;
  });
  g.userData = {
    anchor: c.clone().setY(y0 + 1.1), pick: [cyl],
    tick(hw, t) {
      const f = hw ? hw.tone(s.pin) : 0;
      body.position.x = c.x + (f ? Math.sin(t * 90) * 0.012 : 0);
      rings.forEach((r, i) => { const k = ((t * 1.4 + i / 3) % 1); r.material.opacity = f ? (1 - k) * 0.6 : 0; r.scale.setScalar(0.6 + k * 1.9); });
    },
  };
  return g;
};

F.dht = (s) => {
  const g = new THREE.Group(); const H = [0, 1, 2, 3].map(i => holePos(s.col + i, s.row)); const c = mid(H[1], H[2]);
  const lm = metal(); const by = BB.h + 0.35;
  H.forEach(h => legs([h, h.clone().setY(by + 0.05)], 0.025, lm, g));
  const grille = canvasTex(256, 384, (x, w, h) => {
    x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h); x.fillStyle = '#d9d4c8';
    for (let r = 0; r < 7; r++) for (let q = 0; q < 4; q++) x.fillRect(28 + q * 54, 30 + r * 40, 40, 24);
    x.fillStyle = '#7c776c'; x.font = '600 30px "Space Grotesk", Arial'; x.textAlign = 'center'; x.fillText('DHT22', w / 2, h - 34);
  });
  const wm = M('#f1efe9', { r: 0.7 });
  const box = mesh(new THREE.BoxGeometry(0.9, 3.6, 2.4), [wm, M('#fff', { x: { map: grille }, r: 0.7 }), wm, wm, wm, wm], c.clone().setY(by + 1.8), g);
  g.userData = { anchor: c.clone().setY(by + 3.8), pick: [box], slider: s.id };
  return g;
};

F.sonar = (s) => {
  const g = new THREE.Group(); const H = [0, 1, 2, 3].map(i => holePos(s.col + i, s.row)); const c = mid(H[1], H[2]);
  const lm = metal(); const by = BB.h + 0.3; const face = s.face || 1;
  H.forEach(h => legs([h, h.clone().setY(by)], 0.025, lm, g));
  const pcbTex = canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = '#2a63b8'; x.fillRect(0, 0, w, h); x.fillStyle = '#dfe8f5'; x.font = '600 26px "Space Grotesk", Arial'; x.textAlign = 'center';
    x.fillText('HC-SR04P', w / 2, h - 22); x.font = '500 18px "IBM Plex Mono", monospace'; x.fillText('VCC  TRIG  ECHO  GND', w / 2, 30);
  });
  const pm = M('#2a63b8', { r: 0.6 });
  const pcb = mesh(new THREE.BoxGeometry(0.1, 2.7, 6.0), [M('#fff', { x: { map: pcbTex } }), M('#fff', { x: { map: pcbTex } }), pm, pm, pm, pm], c.clone().setY(by + 1.35), g);
  const silver = M('#d5d8dc', { r: 0.3, m: 0.85 }); const meshFace = M('#3b3b3b', { r: 0.9 });
  for (const dz of [-1.55, 1.55]) {
    const t = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.8, 32), [silver, meshFace, silver], c.clone().add(new V3(face * 0.45, 0, dz)).setY(by + 1.3), g);
    t.rotation.z = -face * Math.PI / 2;
  }
  mesh(new THREE.BoxGeometry(0.25, 0.4, 1.0), M('#cfd3d8', { r: 0.3, m: 0.8 }), c.clone().add(new V3(face * 0.15, 0, 0)).setY(by + 2.3), g);
  // target wall
  const wall = mesh(new THREE.BoxGeometry(0.35, 3.2, 4.2), M('#c9a979', { r: 0.8 }), new V3(), g);
  const pings = [0, 1, 2].map(() => {
    const r = mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 32), new THREE.MeshBasicMaterial({ color: '#2fb8c4', transparent: true, opacity: 0, depthWrite: false }), c.clone().setY(by + 1.3), g, false);
    r.rotation.y = Math.PI / 2; return r;
  });
  let lastPing = -1, pingT = 9;
  const x0 = c.x + face * 1.0;
  g.userData = {
    anchor: c.clone().setY(by + 3.0), pick: [pcb], slider: s.id, wall,
    tick(hw, t, dt) {
      const d = hw ? hw.input(s.id) : 30; const wx = x0 + face * (0.8 + Math.min(d, 250) * 0.045);
      wall.position.set(wx, by + 1.3 + 0.3, c.z);
      const pc = hw ? hw.pings : 0; if (pc !== lastPing) { lastPing = pc; pingT = 0; }
      pingT += dt;
      pings.forEach((r, i) => { const k = pingT * 2.2 - i * 0.18; const vis = k > 0 && k < 1; r.material.opacity = vis ? (1 - k) * 0.85 : 0; r.position.x = x0 + face * k * (wx - x0); r.scale.setScalar(0.6 + k * 1.2); });
    },
  };
  return g;
};

F.servo = (s) => {
  const g = new THREE.Group(); const base = new THREE.Group(); g.add(base);
  base.position.set(s.pos[0], 0, s.pos[1]); base.rotation.y = s.rot || 0;
  const bm = new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.35, transparent: true, opacity: 0.94 });
  const body = mesh(new THREE.BoxGeometry(4.5, 3.6, 2.4), bm, new V3(0, 1.8, 0), base);
  mesh(new THREE.BoxGeometry(6.4, 0.25, 2.4), bm, new V3(0, 2.9, 0), base);
  mesh(new THREE.BoxGeometry(2.6, 0.9, 2.4), bm, new V3(-0.95, 4.05, 0), base);
  mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.9, 28), bm, new V3(-1.2, 4.05, 0), base);
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16), M('#f3f1ea'), new V3(-1.2, 4.7, 0), base);
  const horn = new THREE.Group(); horn.position.set(-1.2, 4.95, 0); base.add(horn);
  const hm = M('#f7f5ef', { r: 0.5 });
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 24), hm, new V3(), horn);
  const arm = mesh(new THREE.BoxGeometry(0.5, 0.18, 3.0), hm, new V3(0, 0, 1.35), horn);
  mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 16), hm, new V3(0, 0, 2.85), horn);
  const label = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#2f6fd0'; x.fillRect(0, 0, w, h); x.fillStyle = '#e9f0ff'; x.font = '700 44px "Space Grotesk", Arial'; x.textAlign = 'center'; x.fillText('SG90', w / 2, 80); });
  mesh(new THREE.PlaneGeometry(2.4, 1.2), M('#fff', { x: { map: label, transparent: true } }), new V3(0.6, 1.8, 1.205), base);
  g.updateMatrixWorld(true);
  const exit = new V3(2.25, 0.6, 0).applyMatrix4(base.matrixWorld);
  const hornTip = new V3(0, 0, 0).applyMatrix4(horn.matrixWorld);
  g.userData = {
    anchor: hornTip.clone().add(new V3(0, 0.8, 0)), pick: [body, arm],
    pins: { GND: exit.clone().add(new V3(0, 0, -0.14)), V: exit.clone(), SIG: exit.clone().add(new V3(0, 0, 0.14)) },
    cableExit: true,
    tick(hw) { const a = hw ? hw.servo(s.pin) : null; const tgt = THREE.MathUtils.degToRad((a ?? 90) - 90); horn.rotation.y += (tgt - horn.rotation.y) * 0.18; },
  };
  return g;
};

export const OLED_W = 128, OLED_H = 64;
F.oled = (s) => {
  const g = new THREE.Group(); const base = new THREE.Group(); g.add(base);
  base.position.set(s.pos[0], 0, s.pos[1]); base.rotation.y = s.rot || 0;
  const tilt = new THREE.Group(); tilt.rotation.x = -0.22; base.add(tilt);
  const pcbTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#1b2846'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9d4ea'; x.font = '600 30px "IBM Plex Mono", monospace'; x.textAlign = 'center';
    ['GND', 'VCC', 'SCL', 'SDA'].forEach((n, i) => x.fillText(n, w / 2 + (i - 1.5) * 92, 92));
    x.strokeStyle = '#d7b46a'; x.lineWidth = 6; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(w / 2 + (i - 1.5) * 92, 36, 16, 0, 7); x.stroke(); }
    for (const [cx, cy] of [[34, 34], [478, 34], [34, 478], [478, 478]]) { x.fillStyle = '#e8e2d2'; x.beginPath(); x.arc(cx, cy, 18, 0, 7); x.fill(); }
  });
  const pm = M('#1b2846', { r: 0.6 });
  const pcb = mesh(new THREE.BoxGeometry(5.4, 5.4, 0.14), [pm, pm, pm, pm, M('#fff', { x: { map: pcbTex } }), pm], new V3(0, 2.75, 0), tilt);
  mesh(new THREE.BoxGeometry(5.0, 3.0, 0.16), M('#0d0d10', { r: 0.25 }), new V3(0, 2.45, 0.12), tilt);
  const scr = document.createElement('canvas'); scr.width = OLED_W; scr.height = OLED_H;
  const sx = scr.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, OLED_W, OLED_H);
  const stex = new THREE.CanvasTexture(scr); stex.magFilter = THREE.NearestFilter; stex.minFilter = THREE.LinearFilter; stex.colorSpace = THREE.SRGBColorSpace;
  const screen = mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }), new V3(0, 2.5, 0.205), tilt, false);
  // header pins on top edge
  const lm = M('#d9b56b', { r: 0.3, m: 0.8 }); const tips = {};
  ['GND', 'VCC', 'SCL', 'SDA'].forEach((n, i) => {
    const px = (i - 1.5) * P * 0.95; mesh(new THREE.BoxGeometry(0.2, 0.25, 0.25), M('#222'), new V3(px, 5.55, 0), tilt);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6), lm, new V3(px, 5.85, 0), tilt); tips[n] = new V3(px, 6.12, 0);
  });
  mesh(new THREE.BoxGeometry(5.0, 0.5, 1.6), M('#d8c7a6', { r: 0.8 }), new V3(0, 0.25, 0.3), base);
  g.updateMatrixWorld(true);
  for (const k in tips) tips[k].applyMatrix4(tilt.matrixWorld);
  let ver = -1;
  g.userData = {
    anchor: new V3(0, 5.6, 0).applyMatrix4(tilt.matrixWorld), pick: [pcb, screen], pins: tips, tipUp: true,
    tick(hw) {
      const o = hw && hw.oled;
      if (o && o.version !== ver) { ver = o.version; sx.drawImage(o.canvas, 0, 0); stex.needsUpdate = true; }
      if (!o && ver !== -1) { ver = -1; sx.fillStyle = '#000'; sx.fillRect(0, 0, OLED_W, OLED_H); stex.needsUpdate = true; }
    },
  };
  return g;
};

F.touch = (s) => {
  const g = new THREE.Group(); const c = new V3(s.pos[0], 0, s.pos[1]);
  mesh(new THREE.BoxGeometry(2.6, 0.12, 2.6), M('#efe6d3', { r: 0.8 }), c.clone().setY(0.06), g);
  const cu = M('#c98546', { r: 0.28, m: 0.75, x: { emissive: '#000' } });
  const pad = mesh(new THREE.BoxGeometry(2.0, 0.05, 2.0), cu, c.clone().setY(0.145), g);
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: '#2fb8c4', transparent: true, opacity: 0, depthWrite: false }));
  ring.position.copy(c).setY(0.9); g.add(ring);
  g.userData = {
    anchor: c.clone().setY(0.5), pick: [pad], press: s.id, pins: { main: c.clone().add(new V3(-0.9, 0.17, -0.9)) },
    tick(hw, t) { const on = hw && hw.input(s.id); cu.emissive.set(on ? '#5a2a08' : '#000'); ring.material.opacity = on ? 0.9 : 0; ring.scale.setScalar(1.6 + Math.sin(t * 8) * 0.15); },
  };
  return g;
};

// ---------- breadboard ----------
function makeBreadboard() {
  const g = new THREE.Group();
  const W = 19 * P + 0.55, D = 20 * P + 0.95;
  const scale = 64; // px per unit
  const tex = canvasTex(Math.round(W * scale), Math.round(D * scale), (x, w, h) => {
    x.fillStyle = '#f7f4ec'; x.fillRect(0, 0, w, h);
    const X = (u) => (u - (BB.x - W / 2)) * scale, Z = (u) => (u - (BB.z - D / 2)) * scale;
    // rail stripes
    x.lineWidth = 3;
    const stripe = (rx, col) => { x.strokeStyle = col; x.beginPath(); x.moveTo(X(BB.x + rx * P), Z(BB.z - 10.6 * P)); x.lineTo(X(BB.x + rx * P), Z(BB.z + 10.6 * P)); x.stroke(); };
    stripe(-9.15, '#d9473a'); stripe(-6.85, '#3c66c4'); stripe(6.85, '#3c66c4'); stripe(9.15, '#d9473a');
    x.fillStyle = '#4b463c';
    for (let c = 1; c <= 20; c++) {
      for (const r of Object.keys(ROWX)) {
        if (r.length > 1 && (c % 6 === 0)) continue;
        const p = holePos(c, r); const s = 0.17 * scale;
        x.fillRect(X(p.x) - s / 2, Z(p.z) - s / 2, s, s);
      }
    }
    x.fillStyle = '#9c9484'; x.font = `600 ${0.2 * scale}px "IBM Plex Mono", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const c of [1, 5, 10, 15, 20]) { const p = holePos(c, 'a'); x.save(); x.translate(X(p.x - 0.42), Z(p.z)); x.rotate(Math.PI / 2); x.fillText(String(c), 0, 0); x.restore(); }
    for (const r of 'abcdefghij') { const p = holePos(0.15, r); x.save(); x.translate(X(p.x), Z(p.z)); x.rotate(Math.PI / 2); x.fillText(r, 0, 0); x.restore(); }
    x.fillStyle = '#d9473a'; x.font = `700 ${0.3 * scale}px Arial`;
    for (const [rx, sgn] of [[-8.5, '+'], [8.5, '+']]) { const p = new V3(BB.x + rx * P, 0, BB.z - 10.75 * P); x.fillText(sgn, X(p.x), Z(p.z)); }
    x.fillStyle = '#3c66c4';
    for (const rx of [-7.5, 7.5]) { const p = new V3(BB.x + rx * P, 0, BB.z - 10.75 * P); x.fillText('−', X(p.x), Z(p.z)); }
  });
  const side = M('#efebe1', { r: 0.8 });
  const top = M('#fff', { r: 0.8, x: { map: tex } });
  const box = mesh(new THREE.BoxGeometry(W, BB.h, D), [side, side, top, side, side, side], new V3(BB.x, BB.h / 2, BB.z), g);
  mesh(new THREE.BoxGeometry(P * 1.4, 0.06, D - 0.2), M('#ddd6c6', { r: 0.9 }), new V3(BB.x, BB.h + 0.005, BB.z), g);
  g.userData = { pick: [box], anchor: new V3(BB.x, BB.h + 0.5, BB.z + D / 2 - 0.3) };
  return g;
}

// ---------- wires ----------
function makeWire(a, b, color, opt = {}) {
  const g = new THREE.Group();
  const dist = Math.hypot(a.x - b.x, a.z - b.z);
  const upA = opt.downA ? -0.5 : 0.55, upB = opt.downB ? -0.5 : 0.55;
  const h = Math.max(a.y + upA, b.y + upB) + (opt.lift ?? (0.35 + dist * 0.13));
  const pts = [a.clone(), a.clone().setY(a.y + upA * 0.55), a.clone().setY(a.y + upA)];
  const m = mid(a, b).setY(h);
  if (dist > 1.2) pts.push(a.clone().lerp(m, 0.45).setY((a.y + upA + h) / 2 + 0.25 * (h - a.y - upA)));
  pts.push(m);
  if (dist > 1.2) pts.push(b.clone().lerp(m, 0.45).setY((b.y + upB + h) / 2 + 0.25 * (h - b.y - upB)));
  pts.push(b.clone().setY(b.y + upB), b.clone().setY(b.y + upB * 0.55), b.clone());
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const wm = M(color, { r: 0.45 });
  const tube = mesh(new THREE.TubeGeometry(curve, 72, 0.055, 8, false), wm, null, g);
  const hm = M('#2a2826', { r: 0.6 });
  for (const [p, up] of [[a, upA], [b, upB]]) {
    if (opt.noCap) continue;
    const c = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.36, 10), hm, p.clone().setY(p.y + Math.sign(up) * 0.2), g);
  }
  g.userData = { curve, pick: [tube] };
  return g;
}

// ================= Stage =================
export class Stage {
  constructor(canvas, overlay, svg) {
    this.canvas = canvas; this.overlay = overlay; this.svg = svg;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    this.view = { target: new V3(0, 1, 0), az: -0.55, el: 0.6, zoom: 1 };
    this.home = null; this.tw = null;
    this.parts = new Map(); this.wires = []; this.flowOn = false; this.labelsOn = true;
    this.hotspots = []; this.hw = null; this.t = 0; this.selectedPins = new Set();
    this.onHotspot = () => {}; this.onPress = () => {}; this.onPinHover = () => {}; this.onPartClick = () => {}; this.onWheelPart = () => {};
    this._lights(); this._ground(); this._controls();
    this.lessonGroup = new THREE.Group(); this.scene.add(this.lessonGroup);
    this.ro = new ResizeObserver(() => this._resize()); this.ro.observe(canvas.parentElement); this._resize();
    this.clock = new THREE.Clock(); this._activeUntil = 0; this._fc = 0; this._sig = '';
    const loop = () => { requestAnimationFrame(loop); this._frame(); };
    requestAnimationFrame(loop);
  }

  _lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xfffaf0, 0xb8a890, 2.1); s.add(this.hemi);
    const d = this.sun = new THREE.DirectionalLight(0xffffff, 2.3);
    d.position.set(-8, 22, 12); d.castShadow = true; d.shadow.mapSize.set(2048, 2048);
    const sc = d.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 60;
    d.shadow.bias = -0.0008; d.shadow.radius = 3; s.add(d); s.add(d.target);
    const f = new THREE.DirectionalLight(0xfff1dc, 0.6); f.position.set(10, 8, -6); s.add(f);
  }

  _ground() {
    this.gridMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#d9ccb2') }, uStrong: { value: new THREE.Color('#cdbd9e') }, uFade: { value: 34 }, uCenter: { value: new THREE.Vector2(0, 0) } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 uColor; uniform vec3 uStrong; uniform float uFade; uniform vec2 uCenter; varying vec3 vW;
        float grid(vec2 p, float s){ vec2 q = p/s; vec2 g = abs(fract(q-.5)-.5)/fwidth(q); return 1.-min(min(g.x,g.y),1.); }
        void main(){ float a = grid(vW.xz, ${(P * 2).toFixed(5)})*.45; float b = grid(vW.xz, ${(P * 10).toFixed(5)});
          float f = 1.-smoothstep(uFade*.35, uFade, length(vW.xz-uCenter));
          vec3 c = mix(uColor, uStrong, b); gl_FragColor = vec4(c, max(a,b*.85)*f); }`,
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), this.gridMat);
    grid.rotation.x = -Math.PI / 2; grid.position.y = -0.002; grid.renderOrder = -2; this.scene.add(grid);
    this.shadowMat = new THREE.ShadowMaterial({ opacity: 0.16 });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), this.shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; sh.renderOrder = -1; this.scene.add(sh);
    this.edgeMat = new THREE.LineBasicMaterial({ color: '#3a3329', transparent: true, opacity: 0.38 });
  }

  setTheme(dark) {
    this.dark = dark; this.poke();
    this.gridMat.uniforms.uColor.value.set(dark ? '#2e3a4f' : '#ddd1b8');
    this.gridMat.uniforms.uStrong.value.set(dark ? '#3e4d67' : '#cdbd9e');
    this.shadowMat.opacity = dark ? 0.35 : 0.16;
    this.edgeMat.color.set(dark ? '#0d1119' : '#3a3329'); this.edgeMat.opacity = dark ? 0.55 : 0.38;
    this.hemi.intensity = dark ? 1.5 : 2.1; this.sun.intensity = dark ? 1.9 : 2.3;
  }

  _edges(root, thr = 32) {
    root.traverse(o => {
      if (o.isMesh && !o.userData.noEdge && o.geometry && !(o.material && o.material.isMeshBasicMaterial)) {
        const key = o.geometry.uuid;
        const eg = new THREE.EdgesGeometry(o.geometry, thr);
        const l = new THREE.LineSegments(eg, this.edgeMat); l.raycast = () => {}; o.add(l);
      }
    });
  }

  async loadBoard(src) {
    const loader = new GLTFLoader();
    const gltf = typeof src === 'string' ? await loader.loadAsync(src) : await loader.parseAsync(src, '');
    const model = gltf.scene;
    const grp = new THREE.Group(); grp.add(model);
    model.rotation.x = -Math.PI / 2; grp.position.set(BOARD.x, BOARD.lift, BOARD.z);
    const meshes = [];
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; meshes.push(o); } });
    this.scene.add(grp); this.board = grp; grp.updateMatrixWorld(true);
    // locate the on-board LEDs and the silkscreen plane
    for (const m of meshes) {
      const mat = m.material; const box = new THREE.Box3().setFromObject(m); const c = box.getCenter(new V3());
      if (mat.emissive && mat.emissive.getHex() !== 0) {
        if (mat.color.r > mat.color.b) this.pwrLed = { mesh: m, mat, c }; else this.blueLed = { mesh: m, mat, c };
      }
      if (mat.map && mat.map.image && mat.map.image.height === 2048 && c.y > BOARD.lift) this.silk = m;
    }
    if (this.blueLed) { this.blueLed.mat = this.blueLed.mat.clone(); this.blueLed.mesh.material = this.blueLed.mat; this.blueGlow = makeGlow('#1e9bff', 1.5); this.blueGlow.position.copy(this.blueLed.c).add(new V3(0, 0.15, 0)); this.scene.add(this.blueGlow); }
    if (this.pwrLed) { this.redGlow = makeGlow('#ff3b2a', 0.75); this.redGlow.position.copy(this.pwrLed.c).add(new V3(0, 0.15, 0)); this.redGlow.material.opacity = 0.4; this.scene.add(this.redGlow); }
    await this._fixSilk();
    this._edges(model, 35);
    // interactive hit boxes: BOOT / EN buttons and header pins
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.boardHits = [];
    const hb = (pos, size, data) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), hitMat); m.position.copy(pos); m.userData = data; this.scene.add(m); this.boardHits.push(m); return m; };
    hb(bw(1.32, -4.45, 0.45), [0.8, 0.6, 0.8], { press: 'boot' });
    hb(bw(-1.32, -4.45, 0.45), [0.8, 0.6, 0.8], { press: 'en' });
    for (const s of ['L', 'R']) HEADER[s].forEach((n, i) => {
      const name = n === 'GND' ? (s === 'L' ? 'GNDL' : i === 0 ? 'GND' : 'GND2') : n;
      hb(pinPos(name, 0), [0.42, 0.5, 0.42], { pin: { side: s, i, name: n, silk: SILK[s][i] } });
    });
    // wireless waves
    this.waves = [0, 1, 2].map(() => {
      const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: '#2fb8c4', transparent: true, opacity: 0, depthWrite: false }));
      r.position.copy(bw(0, 4.8, 0.9)); this.scene.add(r); return r;
    });
    // pin highlight rings
    this.pinRings = [];
    this.anchors = {
      usb: bw(0.05, -5.6, 0.45), module: bw(0, 2.2, 0.8), antenna: bw(0, 4.85, 0.35), en: bw(-1.32, -4.45, 0.6), boot: bw(1.32, -4.45, 0.6),
      ldo: bw(-0.82, -2.85, 0.55), uart: bw(0.68, -2.65, 0.45), pwr: bw(0.38, -1.48, 0.35), led2: bw(0.55, -3.55, 0.35),
      left: pinPos('33', 0.1), right: pinPos('18', 0.1),
    };
  }

  async _fixSilk() {
    if (!this.silk) return;
    try { await document.fonts.load('700 29px "Space Grotesk"'); } catch (e) {}
    const img = this.silk.material.map.image;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.save(); x.translate(0, c.height); x.scale(1, -1);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 29px "Space Grotesk", Arial, sans-serif';
    for (let i = 0; i < 19; i++) {
      const y = 214.5 + i * 87.78;
      x.fillStyle = 'rgb(239,228,206)'; x.fillRect(104, y - 27, 104, 54); x.fillRect(832, y - 27, 88, 54);
      x.fillStyle = '#22211e'; x.fillText(SILK.L[i], 150, y + 1); x.fillText(SILK.R[i], 876, y + 1);
    }
    x.restore();
    const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const old = this.silk.material.map; this.silk.material = this.silk.material.clone(); this.silk.material.map = t; this.silk.material.needsUpdate = true;
  }

  // ----- lessons -----
  clearLesson() {
    this.lessonGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.scene.remove(this.lessonGroup); this.lessonGroup = new THREE.Group(); this.scene.add(this.lessonGroup);
    this.parts.clear(); this.wires = [];
  }

  endPos(spec) {
    if (typeof spec === 'string' && spec.startsWith('p:')) return pinPos(spec.slice(2));
    if (Array.isArray(spec)) return holePos(spec[0], spec[1]);
    if (spec && spec.part) { const p = this.parts.get(spec.part); return p.userData.pins[spec.pin || 'main'].clone(); }
    return new V3(spec.x, spec.y, spec.z);
  }

  setLesson(L) {
    this.clearLesson();
    const lay = L.layout || {};
    if (lay.bench) { const bb = makeBreadboard(); this._edges(bb, 40); this.lessonGroup.add(bb); this.parts.set('breadboard', bb); }
    for (const s of lay.parts || []) {
      const g = F[s.type](s); g.userData.id = s.id; g.userData.spec = s; this._edges(g, 40);
      this.lessonGroup.add(g); this.parts.set(s.id, g);
    }
    for (const w of lay.wires || []) {
      const a = this.endPos(w.from), b = this.endPos(w.to);
      const fromPart = w.from && w.from.part ? this.parts.get(w.from.part) : null;
      const wg = makeWire(a, b, w.color || '#2b2b2b', { lift: w.lift, downA: fromPart && fromPart.userData.cableExit, noCap: false });
      wg.userData.flow = w.flow || null; wg.userData.rev = !!w.rev;
      this.lessonGroup.add(wg); this.wires.push(wg);
      if (w.flow) {
        wg.userData.dots = [0, 1, 2, 3].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd84a', toneMapped: false })); d.visible = false; this.lessonGroup.add(d); return d; });
      }
    }
    this.setHotspots(L.hotspots || []); this.poke(2000);
    const v = L.view || {};
    const bench = !!lay.bench;
    this.home = {
      target: new V3(...(v.target || (bench ? [0.4, 0.6, -0.2] : [BOARD.x + 0.6, 1.6, 0.6]))),
      az: v.az ?? -0.55, el: v.el ?? 0.62, zoom: v.zoom ?? (bench ? 1.08 : 1.3),
    };
    this.tweenTo(this.home, 900);
  }

  // Ask for frames for a short while (the scene only redraws when something changes).
  poke(ms = 1200) { this._activeUntil = Math.max(this._activeUntil, performance.now() + ms); }

  rebuildPart(id, spec) {
    this.poke();
    const old = this.parts.get(id); if (!old) return;
    const keep = { gain: old.userData.gain };
    this.lessonGroup.remove(old); old.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    const g = F[spec.type](spec); g.userData.id = id; g.userData.spec = spec; Object.assign(g.userData, keep);
    this._edges(g, 40); this.lessonGroup.add(g); this.parts.set(id, g); return g;
  }
  part(id) { return this.parts.get(id); }

  // ----- hotspots -----
  setHotspots(list) {
    this.overlay.querySelectorAll('.hs,.hs-dot').forEach(e => e.remove());
    this.svg.innerHTML = '';
    this.hotspots = list.map((h, idx) => {
      const el = document.createElement('button');
      el.className = 'hs'; el.type = 'button'; el.dataset.id = h.id;
      el.innerHTML = `<span class="hs-k">${h.label}</span><span class="hs-d">${h.desc || ''}</span>`;
      const dot = document.createElement('span'); dot.className = 'hs-dot';
      this.overlay.append(dot, el);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('class', 'hs-line'); this.svg.append(line);
      el.addEventListener('click', () => this.onHotspot(h));
      el.addEventListener('mouseenter', () => this.flash(h, true)); el.addEventListener('mouseleave', () => this.flash(h, false));
      el.addEventListener('focus', () => this.flash(h, true)); el.addEventListener('blur', () => this.flash(h, false));
      return { h, el, dot, line, idx };
    });
  }
  anchorOf(h) {
    const a = h.at;
    if (!a) return new V3();
    if (a.part) { const p = this.parts.get(a.part); return p ? p.userData.anchor.clone() : new V3(); }
    if (a.pin) return pinPos(a.pin, 0.2);
    if (a.board) return this.anchors[a.board].clone();
    if (a.hole) return holePos(a.hole[0], a.hole[1], 0.1);
    return new V3(...a.xyz);
  }
  flash(h, on) {
    this.poke(500);
    const id = h.at && h.at.part; this._flashId = on ? id : null;
    if (h.at && h.at.pin) this.highlightPins(on ? [h.at.pin] : []);
  }
  highlightPins(names) {
    this.poke(400);
    for (const r of this.pinRings) this.scene.remove(r);
    this.pinRings = names.map(n => {
      const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: '#2fb8c4', transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
      r.position.copy(pinPos(n, 0.05)); r.scale.setScalar(0.62); r.renderOrder = 10; this.scene.add(r); return r;
    });
  }

  _project(v) {
    const p = v.clone().project(this.cam);
    return [(p.x + 1) / 2 * this.w, (1 - p.y) / 2 * this.h];
  }
  _layoutLabels() {
    if (!this.hotspots.length) return;
    const show = this.labelsOn;
    let cx = 0, cy = 0; const pts = this.hotspots.map(o => { const p = this._project(this.anchorOf(o.h)); cx += p[0]; cy += p[1]; return p; });
    cx /= pts.length; cy /= pts.length;
    const compact = this.w < 640;
    this.hotspots.forEach((o, i) => {
      const [x, y] = pts[i]; const h = o.h;
      let dx, dy;
      if (h.off) { [dx, dy] = h.off; } else { let vx = x - cx, vy = y - cy; const l = Math.hypot(vx, vy) || 1; dx = vx / l * 70; dy = vy / l * 56 - 18; }
      const k = compact ? 0.6 : Math.min(1, Math.max(0.7, this.w / 1250)); dx *= k; dy *= k;
      const lx = x + dx, ly = y + dy;
      const bw = o.el.offsetWidth || 120, bh = o.el.offsetHeight || 26;
      let left = dx < -8 ? lx - bw : dx > 8 ? lx : lx - bw / 2;
      left = Math.max(6, Math.min(this.w - bw - 6, left));
      const top = Math.max(6, Math.min(this.h - bh - 6, ly - bh / 2));
      o.dot.style.transform = `translate(${x}px,${y}px)`;
      o.el.style.transform = `translate(${left}px,${top}px)`;
      const ex = Math.max(left, Math.min(left + bw, x)), ey = Math.max(top, Math.min(top + bh, y));
      o.line.setAttribute('x1', x); o.line.setAttribute('y1', y); o.line.setAttribute('x2', ex); o.line.setAttribute('y2', ey);
      const vis = show && x > -20 && y > -20 && x < this.w + 20 && y < this.h + 20;
      o.el.hidden = !vis; o.dot.hidden = !vis; o.line.style.display = vis ? '' : 'none';
    });
  }

  // ----- camera -----
  _resize() {
    const p = this.canvas.parentElement; const w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h; this.renderer.setSize(w, h, false); this._applyCam(); this.poke(600);
  }
  _applyCam() {
    const v = this.view; const H = 17; const asp = (this.w || 1) / (this.h || 1);
    // keep content visible on tall/narrow viewports
    const effH = asp < 1.25 ? H * 1.32 / Math.max(asp, 0.45) : H;
    this.cam.left = -effH * asp / 2; this.cam.right = effH * asp / 2; this.cam.top = effH / 2; this.cam.bottom = -effH / 2;
    this.cam.zoom = v.zoom; this.cam.updateProjectionMatrix();
    const d = 80; const ce = Math.cos(v.el);
    this.cam.position.set(v.target.x + Math.sin(v.az) * ce * d, v.target.y + Math.sin(v.el) * d, v.target.z + Math.cos(v.az) * ce * d);
    this.cam.lookAt(v.target); this.ppu = this.h / (this.cam.top - this.cam.bottom) * v.zoom;
  }
  tweenTo(to, ms = 600) {
    this.poke(ms + 300);
    const v = this.view; let daz = to.az - v.az; daz = Math.atan2(Math.sin(daz), Math.cos(daz));
    this.tw = { t0: performance.now(), ms, from: { target: v.target.clone(), az: v.az, el: v.el, zoom: v.zoom }, to: { target: to.target.clone(), az: v.az + daz, el: to.el, zoom: to.zoom } };
  }
  rotate(dir) { this.tweenTo({ target: this.view.target, az: this.view.az + dir * Math.PI / 4, el: this.view.el, zoom: this.view.zoom }, 500); }
  zoomBy(f) { this.tweenTo({ target: this.view.target, az: this.view.az, el: this.view.el, zoom: THREE.MathUtils.clamp(this.view.zoom * f, 0.45, 4.5) }, 280); }
  resetView() { if (this.home) this.tweenTo(this.home, 650); }
  pan(dx, dy) {
    const v = this.view; const r = new V3(Math.cos(v.az), 0, -Math.sin(v.az)); const f = new V3(-Math.sin(v.az), 0, -Math.cos(v.az));
    v.target.addScaledVector(r, -dx / this.ppu).addScaledVector(f, dy / this.ppu / Math.sin(v.el));
  }

  _controls() {
    const cv = this.canvas; const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    let drag = null; const pointers = new Map(); let pinch = null; this.keys = new Set();
    const pickAt = (e) => {
      const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.cam);
      const objs = [...(this.boardHits || [])];
      for (const [, p] of this.parts) for (const m of p.userData.pick || []) { m.userData._part = p; objs.push(m); }
      const hit = ray.intersectObjects(objs, false)[0];
      if (!hit) return null;
      if (hit.object.userData._part) return { part: hit.object.userData._part };
      return { board: hit.object.userData };
    };
    cv.addEventListener('pointerdown', (e) => {
      this.poke(1500);
      cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.tw = null;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.view.zoom, ang: Math.atan2(b.y - a.y, b.x - a.x), az: this.view.az }; drag = null; return; }
      const hit = pickAt(e);
      const pressId = hit && (hit.part ? hit.part.userData.press : hit.board.press);
      if (pressId && e.button === 0) { this.onPress(pressId, true); drag = { press: pressId }; return; }
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, rot: e.button === 2 || e.shiftKey, hit };
    });
    cv.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drag || pinch) this.poke(800);
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.view.zoom = THREE.MathUtils.clamp(pinch.z * d / pinch.d, 0.45, 4.5);
        this.view.az = pinch.az - (Math.atan2(b.y - a.y, b.x - a.x) - pinch.ang); return;
      }
      if (drag && !drag.press) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
        if (drag.rot) this.view.az -= dx * 0.008; else this.pan(dx, dy);
        return;
      }
      if (!drag && e.pointerType === 'mouse') {
        const hit = pickAt(e);
        const pin = hit && hit.board && hit.board.pin;
        this.onPinHover(pin || null, e.clientX, e.clientY);
        cv.style.cursor = hit && (hit.board ? (hit.board.press || hit.board.pin) : (hit.part.userData.press || hit.part.userData.knob || hit.part.userData.slider)) ? 'pointer' : 'grab';
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
      if (!drag) return;
      if (drag.press) this.onPress(drag.press, false);
      else if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5 && drag.hit) {
        if (drag.hit.part) this.onPartClick(drag.hit.part.userData.id, drag.hit.part.userData.spec);
        else if (drag.hit.board.pin) this.onPartClick('pin', drag.hit.board.pin);
      }
      drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => this.onPinHover(null));
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => {
      e.preventDefault(); this.tw = null; this.poke(800);
      const hit = pickAt(e);
      if (hit && hit.part && hit.part.userData.knob) { this.onWheelPart(hit.part.userData.knob, -Math.sign(e.deltaY)); return; }
      this.view.zoom = THREE.MathUtils.clamp(this.view.zoom * Math.exp(-e.deltaY * 0.0015), 0.45, 4.5);
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      const k = e.key.toLowerCase(); if ('wasdqe'.includes(k) && k.length === 1 && !e.metaKey && !e.ctrlKey) { this.keys.add(k); this.tw = null; this.poke(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05); this.t += dt; const t = this.t; const hw = this.hw;
    const sig = hw ? `${hw.running}${hw.sleeping}${this.flowOn}${this.labelsOn}` : '';
    if (sig !== this._sig) { this._sig = sig; this.poke(800); }
    const now = performance.now();
    const interacting = !!this.tw || (this.keys && this.keys.size > 0) || now < this._activeUntil;
    const running = hw && hw.running && !hw.sleeping;
    if (!interacting && !running) return;              // idle: keep the last frame, use no GPU
    if (!interacting && running && (this._fc++ & 1)) return;   // sketch running: 30 fps is plenty
    if (this.tw) {
      const k = Math.min(1, (performance.now() - this.tw.t0) / this.tw.ms); const e = 1 - Math.pow(1 - k, 3);
      const { from, to } = this.tw; const v = this.view;
      v.target.lerpVectors(from.target, to.target, e); v.az = from.az + (to.az - from.az) * e; v.el = from.el + (to.el - from.el) * e; v.zoom = from.zoom + (to.zoom - from.zoom) * e;
      if (k >= 1) this.tw = null;
    }
    if (this.keys && this.keys.size) {
      const s = 420 * dt;
      if (this.keys.has('w')) this.pan(0, s); if (this.keys.has('s')) this.pan(0, -s);
      if (this.keys.has('a')) this.pan(s, 0); if (this.keys.has('d')) this.pan(-s, 0);
      if (this.keys.has('q')) this.view.az += 1.6 * dt; if (this.keys.has('e')) this.view.az -= 1.6 * dt;
    }
    this._applyCam();
    this.gridMat.uniforms.uCenter.value.set(this.view.target.x, this.view.target.z);
    // board LEDs & radio
    const sleeping = hw && hw.sleeping;
    if (this.blueLed) { const l = hw ? hw.level(2) : 0; this.blueLed.mat.emissiveIntensity = 0.05 + l * 3; this.blueGlow.material.opacity = l * 0.6; }
    if (this.waves) {
      const on = hw && !sleeping && (hw.radio > 0);
      this.waves.forEach((r, i) => { const k = (t * 0.8 + i / 3) % 1; r.material.opacity = on ? (1 - k) * 0.55 : 0; r.scale.setScalar(0.8 + k * 3.2); r.material.color.set(hw && hw.radio === 2 ? '#5b7cff' : '#2fb8c4'); });
    }
    for (const [, p] of this.parts) {
      if (p.userData.tick) p.userData.tick(hw, t, dt);
      const fl = this._flashId && p.userData.id === this._flashId;
      if (fl !== p.userData._fl) { p.userData._fl = fl; p.traverse(o => { if (o.isLineSegments) o.material = fl ? this._hiMat() : this.edgeMat; }); }
    }
    // current flow
    for (const w of this.wires) {
      const dots = w.userData.dots; if (!dots) continue;
      let on = false;
      if (this.flowOn && hw && hw.running && !sleeping) {
        const f = w.userData.flow;
        on = f.startsWith('in:') ? !!hw.input(f.slice(3)) : hw.level(+f) > 0.02;
      }
      dots.forEach((d, i) => {
        d.visible = on; if (!on) return;
        let u = (t * 0.45 + i / dots.length) % 1; if (w.userData.rev) u = 1 - u;
        d.position.copy(w.userData.curve.getPointAt(u));
      });
    }
    this.renderer.render(this.scene, this.cam);
    this._layoutLabels();
  }
  _hiMat() { if (!this._hm) this._hm = new THREE.LineBasicMaterial({ color: '#16a7b5', transparent: true, opacity: 1 }); return this._hm; }

  // ----- thumbnails -----
  thumb(kind) {
    if (!this._tr) {
      this._tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this._tr.setSize(160, 160); this._tr.toneMapping = THREE.ACESFilmicToneMapping;
      this._ts = new THREE.Scene(); this._ts.add(new THREE.HemisphereLight(0xfffaf0, 0xb0a088, 2.4));
      const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-4, 10, 6); this._ts.add(d);
      this._tc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    }
    const g = new THREE.Group();
    const add = (o) => { g.add(o); return o; };
    if (kind === 'board') { const b = this.board.clone(true); add(b); }
    else {
      const specs = {
        led: { type: 'led', a: [10, 'c'], b: [11, 'c'], color: '#ff3b30' }, ledg: { type: 'led', a: [10, 'c'], b: [11, 'c'], color: '#35c759' },
        button: { type: 'button', col: 10 }, pot: { type: 'pot', col: 10, row: 'c' }, rgb: { type: 'rgb', col: 10, row: 'c' , pins: {} },
        ldr: { type: 'ldr', a: [10, 'c'], b: [11, 'c'] }, buzzer: { type: 'buzzer', a: [10, 'c'], b: [12, 'c'] }, dht: { type: 'dht', col: 10, row: 'c' },
        sonar: { type: 'sonar', col: 10, row: 'c' }, servo: { type: 'servo', pos: [0, 0], rot: 0.5 }, oled: { type: 'oled', pos: [0, 0] }, touch: { type: 'touch', pos: [0, 0] },
        res: { type: 'res', a: [9, 'c'], b: [12, 'c'], ohms: 220 },
      };
      const s = specs[kind]; const p = F[s.type](s); add(p);
      if (kind === 'sonar') p.userData.wall.visible = false;
      if (kind === 'rgb') p.traverse(o => { if (o.material && o.material.emissive && o.material.transparent) { o.material.emissive.set('#b040ff'); } });
      if (kind === 'oled') { /* screen stays dark */ }
      if (kind === 'led' || kind === 'ledg') p.userData.tick({ level: () => 0.5 });
    }
    const sprites = []; g.traverse(o => { if (o.isSprite) sprites.push(o); }); sprites.forEach(o => o.parent.remove(o));
    this._edges(g, 40);
    this._ts.add(g); g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g); const c = box.getCenter(new V3()); const sz = box.getSize(new V3());
    const az = -0.6, el = 0.62; const d = 60;
    this._tc.position.set(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d); this._tc.lookAt(c);
    const r = Math.max(sz.x, sz.y, sz.z) * 0.62; this._tc.left = -r; this._tc.right = r; this._tc.top = r; this._tc.bottom = -r; this._tc.updateProjectionMatrix();
    this._tr.render(this._ts, this._tc);
    const url = this._tr.domElement.toDataURL('image/png');
    this._ts.remove(g);
    return url;
  }
}
