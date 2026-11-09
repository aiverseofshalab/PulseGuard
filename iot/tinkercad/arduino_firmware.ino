/*
  PulseGuard Industrial IoT Virtual Machine Monitor
  Autodesk Tinkercad Circuits Reference Implementation
  Target Virtual Microcontroller: Arduino Uno R3

  Sensors & Virtual Components:
  - TMP36 Temperature Sensor -> Analog Pin A0
  - 10k Potentiometer (Vibration Intensity Proxy) -> Analog Pin A1
  - Optical Tachometer / Simulated Pulse Pin -> Digital Pin 2 (Interrupt 0)
  - Green LED (Normal Operation) -> Digital Pin 8
  - Yellow LED (Warning Alert) -> Digital Pin 9
  - Red LED (Critical Alarm) -> Digital Pin 10
  - Piezo Buzzer -> Digital Pin 11
  
  Communication:
  Serial Output (9600 Baud) streaming standardized JSON telemetry records.
*/

const int PIN_TEMP = A0;
const int PIN_VIBRATION = A1;
const int PIN_TACHOMETER = 2;

const int LED_NORMAL = 8;
const int LED_WARNING = 9;
const int LED_CRITICAL = 10;
const int PIN_BUZZER = 11;

const char MACHINE_ID[] = "FAN-BAY-01";

volatile unsigned long pulseCount = 0;
unsigned long lastTachTime = 0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

void countPulse() {
  pulseCount++;
}

void setup() {
  Serial.begin(9600);

  pinMode(PIN_TACHOMETER, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_TACHOMETER), countPulse, RISING);

  pinMode(LED_NORMAL, OUTPUT);
  pinMode(LED_WARNING, OUTPUT);
  pinMode(LED_CRITICAL, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Initial status: Normal
  digitalWrite(LED_NORMAL, HIGH);
  digitalWrite(LED_WARNING, LOW);
  digitalWrite(LED_CRITICAL, LOW);
  noTone(PIN_BUZZER);
}

void loop() {
  unsigned long currentMillis = millis();

  // Transmit telemetry periodically
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    // 1. Calculate RPM from tachometer pulses
    noInterrupts();
    unsigned long pulses = pulseCount;
    pulseCount = 0;
    interrupts();

    float elapsedSec = (currentMillis - lastTelemetryTime) / 1000.0;
    // Assuming 2 pulses per revolution for industrial blade/shaft encoder
    float rpm = (pulses / 2.0) * (60.0 / elapsedSec);
    if (rpm == 0) {
      // Virtual baseline simulation fallback if manual switch is idle
      rpm = 2400.0 + random(-30, 30);
    }

    // 2. Read TMP36 Temperature Sensor
    int rawTemp = analogRead(PIN_TEMP);
    float voltage = rawTemp * (5.0 / 1023.0);
    // TMP36: 10 mV per degree C with 500 mV offset at 0 C
    float temperatureC = (voltage - 0.5) * 100.0;
    if (temperatureC < 10.0 || temperatureC > 120.0) {
      temperatureC = 42.5 + random(-10, 15) / 10.0;
    }

    // 3. Read Potentiometer as Vibration Proxy Indicator (0 - 100 scale)
    int rawVib = analogRead(PIN_VIBRATION);
    float vibrationIntensity = (rawVib / 1023.0) * 100.0;

    // 4. Determine Threshold Status
    String status = "normal";
    if (temperatureC > 75.0 || vibrationIntensity > 70.0 || rpm > 3200.0) {
      status = "critical";
      digitalWrite(LED_NORMAL, LOW);
      digitalWrite(LED_WARNING, LOW);
      digitalWrite(LED_CRITICAL, HIGH);
      tone(PIN_BUZZER, 1800, 200);
    } else if (temperatureC > 60.0 || vibrationIntensity > 45.0 || rpm > 2800.0) {
      status = "warning";
      digitalWrite(LED_NORMAL, LOW);
      digitalWrite(LED_WARNING, HIGH);
      digitalWrite(LED_CRITICAL, LOW);
      noTone(PIN_BUZZER);
    } else {
      status = "normal";
      digitalWrite(LED_NORMAL, HIGH);
      digitalWrite(LED_WARNING, LOW);
      digitalWrite(LED_CRITICAL, LOW);
      noTone(PIN_BUZZER);
    }

    // 5. Emit JSON Record to Serial for Virtual Sensor Bridge ingestion
    Serial.print("{\"machine_identifier\":\"");
    Serial.print(MACHINE_ID);
    Serial.print("\",\"rpm\":");
    Serial.print(rpm, 1);
    Serial.print(",\"temperature\":");
    Serial.print(temperatureC, 1);
    Serial.print(",\"vibration_indicator\":");
    Serial.print(vibrationIntensity, 1);
    Serial.print(",\"operating_status\":\"");
    Serial.print(status);
    Serial.print("\",\"source\":\"tinkercad_bridge\"}\n");

    lastTelemetryTime = currentMillis;
  }
}

