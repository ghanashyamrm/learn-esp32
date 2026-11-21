// Lesson content, circuit layouts, pin reference and component library.
// Breadboard: columns 1–20 run front-to-back beside the board (header pin i lines up with column i+2),
// rows a–e sit nearest the ESP32, f–j beyond the centre gap. Rails: L+ L- (left) and R- R+ (right).

const W = { sig: '#e8742c', yel: '#e9b627', grn: '#3a9d5d', blu: '#3a7bd5', pur: '#8a5cc7', wht: '#efe9dc', gnd: '#2b2b2b', pwr: '#d63c2f' };
const gndRail = (flow) => ({ from: [2, 'L-'], to: 'p:GND', color: W.gnd, flow });
const v33Rail = () => ({ from: 'p:3V3', to: [1, 'L+'], color: W.pwr, lift: 1.6 });
function ledCircuit(pin, c0, color = '#ff3b30', id = 'led', rid = 'r1') {
  return {
    parts: [{ type: 'res', id: rid, a: [c0, 'c'], b: [c0 + 3, 'c'], ohms: 220 }, { type: 'led', id, a: [c0 + 3, 'e'], b: [c0 + 4, 'e'], color, pin }],
    wires: [{ from: 'p:' + pin, to: [c0, 'a'], color: W.sig, flow: String(pin) }, { from: [c0 + 4, 'a'], to: [c0 + 4, 'L-'], color: W.gnd, flow: String(pin) }],
  };
}
function bench(...pieces) {
  const o = { bench: true, parts: [], wires: [] };
  for (const p of pieces) { if (p.parts) o.parts.push(...p.parts); if (p.wires) o.wires.push(...p.wires); if (p.type) o.parts.push(p); if (p.from) o.wires.push(p); }
  return o;
}
const blinkBench = () => bench(ledCircuit(23, 3), gndRail('23'));
const BOARD_ONLY = { bench: false, parts: [], wires: [] };
const c = (s) => `<code>${s}</code>`;

export const TRACKS = ['Basics', 'Sensors & outputs', 'Wireless & power', 'Project'];

export const LESSONS = [
  // ---------------------------------------------------------------- 1
  {
    id: 'meet', track: 'Basics', title: 'Meet the board', thumb: 'board',
    overview: {
      title: 'ESP32 DevKitC V4',
      text: 'A small development board built around Espressif\'s ESP32: two 240 MHz cores, Wi-Fi and Bluetooth in one chip. Plug in USB, upload a sketch from the Arduino IDE, and almost every pin is yours to use.',
      bullets: [['chip', 'Dual-core processor with Wi-Fi + Bluetooth'], ['bolt', '3.3 V logic: pins are not 5 V tolerant'], ['usb', 'USB powers it and carries Serial to your computer']],
    },
    hotspots: [
      { id: 'mod', label: 'ESP32-WROOM module', desc: 'The ESP32 chip, 4 MB flash and a 40 MHz crystal under a metal shield.', at: { board: 'module' }, off: [-210, -30] },
      { id: 'ant', label: 'PCB antenna', desc: 'The zig-zag copper trace is the Wi-Fi/Bluetooth antenna. Keep metal away from it.', at: { board: 'antenna' }, off: [-170, -50] },
      { id: 'usb', label: 'Micro-USB', desc: 'Power and programming. Serial prints travel over this cable.', at: { board: 'usb' }, off: [70, 80] },
      { id: 'uart', label: 'USB-to-UART chip', desc: 'Converts USB to the serial signals the ESP32 understands (up to 3 Mbps).', at: { board: 'uart' }, off: [200, -70] },
      { id: 'ldo', label: '3.3 V regulator', desc: 'Turns 5 V from USB into the 3.3 V the ESP32 runs on.', at: { board: 'ldo' }, off: [-190, 30] },
      { id: 'boot', label: 'BOOT button', desc: 'GPIO0. Hold it during reset to enter download mode. Readable in sketches too.', at: { board: 'boot' }, off: [160, 70] },
      { id: 'en', label: 'EN (reset)', desc: 'Restarts the chip. Click it here to restart your sketch.', at: { board: 'en' }, off: [-150, 80] },
      { id: 'led2', label: 'GPIO2 LED', desc: 'Blue LED on GPIO2 (on many DevKit clones; the original V4 only has the red power LED).', at: { board: 'led2' }, off: [200, -10] },
    ],
    pinoutCaption: 'Every header pin. Hover a row to find it on the board.',
    pinout: 'ALL',
    steps: [
      `${c('#define LED_PIN 2')} gives GPIO2 a readable name.`,
      `${c('Serial.begin(115200)')} opens the USB serial link at 115 200 baud; the monitor must match.`,
      `${c('ESP.getChipModel()')} and friends ask the chip about itself.`,
      `${c('loop()')} repeats forever, switching the LED every second.`,
      'Press Run, then click the EN button on the board to restart it.',
    ],
    challenge: 'Make the LED flash twice quickly, then pause.',
    specs: [['Chip', 'ESP32-D0WD-V3, Xtensa LX6'], ['CPU', '2 cores, up to 240 MHz'], ['SRAM', '520 KB (+16 KB RTC)'], ['Flash', '4 MB (module)'], ['Wi-Fi', '802.11 b/g/n, 2.4 GHz'], ['Bluetooth', 'v4.2 Classic + BLE'], ['ADC', '18 channels, 12-bit'], ['DAC', '2 × 8-bit (GPIO25, 26)'], ['Touch', '10 capacitive pins'], ['PWM', '16 LEDC channels'], ['Logic level', '3.3 V'], ['Power in', '5 V via USB or 5V pin']],
    schematic: [['pin:GPIO2', 'R:resistor', 'LED:#4aa8ff', 'GND']],
    code: `// Meet the ESP32: say hello and blink the GPIO2 LED
#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("Hello from ESP32!");
  Serial.printf("Chip: %s, %d cores @ %d MHz\\n", ESP.getChipModel(), ESP.getChipCores(), ESP.getCpuFreqMHz());
  Serial.printf("Flash: %d MB\\n", ESP.getFlashChipSize() / (1024 * 1024));
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}
`,
    layout: BOARD_ONLY,
    quiz: [
      { q: 'What voltage do the ESP32\'s GPIO pins use?', o: ['5 V', '3.3 V', '12 V'], a: 1, why: 'The ESP32 is a 3.3 V chip. Feeding 5 V into a pin can damage it.' },
      { q: 'Which pins should you never use in a sketch?', o: ['GPIO6–11 (D0–D3, CMD, CLK)', 'GPIO21 and 22', 'GPIO32–35'], a: 0, why: 'They connect to the flash chip that stores your program.' },
      { q: 'What does the EN button do?', o: ['Erases flash', 'Resets the chip', 'Turns on Wi-Fi'], a: 1, why: 'EN (enable) restarts the ESP32. BOOT + EN enters download mode.' },
    ],
  },
  // ---------------------------------------------------------------- 2
  {
    id: 'blink', track: 'Basics', title: 'Blink an LED', thumb: 'led',
    overview: {
      title: 'Blink an LED',
      text: 'Your first circuit: GPIO23 drives an LED through a 220 Ω resistor on the breadboard. Switching the pin between 3.3 V and 0 V with a pause in between makes it blink.',
      bullets: [['out', `Digital output with ${c('digitalWrite()')}`], ['res', 'The resistor limits current to a safe ~6 mA'], ['led', 'Long leg (+) faces the resistor, short leg (−) goes to GND']],
    },
    hotspots: [
      { id: 'led', label: 'LED', desc: 'Lights whenever GPIO23 is HIGH.', at: { part: 'led' } },
      { id: 'res', label: '220 Ω resistor', desc: 'Red-red-brown. Keeps the LED current low.', at: { part: 'r1' } },
      { id: 'pin', label: 'GPIO23', desc: 'Your sketch switches this pin HIGH and LOW.', at: { pin: '23' } },
      { id: 'gnd', label: 'GND rail', desc: 'The blue (−) rail. Current returns to the ESP32 here.', at: { hole: [2, 'L-'] } },
    ],
    pinout: [['#e8742c', 'GPIO23', '220 Ω → LED (+)', 'Switches the LED on and off'], ['#2b2b2b', 'GND', 'Blue rail → LED (−)', 'Return path for the current']],
    steps: [
      `${c('const int LED_PIN = 23')} names the pin once so it's easy to change.`,
      `${c('pinMode(LED_PIN, OUTPUT)')} lets the pin drive current.`,
      `${c('digitalWrite(LED_PIN, HIGH)')} puts 3.3 V on the pin: the LED lights.`,
      `${c('delay(500)')} waits half a second, then ${c('LOW')} turns it off.`,
    ],
    challenge: 'Change the delays to make a heartbeat: two short blinks, one long pause.',
    specs: [['LED', '5 mm red, Vf ≈ 2.0 V'], ['Resistor', '220 Ω (red-red-brown)'], ['LED current', '(3.3 − 2.0) ÷ 220 ≈ 6 mA'], ['Pin limit', '≈ 40 mA absolute max, keep under 20 mA']],
    schematic: [['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `const int LED_PIN = 23;   // GPIO23 → 220 Ω → LED → GND

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);   // 3.3 V: LED on
  delay(500);
  digitalWrite(LED_PIN, LOW);    // 0 V: LED off
  delay(500);
}
`,
    layout: blinkBench(),
    quiz: [
      { q: 'Why is there a resistor in series with the LED?', o: ['To make it brighter', 'To limit the current', 'To change its colour'], a: 1, why: 'Without it the LED would try to draw far more current than it or the pin can handle.' },
      { q: 'What does delay(500) do?', o: ['Waits 500 ms', 'Waits 500 s', 'Blinks 500 times'], a: 0, why: 'delay() takes milliseconds.' },
      { q: 'Which LED leg goes towards GND?', o: ['The long leg', 'The short leg', 'Either'], a: 1, why: 'The short leg is the cathode (−).' },
    ],
  },
  // ---------------------------------------------------------------- 3
  {
    id: 'button', track: 'Basics', title: 'Push a button', thumb: 'button',
    overview: {
      title: 'Push a button',
      text: 'A pushbutton connects GPIO4 to ground when pressed. The ESP32\'s built-in pull-up resistor keeps the pin HIGH the rest of the time, so no extra resistor is needed.',
      bullets: [['in', `Digital input with ${c('digitalRead()')}`], ['up', `${c('INPUT_PULLUP')}: HIGH when released, LOW when pressed`], ['hand', 'Hold the red button on the breadboard to press it']],
    },
    hotspots: [
      { id: 'btn', label: 'Pushbutton', desc: 'Press and hold it. Joins column 14 to column 16.', at: { part: 'btn' } },
      { id: 'pin', label: 'GPIO4', desc: 'Reads HIGH (released) or LOW (pressed).', at: { pin: '4' } },
      { id: 'led', label: 'LED', desc: 'Lights while the button is held.', at: { part: 'led' } },
      { id: 'gnd', label: 'GND', desc: 'Pressing the button connects GPIO4 here.', at: { hole: [16, 'L-'] } },
    ],
    pinout: [['#3a7bd5', 'GPIO4', 'Button (one side)', 'Input with internal pull-up'], ['#2b2b2b', 'GND', 'Button (other side)', 'Pulls GPIO4 LOW when pressed'], ['#e8742c', 'GPIO23', '220 Ω → LED', 'Shows the button state']],
    steps: [
      `${c('pinMode(BUTTON_PIN, INPUT_PULLUP)')} switches on the internal ~45 kΩ pull-up.`,
      `${c('digitalRead()')} returns ${c('LOW')} while the button is pressed.`,
      'The LED copies the button; the Serial Monitor reports each change.',
      `${c('lastState')} remembers the previous reading so we only print on changes.`,
    ],
    challenge: 'Make each press toggle the LED instead of holding it on.',
    specs: [['Button', '6 mm tactile, 4 legs'], ['Pull-up', 'Internal, ≈ 45 kΩ'], ['Logic', 'Pressed = LOW (active-low)'], ['Bounce', 'Contacts chatter for ~5 ms']],
    schematic: [['pin:GPIO4', 'BTN', 'GND'], ['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `const int BUTTON_PIN = 4;
const int LED_PIN = 23;
int lastState = HIGH;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);   // reads HIGH until pressed
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int state = digitalRead(BUTTON_PIN);
  digitalWrite(LED_PIN, state == LOW ? HIGH : LOW);
  if (state != lastState) {
    Serial.println(state == LOW ? "Pressed" : "Released");
    lastState = state;
  }
  delay(10);   // tiny pause also hides contact bounce
}
`,
    layout: bench(ledCircuit(23, 3), { type: 'button', id: 'btn', col: 14, pin: 4 },
      { from: 'p:4', to: [14, 'a'], color: W.blu, flow: 'in:btn' }, { from: [16, 'a'], to: [16, 'L-'], color: W.gnd, flow: 'in:btn' }, gndRail('23')),
    quiz: [
      { q: 'With INPUT_PULLUP, what does a released button read?', o: ['LOW', 'HIGH', 'Random'], a: 1, why: 'The pull-up resistor holds the pin at 3.3 V until the button pulls it to GND.' },
      { q: 'Why add a pull-up at all?', o: ['A floating input reads random values', 'It makes the button faster', 'It saves power'], a: 0, why: 'An unconnected input picks up noise.' },
      { q: 'What is "bounce"?', o: ['The button springing back', 'Rapid on/off flicker as contacts settle', 'A Wi-Fi error'], a: 1, why: 'Metal contacts chatter for a few milliseconds.' },
    ],
  },
  // ---------------------------------------------------------------- 4
  {
    id: 'knob', track: 'Basics', title: 'Turn a knob', thumb: 'pot',
    overview: {
      title: 'Turn a knob',
      text: 'A potentiometer is a voltage divider you can turn. Its middle pin feeds GPIO34, and the ESP32\'s 12-bit ADC turns 0–3.3 V into a number from 0 to 4095. Here it sets the LED\'s blink speed.',
      bullets: [['knob', 'Drag the slider or scroll over the knob'], ['adc', `${c('analogRead()')} returns 0–4095`], ['in', 'GPIO34 is input-only and on ADC1, so it works with Wi-Fi too']],
    },
    hotspots: [
      { id: 'pot', label: 'Potentiometer', desc: 'Outer pins to 3.3 V and GND; the wiper (middle) goes to GPIO34.', at: { part: 'pot' } },
      { id: 'pin', label: 'GPIO34', desc: 'ADC1 channel 6. Input-only.', at: { pin: '34' } },
      { id: 'v33', label: '3V3', desc: 'Feeds the red (+) rail.', at: { pin: '3V3' } },
      { id: 'led', label: 'LED', desc: 'Blinks faster or slower as you turn.', at: { part: 'led' } },
    ],
    pinout: [['#d63c2f', '3V3', 'Pot outer pin', 'Top of the divider'], ['#8a5cc7', 'GPIO34', 'Pot wiper', 'Reads 0–3.3 V as 0–4095'], ['#2b2b2b', 'GND', 'Pot outer pin', 'Bottom of the divider'], ['#e8742c', 'GPIO23', '220 Ω → LED', 'Blink output']],
    steps: [
      `${c('analogRead(POT_PIN)')} samples the wiper voltage: 0 → 0 V, 4095 → about 3.3 V.`,
      `${c('analogReadMilliVolts()')} gives a calibrated voltage instead.`,
      `${c('map(raw, 0, 4095, 50, 1000)')} rescales the reading to a delay in ms.`,
      'The LED blinks with that delay, so the knob controls the speed.',
    ],
    challenge: 'Print a bar of # characters whose length follows the knob.',
    specs: [['Potentiometer', '10 kΩ linear'], ['ADC', '12-bit (0–4095)'], ['Range', '≈ 0.1–3.1 V usable'], ['ADC1 pins', 'GPIO32–39']],
    schematic: [['VCC:3V3', 'POT:10 kΩ', 'GND'], ['pin:GPIO34', 'TXT:← wiper']],
    code: `const int POT_PIN = 34;   // ADC1 pin (input-only)
const int LED_PIN = 23;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int raw = analogRead(POT_PIN);            // 0 – 4095
  int mv = analogReadMilliVolts(POT_PIN);   // calibrated mV
  int wait = map(raw, 0, 4095, 50, 1000);   // knob → blink speed
  Serial.printf("raw=%4d  %4d mV  blink=%d ms\\n", raw, mv, wait);
  digitalWrite(LED_PIN, HIGH);
  delay(wait);
  digitalWrite(LED_PIN, LOW);
  delay(wait);
}
`,
    layout: bench(ledCircuit(23, 3), { type: 'pot', id: 'pot', col: 13, row: 'c', pin: 34 },
      { from: [13, 'a'], to: [13, 'L+'], color: W.pwr }, { from: [15, 'a'], to: [15, 'L-'], color: W.gnd }, { from: [14, 'e'], to: 'p:34', color: W.pur, lift: 1.8 }, v33Rail(), gndRail('23')),
    view: { target: [-0.4, 0.8, 0.8] },
    quiz: [
      { q: 'What range does analogRead() return on the ESP32?', o: ['0–1023', '0–4095', '0–255'], a: 1, why: 'The ESP32 ADC is 12-bit by default.' },
      { q: 'Why use GPIO34 rather than GPIO4 here?', o: ['GPIO34 is on ADC1, which keeps working with Wi-Fi', 'GPIO4 has no ADC', 'GPIO34 is 5 V tolerant'], a: 0, why: 'ADC2 pins are unavailable while Wi-Fi is running.' },
      { q: 'Can GPIO34 light an LED?', o: ['Yes', 'No, it is input-only'], a: 1, why: 'GPIO34–39 have no output driver.' },
    ],
  },
  // ---------------------------------------------------------------- 5
  {
    id: 'fade', track: 'Basics', title: 'Fade with PWM', thumb: 'led',
    overview: {
      title: 'Fade with PWM',
      text: 'The ESP32 can\'t output a true in-between voltage on most pins, but it can switch very fast. PWM (pulse-width modulation) turns the pin on for a fraction of each cycle, and your eye sees it as dimmer or brighter.',
      bullets: [['wave', '5 000 pulses a second, 256 duty levels'], ['chip', 'The LEDC peripheral handles timing in hardware'], ['out', `${c('ledcAttach()')} + ${c('ledcWrite()')} (core 3.x API)`]],
    },
    hotspots: [
      { id: 'led', label: 'LED', desc: 'Brightness follows the duty cycle.', at: { part: 'led' } },
      { id: 'pin', label: 'GPIO23 (PWM)', desc: 'Any output GPIO can do PWM on the ESP32.', at: { pin: '23' } },
      { id: 'res', label: '220 Ω', desc: 'Same safety resistor as before.', at: { part: 'r1' } },
    ],
    pinout: [['#e8742c', 'GPIO23', '220 Ω → LED (+)', 'PWM output, 5 kHz'], ['#2b2b2b', 'GND', 'LED (−)', 'Return path']],
    steps: [
      `${c('ledcAttach(LED_PIN, 5000, 8)')} sets up PWM: 5 kHz with 8-bit resolution (duty 0–255).`,
      `${c('ledcWrite(LED_PIN, duty)')} sets how long each pulse stays on.`,
      'The first loop raises duty from 0 to 255: the LED fades in.',
      'The second loop lowers it again: the LED fades out.',
    ],
    challenge: 'Try 10-bit resolution (duty 0–1023) and adjust the loops.',
    specs: [['PWM peripheral', 'LEDC, 16 channels'], ['Frequency', '5 kHz here'], ['Resolution', '8-bit (0–255)'], ['Duty 50 %', '≈ half brightness (eyes are non-linear)']],
    schematic: [['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `const int LED_PIN = 23;
const int FREQ = 5000;   // PWM frequency in Hz
const int RES = 8;       // 8-bit: duty 0–255

void setup() {
  ledcAttach(LED_PIN, FREQ, RES);   // ESP32 Arduino core 3.x
}

void loop() {
  for (int duty = 0; duty <= 255; duty += 5) {
    ledcWrite(LED_PIN, duty);
    delay(20);
  }
  for (int duty = 255; duty >= 0; duty -= 5) {
    ledcWrite(LED_PIN, duty);
    delay(20);
  }
}
`,
    layout: blinkBench(),
    quiz: [
      { q: 'What does a 25 % duty cycle mean?', o: ['The pin is 25 % of 3.3 V', 'The pin is on for a quarter of each period', 'The LED is 25 % hotter'], a: 1, why: 'PWM varies on-time, not voltage.' },
      { q: 'With 8-bit resolution, what duty is fully on?', o: ['100', '255', '1023'], a: 1, why: '2⁸ − 1 = 255.' },
      { q: 'Which ESP32 peripheral generates PWM here?', o: ['ADC', 'LEDC', 'UART'], a: 1, why: 'LEDC = LED Control, though it drives any PWM load.' },
    ],
  },
  // ---------------------------------------------------------------- 6
  {
    id: 'rgb', track: 'Basics', title: 'Mix colours', thumb: 'rgb',
    overview: {
      title: 'Mix colours',
      text: 'An RGB LED is three LEDs (red, green, blue) sharing one cathode. Give each its own PWM pin and resistor and you can mix any colour by setting three brightness values.',
      bullets: [['rgb', 'Three PWM outputs: GPIO17, GPIO4, GPIO16'], ['res', 'One resistor per colour keeps them balanced'], ['led', 'Longest leg is the common cathode (GND)']],
    },
    hotspots: [
      { id: 'rgb', label: 'RGB LED', desc: 'Common cathode. Legs: R, GND, G, B.', at: { part: 'rgb' } },
      { id: 'rr', label: 'Resistors', desc: 'One 220 Ω per colour, bridging the centre gap.', at: { part: 'rr' } },
      { id: 'r', label: 'GPIO17 (red)', at: { pin: '17' } },
      { id: 'g', label: 'GPIO4 (green)', at: { pin: '4' } },
      { id: 'b', label: 'GPIO16 (blue)', at: { pin: '16' } },
    ],
    pinout: [['#d63c2f', 'GPIO17', '220 Ω → R', 'Red channel'], ['#3a9d5d', 'GPIO4', '220 Ω → G', 'Green channel'], ['#3a7bd5', 'GPIO16', '220 Ω → B', 'Blue channel'], ['#2b2b2b', 'GND', 'Common cathode', 'Shared return']],
    steps: [
      `${c('setColor(r, g, b)')} is our own helper that writes all three channels.`,
      `${c('analogWrite(pin, 0–255)')} is the simple 8-bit PWM call (core 2.0.11+).`,
      'Full red + some green looks orange; red + blue looks purple.',
      'Each colour is held for 800 ms, then the cycle repeats.',
    ],
    challenge: 'Fade smoothly through the rainbow by changing one channel at a time.',
    specs: [['LED', 'RGB, common cathode'], ['Resistors', '3 × 220 Ω'], ['Colours', '256³ ≈ 16.7 million'], ['Note', 'GPIO16/17 are free on WROOM, used by PSRAM on WROVER']],
    schematic: [['pin:GPIO17', 'R:220 Ω', 'LED:#ff3b30', 'GND'], ['pin:GPIO4', 'R:220 Ω', 'LED:#35c759', 'GND'], ['pin:GPIO16', 'R:220 Ω', 'LED:#3a7bd5', 'GND']],
    code: `const int R_PIN = 17, G_PIN = 4, B_PIN = 16;

void setColor(int r, int g, int b) {
  analogWrite(R_PIN, r);
  analogWrite(G_PIN, g);
  analogWrite(B_PIN, b);
}

void setup() {
  Serial.begin(115200);
}

void loop() {
  setColor(255, 0, 0);   Serial.println("red");    delay(800);
  setColor(0, 255, 0);   Serial.println("green");  delay(800);
  setColor(0, 0, 255);   Serial.println("blue");   delay(800);
  setColor(255, 120, 0); Serial.println("orange"); delay(800);
  setColor(160, 0, 255); Serial.println("purple"); delay(800);
}
`,
    layout: bench(
      { type: 'rgb', id: 'rgb', col: 12, row: 'h', pins: { r: 17, g: 4, b: 16 } },
      { type: 'res', id: 'rr', a: [12, 'e'], b: [12, 'f'], ohms: 220 }, { type: 'res', id: 'rg', a: [14, 'e'], b: [14, 'f'], ohms: 220 }, { type: 'res', id: 'rb', a: [15, 'e'], b: [15, 'f'], ohms: 220 },
      { from: 'p:17', to: [12, 'a'], color: W.pwr, flow: '17' }, { from: 'p:4', to: [14, 'a'], color: W.grn, flow: '4' }, { from: 'p:16', to: [15, 'b'], color: W.blu, flow: '16' },
      { from: [13, 'j'], to: [13, 'R-'], color: W.gnd }, { from: [20, 'L-'], to: [20, 'R-'], color: W.gnd }, gndRail()),
    view: { target: [1.2, 0.8, 1.2], zoom: 1.15 },
    quiz: [
      { q: 'How many PWM signals does one RGB LED need?', o: ['1', '3', '4'], a: 1, why: 'One per colour.' },
      { q: 'Red at full and blue at full makes…', o: ['Purple / magenta', 'Yellow', 'Cyan'], a: 0, why: 'Additive mixing: red + blue = magenta.' },
      { q: 'Why one resistor per colour instead of one on the cathode?', o: ['It is cheaper', 'Each LED colour has a different forward voltage', 'It is required by Wi-Fi'], a: 1, why: 'Sharing one resistor lets the lowest-voltage colour hog the current.' },
    ],
  },
  // ---------------------------------------------------------------- 7
  {
    id: 'touch', track: 'Sensors & outputs', title: 'Touch sensing', thumb: 'touch',
    overview: {
      title: 'Touch sensing',
      text: 'Ten ESP32 pins can sense touch with nothing attached but a wire or a piece of copper. Your finger adds capacitance, and the reading from touchRead() drops. No buttons needed.',
      bullets: [['hand', 'Hold the copper pad to touch it'], ['wave', 'Untouched ≈ 60, touched ≈ 10 (varies by wire length)'], ['chip', 'Touch pins: T0 (GPIO4) to T9 (GPIO32)']],
    },
    hotspots: [
      { id: 'pad', label: 'Copper pad', desc: 'Any conductive surface works: foil, a coin, a screw.', at: { part: 'pad' } },
      { id: 'pin', label: 'T0 = GPIO4', desc: 'Capacitive touch channel 0.', at: { pin: '4' } },
      { id: 'led2', label: 'GPIO2 LED', desc: 'Lights while you touch the pad.', at: { board: 'led2' } },
    ],
    pinout: [['#e9b627', 'GPIO4 (T0)', 'Copper pad', 'Capacitive touch input'], ['#4aa8ff', 'GPIO2', 'Board LED', 'Touch indicator']],
    steps: [
      `${c('touchRead(T0)')} measures the pad\'s capacitance as a number.`,
      'A finger makes the number drop sharply on the original ESP32.',
      `Below ${c('THRESHOLD')} (30) we treat it as a touch.`,
      'The board LED mirrors the touch; values stream to the Serial Monitor.',
    ],
    challenge: 'Count touches and print the total, ignoring a held finger.',
    specs: [['Touch pins', '10 (T0–T9)'], ['Typical reading', '≈ 60 untouched, ≈ 10 touched'], ['Threshold', '30 (tune for your wire)'], ['Bonus', 'Touch can wake the ESP32 from deep sleep']],
    schematic: [['pin:GPIO4 (T0)', 'TXT:wire', 'BOX:copper pad']],
    code: `const int TOUCH_PIN = T0;   // T0 = GPIO4
const int LED_PIN = 2;
const int THRESHOLD = 30;   // below this = touched

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int value = touchRead(TOUCH_PIN);
  Serial.println(value);
  digitalWrite(LED_PIN, value < THRESHOLD ? HIGH : LOW);
  delay(100);
}
`,
    layout: { bench: false, parts: [{ type: 'touch', id: 'pad', pos: [1.6, 2.6], pin: 4 }], wires: [{ from: 'p:4', to: { part: 'pad' }, color: W.yel, flow: 'in:pad' }] },
    view: { target: [-1.6, 1, 1.2], zoom: 1.35 },
    quiz: [
      { q: 'On the original ESP32, what happens to touchRead() when touched?', o: ['It goes up', 'It goes down', 'It stays the same'], a: 1, why: 'On ESP32 the value falls; on S2/S3 it rises.' },
      { q: 'Which pin is T0?', o: ['GPIO0', 'GPIO4', 'GPIO15'], a: 1, why: 'T0 maps to GPIO4.' },
      { q: 'What extra part does a touch pin need?', o: ['A 10 kΩ resistor', 'A capacitor', 'Nothing but a conductive pad'], a: 2, why: 'The sensing circuit is inside the chip.' },
    ],
  },
  // ---------------------------------------------------------------- 8
  {
    id: 'light', track: 'Sensors & outputs', title: 'Sense light', thumb: 'ldr',
    overview: {
      title: 'Sense light',
      text: 'A light-dependent resistor (LDR) drops its resistance in bright light. Paired with a 10 kΩ resistor it forms a voltage divider, so GPIO35 sees a higher voltage when it is brighter. When it gets dark, a night light turns on.',
      bullets: [['sun', 'Use the Light slider to brighten or darken the room'], ['adc', 'GPIO35 is an ADC1 input'], ['led', 'Night light on GPIO23 turns on below a threshold']],
    },
    hotspots: [
      { id: 'ldr', label: 'LDR', desc: 'Resistance falls from ~50 kΩ in the dark to ~1 kΩ in bright light.', at: { part: 'ldr' } },
      { id: 'r10', label: '10 kΩ', desc: 'Lower half of the divider.', at: { part: 'r10' } },
      { id: 'pin', label: 'GPIO35', desc: 'Reads the divider voltage.', at: { pin: '35' } },
      { id: 'led', label: 'Night light', at: { part: 'led' } },
    ],
    pinout: [['#d63c2f', '3V3', 'LDR top', 'Divider supply'], ['#8a5cc7', 'GPIO35', 'LDR / 10 kΩ junction', 'Light level 0–4095'], ['#2b2b2b', 'GND', '10 kΩ bottom', 'Divider return'], ['#e8742c', 'GPIO23', '220 Ω → LED', 'Night light']],
    steps: [
      'Bright light → low LDR resistance → higher voltage at GPIO35.',
      `${c('analogRead(LDR_PIN)')} gives 0 (dark) up to 4095 (very bright).`,
      `If the reading drops below ${c('1200')}, it is dark: LED on.`,
      'Readings print every 200 ms so you can tune the threshold.',
    ],
    challenge: 'Add hysteresis: switch on below 1100 but only off above 1400.',
    specs: [['LDR', 'GL5528-type, ~1 kΩ (bright) – 50 kΩ+ (dark)'], ['Fixed resistor', '10 kΩ'], ['Formula', 'V = 3.3 × 10k ÷ (10k + R_LDR)'], ['Response', 'Tens of milliseconds']],
    schematic: [['VCC:3V3', 'LDR', 'NODE:GPIO35', 'R:10 kΩ', 'GND'], ['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `const int LDR_PIN = 35;   // 3V3 → LDR → GPIO35 → 10 kΩ → GND
const int LED_PIN = 23;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int light = analogRead(LDR_PIN);   // brighter = higher
  Serial.print("Light: ");
  Serial.println(light);
  if (light < 1200) {
    digitalWrite(LED_PIN, HIGH);     // dark: night light on
  } else {
    digitalWrite(LED_PIN, LOW);
  }
  delay(200);
}
`,
    layout: bench(ledCircuit(23, 3), { type: 'ldr', id: 'ldr', a: [12, 'c'], b: [13, 'c'], pin: 35 }, { type: 'res', id: 'r10', a: [13, 'b'], b: [13, 'L-'], ohms: 10000 },
      { from: [12, 'a'], to: [12, 'L+'], color: W.pwr }, { from: [13, 'e'], to: 'p:35', color: W.pur, lift: 1.8 }, v33Rail(), gndRail('23')),
    view: { target: [-0.4, 0.8, 0.6] },
    quiz: [
      { q: 'In this circuit, what happens to the reading in the dark?', o: ['It rises', 'It falls'], a: 1, why: 'The LDR\'s resistance rises, so less voltage reaches GPIO35.' },
      { q: 'What does the 10 kΩ resistor do?', o: ['Protects the LED', 'Forms a voltage divider with the LDR', 'Filters Wi-Fi noise'], a: 1, why: 'Two resistors in series split the voltage.' },
      { q: 'Why might the light flicker on/off near the threshold?', o: ['Noise around one threshold value', 'The ADC is broken'], a: 0, why: 'Hysteresis (two thresholds) fixes it.' },
    ],
  },
  // ---------------------------------------------------------------- 9
  {
    id: 'sound', track: 'Sensors & outputs', title: 'Make a sound', thumb: 'buzzer',
    overview: {
      title: 'Make a sound',
      text: 'A passive piezo buzzer clicks every time its pin changes. tone() toggles the pin at an audio frequency, so the buzzer sings that note. Turn your speakers on to hear the scale.',
      bullets: [['note', `${c('tone(pin, Hz)')} starts a square wave`], ['wave', '262 Hz = middle C, 440 Hz = A4'], ['vol', 'Sound plays through your computer (toggle in Settings)']],
    },
    hotspots: [
      { id: 'bz', label: 'Piezo buzzer', desc: 'Passive type: you supply the frequency.', at: { part: 'bz' } },
      { id: 'pin', label: 'GPIO18', desc: 'Outputs the tone.', at: { pin: '18' } },
      { id: 'gnd', label: 'GND', at: { hole: [12, 'L-'] } },
    ],
    pinout: [['#e8742c', 'GPIO18', 'Buzzer (+)', 'Square wave at the note frequency'], ['#2b2b2b', 'GND', 'Buzzer (−)', 'Return']],
    steps: [
      `${c('melody[]')} holds the frequencies of a C-major scale.`,
      `${c('tone(BUZZER_PIN, melody[i])')} plays a note; ${c('noTone()')} stops it.`,
      'The short gap between notes keeps them from blurring together.',
      `${c('Serial.printf')} shows each note name and frequency.`,
    ],
    challenge: 'Play "Happy Birthday" using two arrays: notes and lengths.',
    specs: [['Buzzer', 'Passive piezo, 12 mm'], ['Range', '≈ 100 Hz – 10 kHz'], ['tone()', 'Uses an LEDC channel internally'], ['Active buzzer', 'Has its own oscillator: just HIGH/LOW']],
    schematic: [['pin:GPIO18', 'BUZ', 'GND']],
    code: `const int BUZZER_PIN = 18;
int melody[] = {262, 294, 330, 349, 392, 440, 494, 523};   // C4 … C5
const char* names[] = {"C", "D", "E", "F", "G", "A", "B", "C'"};

void setup() {
  Serial.begin(115200);
}

void loop() {
  for (int i = 0; i < 8; i++) {
    Serial.printf("%-2s %d Hz\\n", names[i], melody[i]);
    tone(BUZZER_PIN, melody[i]);
    delay(300);
    noTone(BUZZER_PIN);
    delay(60);
  }
  delay(1000);
}
`,
    layout: bench({ type: 'buzzer', id: 'bz', a: [10, 'd'], b: [12, 'd'], pin: 18 }, { from: 'p:18', to: [10, 'a'], color: W.sig }, { from: [12, 'a'], to: [12, 'L-'], color: W.gnd }, gndRail()),
    quiz: [
      { q: 'What does a passive buzzer need from the ESP32?', o: ['A steady HIGH', 'A changing signal at the note frequency', 'An analog voltage'], a: 1, why: 'It only makes sound when the voltage keeps changing.' },
      { q: 'Doubling the frequency raises the note by…', o: ['One octave', 'One semitone', 'Nothing'], a: 0, why: '262 Hz → 523 Hz is C4 → C5.' },
      { q: 'Which call stops the sound?', o: ['stop()', 'noTone()', 'delay(0)'], a: 1, why: 'noTone(pin) silences it.' },
    ],
  },
  // ---------------------------------------------------------------- 10
  {
    id: 'climate', track: 'Sensors & outputs', title: 'Temperature & humidity', thumb: 'dht',
    overview: {
      title: 'Temperature & humidity',
      text: 'The DHT22 measures temperature and relative humidity and sends both over a single data wire. The DHT library does the timing-critical work; you just call readTemperature() and readHumidity().',
      bullets: [['temp', 'Drag the sliders to change the room'], ['wave', 'One reading every 2 seconds at most'], ['res', 'Needs a 10 kΩ pull-up on DATA (built into most breakout boards)']],
    },
    hotspots: [
      { id: 'dht', label: 'DHT22', desc: 'Pins left to right: VCC, DATA, (unused), GND.', at: { part: 'dht' } },
      { id: 'pin', label: 'GPIO4 (DATA)', at: { pin: '4' } },
      { id: 'v33', label: '3V3', at: { pin: '3V3' } },
    ],
    pinout: [['#d63c2f', '3V3', 'DHT22 VCC', 'Power (3.3–6 V)'], ['#e9b627', 'GPIO4', 'DHT22 DATA', 'One-wire style data'], ['#2b2b2b', 'GND', 'DHT22 GND', 'Ground']],
    steps: [
      `${c('DHT dht(DHT_PIN, DHT22)')} creates a sensor object on GPIO4.`,
      `${c('dht.begin()')} prepares the pin.`,
      `${c('readHumidity()')} and ${c('readTemperature()')} return floats (°C by default).`,
      `${c('isnan()')} catches a failed read, for example a loose wire.`,
      `${c('computeHeatIndex()')} estimates how hot it feels.`,
    ],
    challenge: 'Print Fahrenheit too with readTemperature(true).',
    specs: [['Sensor', 'DHT22 / AM2302'], ['Temperature', '−40 to 80 °C, ±0.5 °C'], ['Humidity', '0–100 % RH, ±2–5 %'], ['Rate', '0.5 Hz (one reading / 2 s)'], ['Library', 'DHT sensor library (Adafruit)']],
    schematic: [['pin:GPIO4', 'BOX:DHT22', 'TXT:VCC 3V3 · GND']],
    code: `#include <DHT.h>
#define DHT_PIN 4
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  delay(2000);                       // DHT22: one reading every 2 s
  float h = dht.readHumidity();
  float t = dht.readTemperature();   // Celsius
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  float feels = dht.computeHeatIndex(t, h, false);
  Serial.printf("Temp %.1f C  Humidity %.1f %%  Feels like %.1f C\\n", t, h, feels);
}
`,
    layout: bench({ type: 'dht', id: 'dht', col: 13, row: 'c', pin: 4 }, { from: 'p:4', to: [14, 'a'], color: W.yel }, { from: [13, 'a'], to: [13, 'L+'], color: W.pwr }, { from: [16, 'a'], to: [16, 'L-'], color: W.gnd }, v33Rail(), gndRail()),
    view: { target: [0, 1.2, 0.6] },
    quiz: [
      { q: 'How often can a DHT22 be read?', o: ['Every 10 ms', 'About every 2 s', 'Once a minute'], a: 1, why: 'It needs about 2 s between measurements.' },
      { q: 'What does isnan(t) check for?', o: ['A failed reading', 'Negative temperature', 'Wi-Fi status'], a: 0, why: 'The library returns NaN when it can\'t talk to the sensor.' },
      { q: 'How many wires carry data from a DHT22?', o: ['1', '2', '4'], a: 0, why: 'A single data line carries both readings.' },
    ],
  },
  // ---------------------------------------------------------------- 11
  {
    id: 'distance', track: 'Sensors & outputs', title: 'Measure distance', thumb: 'sonar',
    overview: {
      title: 'Measure distance',
      text: 'An ultrasonic sensor chirps at 40 kHz and times the echo. Sound travels about 0.0343 cm per microsecond, so halving the round-trip time gives the distance. Move the wall with the slider and watch the numbers.',
      bullets: [['wave', 'TRIG starts a ping, ECHO stays HIGH for the round trip'], ['rule', 'Range ≈ 2–400 cm'], ['bolt', 'HC-SR04P runs on 3.3 V; the classic HC-SR04 needs 5 V and a divider on ECHO']],
    },
    hotspots: [
      { id: 'son', label: 'HC-SR04P', desc: 'One transducer sends, the other listens.', at: { part: 'sonar' } },
      { id: 'trig', label: 'GPIO5 → TRIG', at: { pin: '5' } },
      { id: 'echo', label: 'GPIO18 ← ECHO', at: { pin: '18' } },
    ],
    pinout: [['#d63c2f', '3V3', 'VCC', 'Power (HC-SR04P: 3–5.5 V)'], ['#e8742c', 'GPIO5', 'TRIG', '10 µs pulse starts a measurement'], ['#3a7bd5', 'GPIO18', 'ECHO', 'HIGH for the echo time'], ['#2b2b2b', 'GND', 'GND', 'Ground']],
    steps: [
      'TRIG goes HIGH for 10 µs: the sensor fires 8 ultrasonic pulses.',
      `${c('pulseIn(ECHO_PIN, HIGH)')} measures how long ECHO stays HIGH, in µs.`,
      `${c('duration * 0.0343 / 2')}: speed of sound × time, halved for there-and-back.`,
      'The result prints three times a second.',
    ],
    challenge: 'Light the board LED when something comes closer than 20 cm.',
    specs: [['Sensor', 'HC-SR04P (3.3 V-friendly)'], ['Range', '2–400 cm'], ['Frequency', '40 kHz'], ['Resolution', '≈ 0.3 cm'], ['5 V HC-SR04', 'ECHO needs a 1 k / 2 k divider']],
    schematic: [['pin:GPIO5', 'BOX:TRIG  HC-SR04P'], ['pin:GPIO18', 'BOX:ECHO  HC-SR04P']],
    code: `const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);   // 10 µs pulse starts a ping
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);   // echo time in µs
  float cm = duration * 0.0343 / 2;
  Serial.printf("Distance: %.1f cm\\n", cm);
  delay(300);
}
`,
    layout: bench({ type: 'sonar', id: 'sonar', col: 8, row: 'h', trig: 5, echo: 18, face: 1 },
      { from: 'p:5', to: [9, 'f'], color: W.sig }, { from: 'p:18', to: [10, 'f'], color: W.blu }, { from: 'p:3V3', to: [8, 'f'], color: W.pwr, lift: 2.2 }, { from: [11, 'f'], to: [11, 'L-'], color: W.gnd }, gndRail()),
    view: { target: [1.6, 1.4, 0.2], zoom: 0.86, az: -0.4 },
    noPinLog: true,
    quiz: [
      { q: 'Why divide by 2 in the distance formula?', o: ['The sensor has two transducers', 'Sound goes out and back', 'To convert to inches'], a: 1, why: 'The echo time covers the round trip.' },
      { q: 'What frequency does the sensor use?', o: ['40 Hz', '40 kHz', '2.4 GHz'], a: 1, why: 'Ultrasound, above human hearing.' },
      { q: 'Why can\'t a 5 V HC-SR04 ECHO go straight to an ESP32 pin?', o: ['It\'s too slow', 'Its 5 V output exceeds the 3.3 V pin limit', 'It needs Wi-Fi'], a: 1, why: 'Use a divider or the 3.3 V HC-SR04P.' },
    ],
  },
  // ---------------------------------------------------------------- 12
  {
    id: 'servo', track: 'Sensors & outputs', title: 'Sweep a servo', thumb: 'servo',
    overview: {
      title: 'Sweep a servo',
      text: 'A hobby servo turns to an angle you choose. It reads a 50 Hz pulse: about 0.5 ms means 0°, about 2.4 ms means 180°. The ESP32Servo library generates that pulse from any output pin.',
      bullets: [['servo', 'Brown = GND, red = 5 V, orange = signal'], ['bolt', 'Power it from 5V: motors draw spikes of current'], ['wave', `${c('myServo.write(angle)')} with 0–180`]],
    },
    hotspots: [
      { id: 'sv', label: 'SG90 servo', desc: 'Gearbox + motor + position sensor in one.', at: { part: 'servo' } },
      { id: 'sig', label: 'GPIO18 signal', at: { pin: '18' } },
      { id: 'v5', label: '5V', desc: 'USB 5 V for the motor.', at: { pin: '5V' } },
    ],
    pinout: [['#e8742c', 'GPIO18', 'Orange (signal)', '50 Hz control pulse'], ['#d63c2f', '5V', 'Red (V+)', 'Motor power'], ['#7a4a1e', 'GND', 'Brown (GND)', 'Ground']],
    steps: [
      `${c('#include <ESP32Servo.h>')} adds the ESP32 servo library.`,
      `${c('myServo.attach(18, 500, 2400)')} sets the pin and the pulse range in µs.`,
      'The first loop steps the angle up 2° every 15 ms; the second steps it back.',
      'The motor follows the commanded angle smoothly.',
    ],
    challenge: 'Control the angle with the potentiometer from the knob lesson.',
    specs: [['Servo', 'SG90 micro, 9 g'], ['Angle', '0–180°'], ['Pulse', '500–2400 µs at 50 Hz'], ['Supply', '4.8–6 V, up to ~650 mA stall'], ['Library', 'ESP32Servo']],
    schematic: [['pin:GPIO18', 'BOX:SG90 servo', 'TXT:5V · GND']],
    code: `#include <ESP32Servo.h>

Servo myServo;
const int SERVO_PIN = 18;

void setup() {
  Serial.begin(115200);
  myServo.attach(SERVO_PIN, 500, 2400);   // SG90 pulse range in µs
}

void loop() {
  for (int angle = 0; angle <= 180; angle += 2) {
    myServo.write(angle);
    delay(15);
  }
  Serial.println("Reached 180 degrees");
  for (int angle = 180; angle >= 0; angle -= 2) {
    myServo.write(angle);
    delay(15);
  }
  Serial.println("Back to 0 degrees");
  delay(500);
}
`,
    layout: { bench: false, parts: [{ type: 'servo', id: 'servo', pos: [3.4, 1.2], rot: Math.PI, pin: 18 }], wires: [
      { from: { part: 'servo', pin: 'SIG' }, to: 'p:18', color: W.sig }, { from: { part: 'servo', pin: 'V' }, to: 'p:5V', color: W.pwr, lift: 2.4 }, { from: { part: 'servo', pin: 'GND' }, to: 'p:GND2', color: '#7a4a1e' }] },
    view: { target: [-0.6, 1.6, 0.6], zoom: 1.2 },
    quiz: [
      { q: 'What does a servo read on its signal wire?', o: ['A voltage level', 'Pulse width at 50 Hz', 'Serial text'], a: 1, why: 'Pulse length sets the angle.' },
      { q: 'Why power the servo from 5V, not 3V3?', o: ['Servos are rated ~5 V and draw current spikes', '3V3 is input-only'], a: 0, why: 'The 3.3 V regulator also feeds the ESP32; motor spikes can reset it.' },
      { q: 'Which wire is ground on an SG90?', o: ['Orange', 'Red', 'Brown'], a: 2, why: 'Brown = GND, red = V+, orange = signal.' },
    ],
  },
  // ---------------------------------------------------------------- 13
  {
    id: 'oled', track: 'Sensors & outputs', title: 'Draw on an OLED', thumb: 'oled',
    overview: {
      title: 'Draw on an OLED',
      text: 'A 0.96" SSD1306 OLED has 128 × 64 pixels and talks I²C over just two wires. You draw text and shapes into a buffer, then display() sends the whole frame to the screen.',
      bullets: [['i2c', 'SDA = GPIO21, SCL = GPIO22 (default I²C pins)'], ['screen', 'Address 0x3C on most modules'], ['out', `Nothing appears until ${c('display.display()')}`]],
    },
    hotspots: [
      { id: 'oled', label: 'SSD1306 OLED', desc: '128 × 64 monochrome pixels; each one emits its own light.', at: { part: 'oled' } },
      { id: 'sda', label: 'GPIO21 SDA', at: { pin: '21' } },
      { id: 'scl', label: 'GPIO22 SCL', at: { pin: '22' } },
    ],
    pinout: [['#3a7bd5', 'GPIO21', 'SDA', 'I²C data'], ['#e9b627', 'GPIO22', 'SCL', 'I²C clock'], ['#d63c2f', '3V3', 'VCC', 'Power'], ['#2b2b2b', 'GND', 'GND', 'Ground']],
    steps: [
      `${c('Adafruit_SSD1306 display(128, 64, &Wire, -1)')} describes the screen; −1 = no reset pin.`,
      `${c('display.begin(SSD1306_SWITCHCAPVCC, 0x3C)')} starts it at I²C address 0x3C.`,
      'Each loop clears the buffer, draws text, a line, the counter and a circle.',
      `${c('display.display()')} pushes the finished frame to the panel.`,
    ],
    challenge: 'Draw a bouncing ball by moving a fillCircle each frame.',
    specs: [['Display', '0.96" SSD1306'], ['Resolution', '128 × 64'], ['Bus', 'I²C, address 0x3C'], ['Text size 1', '6 × 8 px per character'], ['Libraries', 'Adafruit SSD1306 + GFX']],
    schematic: [['pin:GPIO21', 'BOX:SDA  OLED'], ['pin:GPIO22', 'BOX:SCL  OLED']],
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);
int counter = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);   // SDA, SCL
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 not found");
    for (;;);
  }
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Hello, ESP32!");
  display.drawLine(0, 12, 127, 12, SSD1306_WHITE);
  display.setTextSize(3);
  display.setCursor(8, 24);
  display.print(counter);
  display.fillCircle(108, 40, 4 + counter % 6, SSD1306_WHITE);
  display.display();   // send the frame
  counter++;
  delay(500);
}
`,
    layout: { bench: false, parts: [{ type: 'oled', id: 'oled', pos: [1.9, -2.6], rot: -0.5 }], wires: [
      { from: { part: 'oled', pin: 'SDA' }, to: 'p:21', color: W.blu }, { from: { part: 'oled', pin: 'SCL' }, to: 'p:22', color: W.yel },
      { from: { part: 'oled', pin: 'VCC' }, to: 'p:3V3', color: W.pwr, lift: 1.2 }, { from: { part: 'oled', pin: 'GND' }, to: 'p:GND', color: W.gnd }] },
    view: { target: [-1.6, 2.0, -0.6], zoom: 1.25 },
    quiz: [
      { q: 'How many signal wires does I²C use?', o: ['1', '2', '4'], a: 1, why: 'SDA (data) and SCL (clock).' },
      { q: 'Why is nothing shown after display.print()?', o: ['The text is cached until display.display()', 'The screen is off', 'print() needs a delay'], a: 0, why: 'Drawing calls only change the buffer.' },
      { q: 'What is 0x3C?', o: ['The screen size', 'The I²C address', 'A colour'], a: 1, why: 'Most SSD1306 modules answer at 0x3C.' },
    ],
  },
  // ---------------------------------------------------------------- 14
  {
    id: 'wifi', track: 'Wireless & power', title: 'Connect to Wi-Fi', thumb: 'board', badge: 'wifi',
    overview: {
      title: 'Connect to Wi-Fi',
      text: 'Wi-Fi is built in. The sketch first scans for nearby 2.4 GHz networks, then joins one and gets an IP address from the router. In the simulator any network name connects; on a real board it must match yours.',
      bullets: [['wifi', `${c('WiFi.scanNetworks()')} lists nearby networks`], ['link', `${c('WiFi.begin(ssid, password)')} joins one`], ['warn', 'ESP32 supports 2.4 GHz only, not 5 GHz']],
    },
    hotspots: [
      { id: 'ant', label: 'Antenna', desc: 'Watch it radiate while the radio is on.', at: { board: 'antenna' }, off: [-130, -40] },
      { id: 'mod', label: 'Radio + CPU', desc: 'Wi-Fi and the CPU share the same chip.', at: { board: 'module' }, off: [140, -30] },
      { id: 'usb', label: 'Serial out', desc: 'Scan results and IP address arrive here.', at: { board: 'usb' }, off: [60, 60] },
    ],
    pinout: [['#2fb8c4', '(none)', 'Built-in radio', 'No wiring needed for Wi-Fi']],
    steps: [
      `${c('WiFi.mode(WIFI_STA)')} makes the ESP32 a station (a client, like a phone).`,
      `${c('WiFi.scanNetworks()')} returns how many networks it heard; ${c('SSID(i)')} and ${c('RSSI(i)')} describe each.`,
      `${c('WiFi.begin()')} starts joining; we poll ${c('WiFi.status()')} until ${c('WL_CONNECTED')}.`,
      `${c('WiFi.localIP()')} is the address the router gave us.`,
      `${c('WiFi.RSSI()')} reports signal strength in dBm (closer to 0 = stronger).`,
    ],
    challenge: 'Print a warning when the signal drops below −75 dBm.',
    specs: [['Standard', '802.11 b/g/n'], ['Band', '2.4 GHz only'], ['Modes', 'Station, access point, or both'], ['Peak current', '≈ 240 mA while transmitting']],
    schematic: [['ANT', 'TXT:2.4 GHz radio inside the module']],
    code: `#include <WiFi.h>

const char* ssid = "Workshop_2G";
const char* password = "your-password";

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  Serial.println("Scanning...");
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    Serial.printf("%d: %-16s %4d dBm  %s\\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                  WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "open" : "locked");
  }
  Serial.printf("Connecting to %s", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  Serial.printf("Signal: %d dBm\\n", WiFi.RSSI());
  delay(3000);
}
`,
    layout: BOARD_ONLY,
    quiz: [
      { q: 'Which Wi-Fi band can the ESP32 use?', o: ['2.4 GHz', '5 GHz', 'Both'], a: 0, why: 'The original ESP32 radio is 2.4 GHz only.' },
      { q: 'An RSSI of −45 dBm compared with −80 dBm is…', o: ['Weaker', 'Stronger'], a: 1, why: 'Closer to zero is a stronger signal.' },
      { q: 'What does WL_CONNECTED mean?', o: ['Scanning', 'Joined the network with an IP address', 'Wrong password'], a: 1, why: 'It is the status after a successful connection.' },
    ],
  },
  // ---------------------------------------------------------------- 15
  {
    id: 'webserver', track: 'Wireless & power', title: 'Web-controlled LED', thumb: 'board', badge: 'web', phone: 'web',
    overview: {
      title: 'Web-controlled LED',
      text: 'The ESP32 becomes a tiny web server. Open its IP address on a phone on the same network and tap the links to switch the LED. Here the phone on the left is simulated: it sends real requests to your sketch.',
      bullets: [['phone', 'Tap Turn ON / Turn OFF in the phone'], ['link', `${c('server.on("/on", handler)')} maps a URL to a function`], ['loop', `${c('server.handleClient()')} must run in loop()`]],
    },
    hotspots: [
      { id: 'led', label: 'LED', desc: 'Switched from the web page.', at: { part: 'led' } },
      { id: 'ant', label: 'Wi-Fi', desc: 'Requests arrive over the air.', at: { board: 'antenna' } },
      { id: 'pin', label: 'GPIO23', at: { pin: '23' } },
    ],
    pinout: [['#e8742c', 'GPIO23', '220 Ω → LED', 'Switched by HTTP requests'], ['#2b2b2b', 'GND', 'LED (−)', 'Return']],
    steps: [
      'The sketch joins Wi-Fi, then prints its IP address.',
      `${c('server.on("/", handleRoot)')} serves the page; ${c('/on')} and ${c('/off')} switch the LED.`,
      `${c('page()')} builds the HTML as a ${c('String')}, including the current state.`,
      `${c('server.send(200, "text/html", page())')} replies to the browser.`,
      `${c('server.handleClient()')} in ${c('loop()')} answers waiting requests.`,
    ],
    challenge: 'Add a /toggle link and show the uptime in seconds on the page.',
    specs: [['Library', 'WebServer (built into ESP32 core)'], ['Port', '80 (HTTP)'], ['Routes', '/, /on, /off'], ['Simulated IP', '192.168.1.42']],
    schematic: [['ANT', 'TXT:HTTP'], ['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Workshop_2G";
const char* password = "your-password";
const int LED_PIN = 23;
bool ledOn = false;

WebServer server(80);

String page() {
  String html = "<h1>ESP32 Web LED</h1>";
  html += "<p>The LED is <b>" + String(ledOn ? "ON" : "OFF") + "</b></p>";
  html += "<p><a class='btn' href='/on'>Turn ON</a> <a class='btn' href='/off'>Turn OFF</a></p>";
  return html;
}

void handleRoot() { server.send(200, "text/html", page()); }
void handleOn()   { ledOn = true;  digitalWrite(LED_PIN, HIGH); server.send(200, "text/html", page()); }
void handleOff()  { ledOn = false; digitalWrite(LED_PIN, LOW);  server.send(200, "text/html", page()); }

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print("."); }
  Serial.print("\\nOpen http://");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.begin();
}

void loop() {
  server.handleClient();
}
`,
    layout: blinkBench(),
    view: { target: [-2.2, 0.6, -0.4], zoom: 1.02 },
    quiz: [
      { q: 'What happens if loop() never calls server.handleClient()?', o: ['Requests are never answered', 'The LED blinks', 'Wi-Fi disconnects'], a: 0, why: 'The server only replies when handleClient() runs.' },
      { q: 'What does server.send(200, …) mean?', o: ['Send 200 bytes', 'Reply "OK" with a page', 'Wait 200 ms'], a: 1, why: '200 is the HTTP status code for success.' },
      { q: 'Who can open the page?', o: ['Anyone on the internet', 'Devices on the same network', 'Only the USB computer'], a: 1, why: 'The IP is local to your router\'s network.' },
    ],
  },
  // ---------------------------------------------------------------- 16
  {
    id: 'bluetooth', track: 'Wireless & power', title: 'Bluetooth chat', thumb: 'board', badge: 'bt', phone: 'bt',
    overview: {
      title: 'Bluetooth chat',
      text: 'The original ESP32 speaks Classic Bluetooth, so it can act like a wireless serial cable. Pair the simulated phone, type "on" or "off", and the LED obeys. Replies travel back to the phone.',
      bullets: [['bt', `${c('SerialBT')} works like ${c('Serial')}, but over the air`], ['phone', 'Connect, then send commands from the phone'], ['warn', 'Classic BT: ESP32 only (not S2, S3 or C3)']],
    },
    hotspots: [
      { id: 'led', label: 'LED', at: { part: 'led' } },
      { id: 'ant', label: 'Bluetooth radio', desc: 'Shares the antenna with Wi-Fi.', at: { board: 'antenna' } },
    ],
    pinout: [['#e8742c', 'GPIO23', '220 Ω → LED', 'Commanded over Bluetooth']],
    steps: [
      `${c('SerialBT.begin("ESP32-Lab")')} makes the board discoverable under that name.`,
      `${c('SerialBT.available()')} tells you a message has arrived.`,
      `${c('readStringUntil(\'\\n\')')} reads one line; ${c('trim()')} removes stray spaces.`,
      'Matching "on" or "off" switches the LED and sends a reply.',
    ],
    challenge: 'Add a "status" command that replies with the LED state and uptime.',
    specs: [['Protocol', 'Bluetooth Classic SPP'], ['Library', 'BluetoothSerial (ESP32 core)'], ['Range', '≈ 10 m indoors'], ['Chips', 'ESP32 only (no Classic BT on S2/S3/C3)']],
    schematic: [['ANT', 'TXT:Bluetooth SPP'], ['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `#include <BluetoothSerial.h>

BluetoothSerial SerialBT;
const int LED_PIN = 23;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  SerialBT.begin("ESP32-Lab");   // name your phone will see
  Serial.println("Pair your phone with ESP32-Lab");
}

void loop() {
  if (SerialBT.available()) {
    String cmd = SerialBT.readStringUntil('\\n');
    cmd.trim();
    Serial.println("Phone says: " + cmd);
    if (cmd == "on") {
      digitalWrite(LED_PIN, HIGH);
      SerialBT.println("LED is ON");
    } else if (cmd == "off") {
      digitalWrite(LED_PIN, LOW);
      SerialBT.println("LED is OFF");
    } else {
      SerialBT.println("Try: on / off");
    }
  }
  delay(20);
}
`,
    layout: blinkBench(),
    view: { target: [-2.2, 0.6, -0.4], zoom: 1.02 },
    quiz: [
      { q: 'Which ESP32 family members have Classic Bluetooth?', o: ['ESP32 (original)', 'ESP32-S2', 'ESP32-C3'], a: 0, why: 'S2 has no Bluetooth; S3 and C3 only have BLE.' },
      { q: 'What does SerialBT.available() return?', o: ['Signal strength', 'How many bytes are waiting', 'True if paired'], a: 1, why: 'Same as Serial.available().' },
      { q: 'Why call cmd.trim()?', o: ['To remove "\\r" and spaces', 'To shorten long messages', 'To encrypt it'], a: 0, why: 'Phones often send a carriage return with each line.' },
    ],
  },
  // ---------------------------------------------------------------- 17
  {
    id: 'sleep', track: 'Wireless & power', title: 'Deep sleep', thumb: 'board', badge: 'sleep',
    overview: {
      title: 'Deep sleep',
      text: 'In deep sleep the ESP32 shuts off its CPUs and radio and sips around 10 µA, so batteries last for months. A timer or the BOOT button wakes it, and it restarts from setup(). Only variables marked RTC_DATA_ATTR survive.',
      bullets: [['moon', 'Timer wake-up every 5 seconds'], ['hand', 'Or press BOOT on the board to wake it early'], ['mem', `${c('RTC_DATA_ATTR')} keeps ${c('bootCount')} across sleeps`]],
    },
    hotspots: [
      { id: 'mod', label: 'RTC domain', desc: 'A tiny always-on part of the chip keeps the timer and 8 KB of RTC memory alive.', at: { board: 'module' }, off: [140, -40] },
      { id: 'boot', label: 'BOOT = wake button', desc: 'GPIO0 pulled LOW wakes the chip (ext0).', at: { board: 'boot' }, off: [120, 50] },
      { id: 'pwr', label: 'Power LED', desc: 'Stays lit: it is on the 5 V side, not the chip.', at: { board: 'pwr' }, off: [-150, 20] },
    ],
    pinout: [['#2fb8c4', 'GPIO0', 'BOOT button', 'ext0 wake source (LOW)']],
    steps: [
      `${c('RTC_DATA_ATTR int bootCount')} lives in RTC memory, which stays powered.`,
      `${c('esp_sleep_get_wakeup_cause()')} tells you why it woke.`,
      `${c('esp_sleep_enable_timer_wakeup(5 * 1000000ULL)')} sets a 5 s alarm (in µs).`,
      `${c('esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0)')} also wakes on the BOOT button.`,
      `${c('esp_deep_sleep_start()')} sleeps; ${c('loop()')} never runs.`,
    ],
    challenge: 'Only blink the GPIO2 LED on every third boot.',
    specs: [['Deep sleep', '≈ 10 µA (chip, RTC timer + memory)'], ['Active, no radio', '30–68 mA at 240 MHz'], ['Wi-Fi TX peak', '≈ 240 mA'], ['RTC memory', '8 KB slow RTC SRAM for variables'], ['Dev board note', 'USB chip + LEDs add mA; use a bare module for battery life']],
    schematic: [['pin:GPIO0', 'BTN', 'GND'], ['TXT:RTC timer → wake every 5 s']],
    code: `#define uS_TO_S 1000000ULL
#define SLEEP_SECONDS 5

RTC_DATA_ATTR int bootCount = 0;   // survives deep sleep

void setup() {
  Serial.begin(115200);
  delay(500);
  bootCount++;
  Serial.printf("Boot number: %d\\n", bootCount);

  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  if (cause == ESP_SLEEP_WAKEUP_TIMER) Serial.println("Woken by the timer");
  else if (cause == ESP_SLEEP_WAKEUP_EXT0) Serial.println("Woken by the BOOT button");
  else Serial.println("First power-on");

  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * uS_TO_S);
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0);   // BOOT pulls GPIO0 LOW
  Serial.printf("Sleeping for %d s...\\n", SLEEP_SECONDS);
  Serial.flush();
  esp_deep_sleep_start();
}

void loop() {
  // never runs: after every wake-up the ESP32 starts again at setup()
}
`,
    layout: BOARD_ONLY,
    quiz: [
      { q: 'After waking from deep sleep, where does the program start?', o: ['Where it stopped', 'At setup()', 'At loop()'], a: 1, why: 'Deep sleep is a reset; only RTC memory survives.' },
      { q: 'Which variable keeps its value across deep sleep?', o: ['int count = 0;', 'RTC_DATA_ATTR int count = 0;', 'const int count = 0;'], a: 1, why: 'RTC_DATA_ATTR places it in RTC memory.' },
      { q: 'Roughly how much does the chip draw in deep sleep?', o: ['10 µA', '10 mA', '100 mA'], a: 0, why: 'About 10 µA with the RTC timer and memory on.' },
    ],
  },
  // ---------------------------------------------------------------- 18
  {
    id: 'dualcore', track: 'Wireless & power', title: 'Two cores at once', thumb: 'ledg', badge: 'cores',
    overview: {
      title: 'Two cores at once',
      text: 'The ESP32 has two CPU cores and runs FreeRTOS underneath Arduino. You can start tasks that run independently, even pinned to a specific core. Here each LED blinks from its own task at its own pace, with no delay() juggling.',
      bullets: [['chip', 'Core 0 and core 1 light up in the CPU meter'], ['loop', `${c('xTaskCreatePinnedToCore()')} starts a task`], ['wave', `${c('vTaskDelay()')} pauses only that task`]],
    },
    hotspots: [
      { id: 'led', label: 'Red LED · core 0', desc: 'Toggled every 200 ms by blinkFast.', at: { part: 'led' } },
      { id: 'led2', label: 'Green LED · core 1', desc: 'Toggled every 700 ms by blinkSlow.', at: { part: 'led2' } },
      { id: 'mod', label: 'Dual-core CPU', at: { board: 'module' }, off: [-140, -40] },
    ],
    pinout: [['#e8742c', 'GPIO23', '220 Ω → red LED', 'Task on core 0'], ['#3a9d5d', 'GPIO19', '220 Ω → green LED', 'Task on core 1']],
    steps: [
      'Each task is a function with an endless loop inside.',
      `${c('xTaskCreatePinnedToCore(blinkFast, "fast", 2048, NULL, 1, NULL, 0)')}: function, name, stack bytes, parameter, priority, handle, core.`,
      `${c('vTaskDelay(200 / portTICK_PERIOD_MS)')} sleeps that task and lets others run.`,
      `${c('xPortGetCoreID()')} reports which core is running the code.`,
      `Arduino's own ${c('loop()')} runs as a task on core 1.`,
    ],
    challenge: 'Add a third task that prints a counter every second.',
    specs: [['Cores', '2 × Xtensa LX6'], ['RTOS', 'FreeRTOS (inside the Arduino core)'], ['Core 0', 'Also runs Wi-Fi / BT tasks'], ['Core 1', 'Runs setup() and loop() by default']],
    schematic: [['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND'], ['pin:GPIO19', 'R:220 Ω', 'LED:#35c759', 'GND']],
    code: `const int LED1 = 23;   // red, blinks from core 0
const int LED2 = 19;   // green, blinks from core 1

void blinkFast(void *param) {
  Serial.printf("blinkFast on core %d\\n", xPortGetCoreID());
  for (;;) {
    digitalWrite(LED1, !digitalRead(LED1));
    vTaskDelay(200 / portTICK_PERIOD_MS);
  }
}

void blinkSlow(void *param) {
  Serial.printf("blinkSlow on core %d\\n", xPortGetCoreID());
  for (;;) {
    digitalWrite(LED2, !digitalRead(LED2));
    vTaskDelay(700 / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);
  xTaskCreatePinnedToCore(blinkFast, "fast", 2048, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(blinkSlow, "slow", 2048, NULL, 1, NULL, 1);
}

void loop() {
  Serial.printf("loop() on core %d, uptime %lu ms\\n", xPortGetCoreID(), millis());
  delay(2000);
}
`,
    layout: bench(ledCircuit(23, 3), ledCircuit(19, 9, '#35c759', 'led2', 'r2'), gndRail()),
    quiz: [
      { q: 'What does vTaskDelay() pause?', o: ['The whole chip', 'Only the calling task', 'Wi-Fi'], a: 1, why: 'Other tasks keep running.' },
      { q: 'On which core does loop() run by default?', o: ['Core 0', 'Core 1'], a: 1, why: 'Core 0 is busy with the radio stacks.' },
      { q: 'What is the last argument of xTaskCreatePinnedToCore?', o: ['Priority', 'Stack size', 'Core number'], a: 2, why: '0 or 1 picks the core.' },
    ],
  },
  // ---------------------------------------------------------------- 19
  {
    id: 'station', track: 'Project', title: 'Build a weather station', thumb: 'dht', badge: 'star',
    overview: {
      title: 'Build a weather station',
      text: 'Put it together: the DHT22 measures the room, the OLED shows it, and a red LED warns when it gets too hot. Change the temperature slider past 30 °C and watch everything react.',
      bullets: [['temp', 'DHT22 on GPIO4'], ['screen', 'OLED on I²C (21 / 22)'], ['led', 'Alert LED on GPIO23 above 30 °C']],
    },
    hotspots: [
      { id: 'dht', label: 'DHT22', at: { part: 'dht' } },
      { id: 'oled', label: 'OLED display', at: { part: 'oled' } },
      { id: 'led', label: 'Heat alert', at: { part: 'led' } },
    ],
    pinout: [['#e9b627', 'GPIO4', 'DHT22 DATA', 'Temperature + humidity'], ['#3a7bd5', 'GPIO21', 'OLED SDA', 'I²C data'], ['#e9b627', 'GPIO22', 'OLED SCL', 'I²C clock'], ['#e8742c', 'GPIO23', '220 Ω → LED', 'Heat alert'], ['#d63c2f', '3V3', 'Rail (+)', 'Sensor and OLED power']],
    steps: [
      'Every 2 s the loop reads temperature and humidity.',
      `${c('hot')} is true above ${c('HOT')} (30 °C) and drives the alert LED.`,
      'The OLED is redrawn from scratch each time: title, big numbers, and a warning.',
      'Serial gets a compact log line for debugging.',
    ],
    challenge: 'Serve the readings on a web page using the web-server lesson.',
    specs: [['Sensors', 'DHT22'], ['Display', 'SSD1306 128 × 64'], ['Alert', 'Red LED above 30 °C'], ['Update rate', 'Every 2 s']],
    schematic: [['pin:GPIO4', 'BOX:DHT22'], ['pin:GPIO21', 'BOX:SDA  OLED'], ['pin:GPIO23', 'R:220 Ω', 'LED:#ff3b30', 'GND']],
    code: `#include <DHT.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>

DHT dht(4, DHT22);
Adafruit_SSD1306 display(128, 64, &Wire, -1);
const int ALERT_LED = 23;
const float HOT = 30.0;   // °C

void setup() {
  Serial.begin(115200);
  pinMode(ALERT_LED, OUTPUT);
  dht.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  bool hot = t > HOT;
  digitalWrite(ALERT_LED, hot ? HIGH : LOW);

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("WEATHER STATION");
  display.setTextSize(2);
  display.setCursor(0, 18);
  display.printf("%.1f C", t);
  display.setCursor(0, 42);
  display.printf("%.0f %%", h);
  if (hot) {
    display.setTextSize(1);
    display.setCursor(90, 46);
    display.print("HOT!");
  }
  display.display();

  Serial.printf("T=%.1f C  H=%.0f %%  %s\\n", t, h, hot ? "ALERT" : "ok");
  delay(2000);
}
`,
    layout: bench(ledCircuit(23, 3), { type: 'dht', id: 'dht', col: 13, row: 'c', pin: 4 }, { type: 'oled', id: 'oled', pos: [3.4, -8.6], rot: -0.45 },
      { from: 'p:4', to: [14, 'a'], color: W.yel }, { from: [13, 'a'], to: [13, 'L+'], color: W.pwr }, { from: [16, 'a'], to: [16, 'L-'], color: W.gnd },
      { from: { part: 'oled', pin: 'SDA' }, to: 'p:21', color: W.blu }, { from: { part: 'oled', pin: 'SCL' }, to: 'p:22', color: W.yel },
      { from: { part: 'oled', pin: 'VCC' }, to: [1, 'L+'], color: W.pwr }, { from: { part: 'oled', pin: 'GND' }, to: [1, 'L-'], color: W.gnd }, v33Rail(), gndRail('23')),
    view: { target: [0.6, 2.6, -1.8], zoom: 0.84 },
    quiz: [
      { q: 'Why redraw the whole OLED each loop?', o: ['clearDisplay() + redraw avoids leftover pixels', 'The OLED forgets every 2 s', 'It is required by the DHT'], a: 0, why: 'Old digits would otherwise overlap new ones.' },
      { q: 'Which pins does the OLED use?', o: ['21 and 22', '4 and 23', '34 and 35'], a: 0, why: 'The default I²C pins.' },
      { q: 'What should happen at 31 °C?', o: ['The alert LED turns on', 'The ESP32 sleeps', 'Nothing'], a: 0, why: 'hot = t > 30.0.' },
    ],
  },
];

// --- full header reference (DevKitC V4) ---
export const PINS = [
  ['L', 0, '3V3', null, ['power'], '3.3 V output from the on-board regulator. Powers sensors.'],
  ['L', 1, 'EN', null, ['ctrl'], 'Chip enable / reset. The EN button pulls it LOW to restart.'],
  ['L', 2, 'VP', 36, ['in', 'adc1'], 'Input only. ADC1_CH0. No internal pull-ups.'],
  ['L', 3, 'VN', 39, ['in', 'adc1'], 'Input only. ADC1_CH3. No internal pull-ups.'],
  ['L', 4, '34', 34, ['in', 'adc1'], 'Input only. ADC1_CH6. No internal pull-ups.'],
  ['L', 5, '35', 35, ['in', 'adc1'], 'Input only. ADC1_CH7. No internal pull-ups.'],
  ['L', 6, '32', 32, ['io', 'adc1', 'touch', 'pwm'], 'ADC1_CH4, Touch T9. Also a 32 kHz crystal pin.'],
  ['L', 7, '33', 33, ['io', 'adc1', 'touch', 'pwm'], 'ADC1_CH5, Touch T8.'],
  ['L', 8, '25', 25, ['io', 'adc2', 'dac', 'pwm'], 'DAC1 (8-bit analog out), ADC2_CH8.'],
  ['L', 9, '26', 26, ['io', 'adc2', 'dac', 'pwm'], 'DAC2, ADC2_CH9.'],
  ['L', 10, '27', 27, ['io', 'adc2', 'touch', 'pwm'], 'ADC2_CH7, Touch T7.'],
  ['L', 11, '14', 14, ['io', 'adc2', 'touch', 'pwm'], 'ADC2_CH6, Touch T6, HSPI CLK. Outputs PWM briefly at boot.'],
  ['L', 12, '12', 12, ['io', 'adc2', 'touch', 'pwm', 'strap'], 'Strapping pin (flash voltage): must be LOW at boot. ADC2_CH5, Touch T5.'],
  ['L', 13, 'GND', null, ['gnd'], 'Ground.'],
  ['L', 14, '13', 13, ['io', 'adc2', 'touch', 'pwm'], 'ADC2_CH4, Touch T4, HSPI MOSI.'],
  ['L', 15, 'D2', 9, ['flash'], 'GPIO9 (SD2), wired to the SPI flash. Do not use.'],
  ['L', 16, 'D3', 10, ['flash'], 'GPIO10 (SD3), wired to the SPI flash. Do not use.'],
  ['L', 17, 'CMD', 11, ['flash'], 'GPIO11, wired to the SPI flash. Do not use.'],
  ['L', 18, '5V', null, ['power'], '5 V from USB, or a 5 V input. Feed servos and 5 V modules from here.'],
  ['R', 0, 'GND', null, ['gnd'], 'Ground.'],
  ['R', 1, '23', 23, ['io', 'pwm', 'spi'], 'VSPI MOSI. A good general-purpose output.'],
  ['R', 2, '22', 22, ['io', 'pwm', 'i2c'], 'Default I²C SCL.'],
  ['R', 3, 'TX', 1, ['uart'], 'UART0 TX to the USB chip (Serial). Avoid for other uses.'],
  ['R', 4, 'RX', 3, ['uart'], 'UART0 RX from the USB chip (Serial). Avoid for other uses.'],
  ['R', 5, '21', 21, ['io', 'pwm', 'i2c'], 'Default I²C SDA.'],
  ['R', 6, 'GND', null, ['gnd'], 'Ground.'],
  ['R', 7, '19', 19, ['io', 'pwm', 'spi'], 'VSPI MISO.'],
  ['R', 8, '18', 18, ['io', 'pwm', 'spi'], 'VSPI SCK.'],
  ['R', 9, '5', 5, ['io', 'pwm', 'spi', 'strap'], 'VSPI SS. Strapping pin; outputs PWM briefly at boot.'],
  ['R', 10, '17', 17, ['io', 'pwm', 'uart'], 'UART2 TX. Used for PSRAM on WROVER modules.'],
  ['R', 11, '16', 16, ['io', 'pwm', 'uart'], 'UART2 RX. Used for PSRAM on WROVER modules.'],
  ['R', 12, '4', 4, ['io', 'adc2', 'touch', 'pwm'], 'ADC2_CH0, Touch T0.'],
  ['R', 13, '0', 0, ['io', 'adc2', 'touch', 'strap'], 'BOOT button. Strapping pin: LOW at reset enters download mode.'],
  ['R', 14, '2', 2, ['io', 'adc2', 'touch', 'pwm', 'strap'], 'Strapping pin; must be LOW or floating to flash. ADC2_CH2, Touch T2.'],
  ['R', 15, '15', 15, ['io', 'adc2', 'touch', 'pwm', 'strap'], 'Strapping pin (LOW silences the boot log). ADC2_CH3, Touch T3.'],
  ['R', 16, 'D1', 8, ['flash'], 'GPIO8 (SD1), SPI flash. Do not use.'],
  ['R', 17, 'D0', 7, ['flash'], 'GPIO7 (SD0), SPI flash. Do not use.'],
  ['R', 18, 'CLK', 6, ['flash'], 'GPIO6, SPI flash clock. Do not use.'],
];
export const TAGS = {
  io: ['Digital I/O', '#2f8f83'], in: ['Input only', '#8a6d3b'], adc1: ['ADC1', '#3a7bd5'], adc2: ['ADC2', '#6b8fd6'], touch: ['Touch', '#b7791f'], dac: ['DAC', '#8a5cc7'],
  pwm: ['PWM', '#e8742c'], i2c: ['I²C', '#1f8a5a'], spi: ['SPI', '#5c6b7a'], uart: ['UART', '#7a4a1e'], strap: ['Strapping', '#c2410c'], flash: ['Flash: avoid', '#b42318'],
  power: ['Power', '#d63c2f'], gnd: ['Ground', '#2b2b2b'], ctrl: ['Control', '#555'],
};
export function pinKey(p) { return p[2] === 'GND' ? (p[0] === 'L' ? 'GNDL' : p[1] === 0 ? 'GND' : 'GND2') : p[3] !== null ? String(p[3]) : p[2]; }

// --- component library ---
export const COMPONENTS = [
  { id: 'board', name: 'ESP32 DevKitC V4', thumb: 'board', types: [], what: 'Espressif\'s reference development board for the ESP32-WROOM-32 module: USB, a 3.3 V regulator, BOOT/EN buttons and 38 header pins.', specs: [['Size', '≈ 54 × 28 mm'], ['Power', '5 V USB'], ['Logic', '3.3 V'], ['USB-UART', 'Up to 3 Mbps']] },
  { id: 'led', name: 'LED', thumb: 'led', types: ['led'], what: 'A diode that emits light when current flows from the long leg (anode) to the short leg (cathode). Always add a series resistor.', specs: [['Vf red', '≈ 2.0 V'], ['Vf blue/white', '≈ 3.0 V'], ['Current', '5–20 mA']] },
  { id: 'res', name: 'Resistor', thumb: 'res', types: ['res'], what: 'Limits current or divides voltage. Read the coloured bands: two digits, a multiplier, then tolerance.', specs: [['220 Ω', 'red-red-brown'], ['10 kΩ', 'brown-black-orange'], ['Power', '¼ W typical']] },
  { id: 'button', name: 'Pushbutton', thumb: 'button', types: ['button'], what: 'A momentary switch. Pressing it connects its two sides. Pair it with a pull-up or pull-down so the input never floats.', specs: [['Type', '6 mm tactile'], ['Legs', '4 (two pairs)'], ['Bounce', '~5 ms']] },
  { id: 'pot', name: 'Potentiometer', thumb: 'pot', types: ['pot'], what: 'A resistor with a sliding middle contact (wiper). Across a supply it gives any voltage in between.', specs: [['Value', '10 kΩ'], ['Taper', 'Linear'], ['Pins', '3']] },
  { id: 'rgb', name: 'RGB LED', thumb: 'rgb', types: ['rgb'], what: 'Red, green and blue LEDs in one package sharing a common cathode (or anode). Mix colours with PWM.', specs: [['Legs', '4'], ['Common', 'Cathode'], ['Resistors', 'One per colour']] },
  { id: 'touch', name: 'Touch pad', thumb: 'touch', types: ['touch'], what: 'Any conductive surface wired to an ESP32 touch pin becomes a capacitive button.', specs: [['Pins', 'T0–T9'], ['Parts', 'None needed'], ['Wake', 'Can wake from deep sleep']] },
  { id: 'ldr', name: 'Light sensor (LDR)', thumb: 'ldr', types: ['ldr'], what: 'A photoresistor whose resistance drops in bright light. Use it in a voltage divider with a fixed resistor.', specs: [['Bright', '≈ 1 kΩ'], ['Dark', '50 kΩ +'], ['Divider', '10 kΩ']] },
  { id: 'buzzer', name: 'Piezo buzzer', thumb: 'buzzer', types: ['buzzer'], what: 'A passive buzzer plays whatever frequency you feed it with tone(). Active buzzers have their own oscillator.', specs: [['Range', '≈ 0.1–10 kHz'], ['Drive', 'Direct from a GPIO']] },
  { id: 'dht', name: 'DHT22 sensor', thumb: 'dht', types: ['dht'], what: 'A digital temperature and humidity sensor on a single data wire.', specs: [['Temp', '−40–80 °C ±0.5'], ['Humidity', '0–100 % ±2–5'], ['Rate', '0.5 Hz']] },
  { id: 'sonar', name: 'Ultrasonic sensor', thumb: 'sonar', types: ['sonar'], what: 'Measures distance by timing a 40 kHz echo. The HC-SR04P variant runs on 3.3 V.', specs: [['Range', '2–400 cm'], ['Pins', 'VCC, TRIG, ECHO, GND']] },
  { id: 'servo', name: 'Micro servo SG90', thumb: 'servo', types: ['servo'], what: 'A small geared motor that holds the angle set by a 50 Hz pulse.', specs: [['Angle', '0–180°'], ['Supply', '4.8–6 V'], ['Wires', 'Brown, red, orange']] },
  { id: 'oled', name: 'OLED 128 × 64', thumb: 'oled', types: ['oled'], what: 'A 0.96" SSD1306 display. Each pixel lights itself, so no backlight is needed. Talks I²C.', specs: [['Bus', 'I²C 0x3C'], ['Pixels', '128 × 64'], ['Supply', '3.3–5 V']] },
];
