# PulseGuard — Autodesk Tinkercad Circuits Simulation

This document provides complete instructions to build, simulate, and connect the virtual industrial IoT microcontroller node using **Autodesk Tinkercad Circuits** without physical hardware.

---

## 1. Virtual Circuit Specifications

| Component | Tinkercad Model | Arduino Uno Pin | Purpose |
|---|---|---|---|
| **Microcontroller** | Arduino Uno R3 | - | Embedded controller & telemetry generator |
| **Temperature Sensor** | TMP36 Precision Sensor | Analog Pin `A0` | Simulates machine motor bearing thermal readings |
| **Vibration Proxy** | 10kΩ Potentiometer | Analog Pin `A1` | Simulates mechanical vibration intensity (0–100%) |
| **Pulse Tachometer** | Pushbutton / IR Sensor | Digital Pin `D2` | Simulates machine shaft rotation interrupts (RPM) |
| **Green LED** | Standard 5mm LED | Digital Pin `D8` | Normal operating status indicator |
| **Yellow LED** | Standard 5mm LED | Digital Pin `D9` | Warning condition indicator |
| **Red LED** | Standard 5mm LED | Digital Pin `D10` | Critical threshold alarm indicator |
| **Piezo Buzzer** | Standard Piezo Buzzer | Digital Pin `D11` | Audible warning alarm for critical events |
| **Current Limiting Resistors**| 330Ω Resistors (x3) | In series with LEDs | Overcurrent protection |

---

## 2. ASCII Circuit Schematic

```text
       +5V ------------+------------------+
                       |                  |
                    (TMP36)          (Potentiometer)
                    +--+--+             +--+--+
                    |  |  |             |  |  |
             Vout --+  |  |      Wiper -+  |  |
            (A0)       |  |      (A1)      |  |
                      GND +5V             GND +5V

       Arduino Uno R3:
       [ A0 ] <--- TMP36 Vout
       [ A1 ] <--- Potentiometer Wiper (Vibration proxy)
       [ D2 ] <--- Tachometer pulse (Pull-up interrupt)
       [ D8 ] ---> [330R] ---> [Green LED] ---> GND  (Normal)
       [ D9 ] ---> [330R] ---> [Yellow LED] ---> GND (Warning)
       [ D10] ---> [330R] ---> [Red LED] ----> GND  (Critical)
       [ D11] ---> [+] [Piezo Buzzer] [-] ---> GND  (Audible Alarm)
```

---

## 3. How to Run in Autodesk Tinkercad Circuits

1. Navigate to [Autodesk Tinkercad](https://www.tinkercad.com/) and create a new **Circuit**.
2. Add an **Arduino Uno R3**, **TMP36**, **Potentiometer**, **3 LEDs (Green, Yellow, Red)**, **3 330Ω resistors**, and a **Piezo Buzzer**.
3. Wire the circuit according to the pin table above.
4. Click on the **Code** tab, switch the dropdown from *Blocks* to **Text**, and paste the contents of `iot/tinkercad/arduino_firmware.ino`.
5. Open the **Serial Monitor** at the bottom right (ensure baud rate is 9600).
6. Click **Start Simulation**.
7. Observe JSON telemetry lines emitted every 2 seconds:
   ```json
   {"machine_identifier":"FAN-BAY-01","rpm":2415.2,"temperature":42.5,"vibration_indicator":23.4,"operating_status":"normal","source":"tinkercad_bridge"}
   ```
8. Adjust the Potentiometer (vibration) or slide the TMP36 slider (temperature) to watch the LEDs transition to Warning and Critical, while the JSON status changes!

---

## 4. Virtual Sensor Bridge Integration

Because web browsers run Tinkercad within a sandboxed WebAssembly / canvas iframe without direct local TCP sockets, PulseGuard includes `iot/bridge/virtual_sensor_bridge.py`:
- Parses serial data if running from a connected virtual COM port, OR
- Seamlessly emulates the exact Tinkercad Uno JSON telemetry stream.
- Streams telemetry records to the FastAPI backend at `POST /api/v1/telemetry/ingest`.
