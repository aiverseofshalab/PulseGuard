"""
PulseGuard — Virtual Sensor Bridge & IoT Telemetry Daemon.
Emulates the exact Tinkercad Arduino Uno hardware sensor stream and transmits
authenticated telemetry records to the FastAPI backend via REST ingestion.
"""

import sys
import time
import random
import argparse
import requests
from typing import Dict, Any

DEFAULT_BACKEND_URL = "http://localhost:8000/api/v1/telemetry/ingest"
DEFAULT_API_KEY = "pulseguard-iot-device-secret-key-demo-2026"

SCENARIOS = {
    "normal": {
        "rpm_base": 2400.0,
        "rpm_jitter": 35.0,
        "temp_base": 42.0,
        "temp_jitter": 1.5,
        "vib_base": 18.0,
        "vib_jitter": 3.0,
        "status": "normal",
    },
    "warning": {
        "rpm_base": 2850.0,
        "rpm_jitter": 60.0,
        "temp_base": 64.0,
        "temp_jitter": 2.5,
        "vib_base": 48.0,
        "vib_jitter": 5.0,
        "status": "warning",
    },
    "overheat": {
        "rpm_base": 2550.0,
        "rpm_jitter": 40.0,
        "temp_base": 88.5,
        "temp_jitter": 3.0,
        "vib_base": 32.0,
        "vib_jitter": 4.0,
        "status": "critical",
    },
    "high_vibration": {
        "rpm_base": 2980.0,
        "rpm_jitter": 90.0,
        "temp_base": 58.0,
        "temp_jitter": 2.0,
        "vib_base": 84.0,
        "vib_jitter": 6.0,
        "status": "critical",
    },
    "speed_surge": {
        "rpm_base": 3850.0,
        "rpm_jitter": 120.0,
        "temp_base": 76.0,
        "temp_jitter": 3.0,
        "vib_base": 78.0,
        "vib_jitter": 8.0,
        "status": "critical",
    },
    "combined_abnormal": {
        "rpm_base": 3400.0,
        "rpm_jitter": 150.0,
        "temp_base": 91.0,
        "temp_jitter": 4.0,
        "vib_base": 88.0,
        "vib_jitter": 6.0,
        "status": "critical",
    },
    "stopped": {
        "rpm_base": 0.0,
        "rpm_jitter": 0.0,
        "temp_base": 24.0,
        "temp_jitter": 0.5,
        "vib_base": 1.0,
        "vib_jitter": 0.5,
        "status": "stopped",
    },
}

def generate_telemetry_reading(machine_id: str, scenario: str = "normal") -> Dict[str, Any]:
    cfg = SCENARIOS.get(scenario, SCENARIOS["normal"])
    rpm = max(0.0, cfg["rpm_base"] + random.uniform(-cfg["rpm_jitter"], cfg["rpm_jitter"]))
    temperature = max(10.0, cfg["temp_base"] + random.uniform(-cfg["temp_jitter"], cfg["temp_jitter"]))
    vibration = max(0.0, min(100.0, cfg["vib_base"] + random.uniform(-cfg["vib_jitter"], cfg["vib_jitter"])))

    return {
        "machine_identifier": machine_id,
        "rpm": round(rpm, 1),
        "temperature": round(temperature, 1),
        "vibration_indicator": round(vibration, 1),
        "operating_status": cfg["status"],
        "source": "tinkercad_bridge",
    }

def run_bridge(
    machine_id: str = "FAN-BAY-01",
    scenario: str = "normal",
    interval: float = 2.0,
    iterations: int = 0,
    api_url: str = DEFAULT_BACKEND_URL,
    api_key: str = DEFAULT_API_KEY,
):
    print(f"[Virtual Sensor Bridge] Started for machine '{machine_id}' in scenario '{scenario}'.")
    print(f"[Virtual Sensor Bridge] Target API: {api_url} (Interval: {interval}s)")

    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": api_key,
    }

    count = 0
    try:
        while True:
            count += 1
            payload = generate_telemetry_reading(machine_id, scenario)
            try:
                res = requests.post(api_url, json=payload, headers=headers, timeout=3.0)
                if res.status_code == 200 or res.status_code == 201:
                    print(f"[{count}] Emitted -> RPM: {payload['rpm']} | Temp: {payload['temperature']}°C | Vib: {payload['vibration_indicator']}% | Status: {payload['operating_status']}")
                else:
                    print(f"[{count}] Ingestion error: HTTP {res.status_code} - {res.text}")
            except requests.exceptions.RequestException as e:
                print(f"[{count}] Network/Backend unreachable: {e}")

            if iterations > 0 and count >= iterations:
                break
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[Virtual Sensor Bridge] Daemon stopped by operator.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PulseGuard Virtual IoT Sensor Bridge")
    parser.add_argument("--machine", default="FAN-BAY-01", help="Target Machine Identifier")
    parser.add_argument("--scenario", default="normal", choices=list(SCENARIOS.keys()), help="Operating scenario")
    parser.add_argument("--interval", type=float, default=2.0, help="Transmission interval in seconds")
    parser.add_argument("--iterations", type=int, default=0, help="Number of ticks (0 for continuous)")
    parser.add_argument("--api-url", default=DEFAULT_BACKEND_URL, help="Backend ingestion endpoint")
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="IoT device authentication key")
    args = parser.parse_args()

    run_bridge(
        machine_id=args.machine,
        scenario=args.scenario,
        interval=args.interval,
        iterations=args.iterations,
        api_url=args.api_url,
        api_key=args.api_key,
    )

