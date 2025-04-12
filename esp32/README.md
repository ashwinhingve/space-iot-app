# ESP32 Integration for IoT Space

This directory contains Arduino code for integrating ESP32 devices with the IoT Space platform.

## Hardware Requirements

- ESP32 development board (ESP32 DevKit, NodeMCU-ESP32, etc.)
- DHT22 or DHT11 temperature and humidity sensor
- Breadboard and jumper wires
- USB cable for programming

## Wiring

1. Connect the DHT sensor:
   - VCC pin to 3.3V on ESP32
   - GND pin to GND on ESP32
   - Data pin to GPIO4 on ESP32 (can be changed in code)

2. The built-in LED on GPIO2 is used to demonstrate control commands.

## Software Requirements

1. [Arduino IDE](https://www.arduino.cc/en/software)
2. Required Libraries:
   - [WiFi library](https://github.com/arduino-libraries/WiFi) (included with ESP32 board manager)
   - [PubSubClient](https://github.com/knolleary/pubsubclient) - MQTT client
   - [ArduinoJson](https://arduinojson.org/) - for JSON parsing
   - [DHT Sensor Library](https://github.com/adafruit/DHT-sensor-library) - for the temperature sensor

## Setup Instructions

### 1. Install the ESP32 board in Arduino IDE

1. Open Arduino IDE
2. Go to File > Preferences
3. Add the following URL to the "Additional Boards Manager URLs" field:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to Tools > Board > Boards Manager
5. Search for "ESP32" and install the ESP32 board package

### 2. Install Required Libraries

1. Go to Sketch > Include Library > Manage Libraries
2. Search for and install:
   - PubSubClient
   - ArduinoJson
   - DHT sensor library
   - Adafruit Unified Sensor

### 3. Configure the Code

1. Open the `device.ino` file
2. Update the Wi-Fi credentials:
   ```c
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Update the MQTT broker settings:
   ```c
   // Get your IP address by running 'ipconfig' in Command Prompt
   const char* mqtt_server = "192.168.195.89"
   const int mqtt_port = 1883;
   ```
   (Note: This should be the IP address of the computer running your MQTT broker, not "localhost")
4. Give your device a unique ID:
   ```c
   String deviceId = "esp32-01";
   ```

### 4. Upload the Code

1. Connect your ESP32 to your computer via USB
2. Select the correct board and port in the Arduino IDE (Tools > Board and Tools > Port)
3. Click the Upload button

### 5. Create Device in IoT Space Platform

1. Log in to your IoT Space web application
2. Navigate to the Devices section
3. Create a new device with the same ID you specified in the ESP32 code
4. Set the MQTT topic to match the one in the code: `devices/{deviceId}/data`

## How It Works

1. The ESP32 connects to your Wi-Fi network
2. It establishes a connection to the MQTT broker running on your computer
3. Every 5 seconds, it reads data from the DHT sensor and publishes it to `devices/{deviceId}/data`
4. It subscribes to control commands on `devices/{deviceId}/control`
5. When it receives a command, it performs the corresponding action (e.g., turning the LED on/off)

## Troubleshooting

1. **ESP32 won't connect to Wi-Fi**
   - Check your Wi-Fi credentials
   - Ensure your network is 2.4GHz (ESP32 may not connect to 5GHz networks)

2. **ESP32 won't connect to MQTT broker**
   - Verify the MQTT broker is running (`mosquitto -v` to start with verbose output)
   - Check the IP address is correct
   - Ensure port 1883 is not blocked by firewall

3. **No data is being published**
   - Check Serial Monitor for debugging output (use baud rate 115200)
   - Verify DHT sensor is properly connected
   - Check MQTT topics match between ESP32 and backend

## Next Steps

- Add more sensors (soil moisture, light, motion, etc.)
- Implement additional actuators (relays, motors, etc.)
- Create custom PCB for a more permanent installation
- Add battery power and solar charging for remote deployment 