# ESP32 Device Code

Arduino sketches for IoT Space ESP32 devices.

## Files

| File | Description |
|------|-------------|
| `device.ino` | Standard device with hardcoded WiFi |
| `dynamic_wifi_device.ino` | Device with web-configurable WiFi |
| `manifold_controller.ino` | Valve manifold controller |

## Requirements

- ESP32 board (ESP32-WROOM-32 or similar)
- Arduino IDE with ESP32 board support
- Libraries: PubSubClient, ArduinoJson, DHT sensor library

## Hardware

```
DHT22 Pin 1 (VCC)  -> ESP32 3.3V
DHT22 Pin 2 (DATA) -> ESP32 GPIO 4 (with 10k pull-up)
DHT22 Pin 4 (GND)  -> ESP32 GND
```

## Configuration

Edit the sketch and update:

```cpp
const char* WIFI_SSID = "your-wifi-ssid";
const char* WIFI_PASSWORD = "your-wifi-password";
const char* MQTT_SERVER = "your-server-ip";
const char* DEVICE_ID = "esp32-01";
```

## Upload

1. Select board: Tools > Board > ESP32 Dev Module
2. Select port: Tools > Port > (your COM port)
3. Click Upload
4. Open Serial Monitor (115200 baud) to verify
