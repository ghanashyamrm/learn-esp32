# Learn ESP32

Interactive 3D lessons for the ESP32 DevKitC V4. Wire circuits on a virtual breadboard, edit real Arduino code, and run it in a browser-based simulator.

## What's inside

- **19 lessons in 4 tracks**: Basics, Sensors & outputs, Wireless & power, and a weather-station project
- **3D workbench** (three.js): the ESP32 board, breadboard, LEDs, buttons, potentiometer, RGB LED, touch pad, LDR, buzzer, DHT22, ultrasonic sensor, servo and OLED
- **Sketch simulator**: transpiles a subset of Arduino C++ to JavaScript and runs it against a simulated ESP32 with GPIO, PWM (LEDC), ADC, touch, DAC, Serial, Wi-Fi, WebServer, Bluetooth Serial, deep sleep with `RTC_DATA_ATTR`, FreeRTOS tasks on two cores, DHT, ESP32Servo and SSD1306
- **Simulated phone** for the web-server and Bluetooth lessons
- Serial monitor with input, baud-rate mismatch detection and pin-activity log
- Pin reference for all 38 header pins, components library, quizzes, schematics, current-flow animation
- Day and night themes, mobile layout, progress saved in the browser

The simulator is for learning: it is not cycle-accurate and supports common Arduino patterns, not all of C++.

## Run locally

The page uses ES modules, so serve it over HTTP instead of opening the file directly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy on Vercel

1. Sign in at https://vercel.com with your GitHub account.
2. **Add New → Project**, pick this repository, then **Deploy**. No build settings are needed: it is a static site.

Every push to `main` redeploys automatically.

## Project layout

```
index.html        page markup and styles
js/main.js        UI: lessons, tabs, editor, serial monitor, phone, overlays
js/scene.js       3D stage: board, breadboard, components, wires, hotspots, camera
js/sim.js         Arduino-to-JS transpiler and simulated ESP32 hardware
js/lessons.js     lesson content, circuits, pin reference, components
js/schematic.js   schematic drawings
js/model.js       ESP32 DevKitC V4 3D model (glTF binary, base64)
```

## Credits

- Design inspired by [Learn Arduino](https://learn-arduino-red.vercel.app/)
- ESP32 3D model generated with Gemini; pin labels corrected at runtime to match the real board
- Built with [three.js](https://threejs.org/)
