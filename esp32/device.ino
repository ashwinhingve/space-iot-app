/*
 * IoT Space - ESP32 Device Client (Standard Version)
 * This sketch connects an ESP32 to your IoT Space platform
 * It publishes sensor data and subscribes to control commands
 *
 * FEATURES:
 * - MQTT communication for real-time data
 * - DHT22 temperature/humidity sensor support
 * - LED control via MQTT
 * - Automatic reconnection handling
 * - Last Will Testament for offline detection
 *
 * WIRING:
 * - DHT22 sensor data pin -> GPIO 4
 * - Built-in LED -> GPIO 2
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ===== CONFIGURATION - UPDATE THESE VALUES =====
// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings (your backend server)
const char* MQTT_SERVER = "192.168.1.100";  // Your computer's IP address
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";  // Leave empty if no auth
const char* MQTT_PASSWORD = "";  // Leave empty if no auth

// Device configuration
const char* DEVICE_ID = "esp32-01";  // Unique device identifier

// Sensor pins
#define DHTPIN 4       // DHT sensor data pin
#define DHTTYPE DHT22  // DHT22 (or use DHT11)
#define LED_PIN 2      // Built-in LED pin
// ================================================

// MQTT Topics (auto-generated from DEVICE_ID)
String dataTopic = "devices/" + String(DEVICE_ID) + "/data";
String controlTopic = "devices/" + String(DEVICE_ID) + "/control";
String statusTopic = "devices/" + String(DEVICE_ID) + "/online";

// Clients
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHTPIN, DHTTYPE);

// Timing variables
unsigned long lastMqttMsg = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWiFiCheck = 0;
const long MQTT_INTERVAL = 5000;        // Publish sensor data every 5 seconds
const long HEARTBEAT_INTERVAL = 15000;  // Send heartbeat every 15 seconds
const long WIFI_CHECK_INTERVAL = 30000; // Check WiFi every 30 seconds

// Sensor data
float temperature = 0.0;
float humidity = 0.0;
int ledState = LOW;

// Connection retry settings
const int MAX_WIFI_RETRIES = 20;
const int MAX_MQTT_RETRIES = 3;

// ========== SETUP ==========
void setup() {
  // Initialize serial monitor
  Serial.begin(115200);
  delay(1000);  // Wait for serial to initialize

  Serial.println("\n\n========================================");
  Serial.println("   IoT Space ESP32 Device Client");
  Serial.println("========================================");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.println("----------------------------------------");
  Serial.print("Data Topic: ");
  Serial.println(dataTopic);
  Serial.print("Control Topic: ");
  Serial.println(controlTopic);
  Serial.print("Status Topic: ");
  Serial.println(statusTopic);
  Serial.println("========================================\n");

  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, ledState);

  dht.begin();

  // Set WiFi mode to station
  WiFi.mode(WIFI_STA);

  // Connect to WiFi
  connectToWiFi();

  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);  // Increase buffer for larger messages
}

// ========== MAIN LOOP ==========
void loop() {
  unsigned long now = millis();

  // Check WiFi connection periodically
  if (now - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = now;

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected! Reconnecting...");
      connectToWiFi();
    }
  }

  // Only proceed if WiFi is connected
  if (WiFi.status() == WL_CONNECTED) {
    // Maintain MQTT connection
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }

    // Process MQTT messages
    mqttClient.loop();

    // Send heartbeat
    if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
      lastHeartbeat = now;
      sendHeartbeat();
    }

    // Publish sensor data
    if (now - lastMqttMsg > MQTT_INTERVAL) {
      lastMqttMsg = now;
      publishSensorData();
    }
  }

  // Small delay to prevent watchdog timer reset
  delay(10);
}

// ========== WIFI FUNCTIONS ==========

/**
 * Connect to WiFi network
 */
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;  // Already connected
  }

  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < MAX_WIFI_RETRIES) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\nWiFi connection FAILED!");
    Serial.println("Please check your WiFi credentials.");
    // Blink LED to indicate error
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }
}

// ========== MQTT FUNCTIONS ==========

/**
 * MQTT callback for incoming control messages
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT message received [");
  Serial.print(topic);
  Serial.print("]: ");

  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse JSON control message
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Process control commands
  if (doc.containsKey("value")) {
    int value = doc["value"];
    Serial.print("Control value received: ");
    Serial.println(value);

    // Control LED based on value
    ledState = (value > 0) ? HIGH : LOW;
    digitalWrite(LED_PIN, ledState);

    Serial.print("LED turned ");
    Serial.println(ledState == HIGH ? "ON" : "OFF");
  }
}

/**
 * Reconnect to MQTT broker
 */
void reconnectMQTT() {
  int retries = 0;

  while (!mqttClient.connected() && retries < MAX_MQTT_RETRIES) {
    Serial.print("Attempting MQTT connection... ");

    // Create unique client ID
    String clientId = "ESP32-";
    clientId += DEVICE_ID;
    clientId += "-";
    clientId += String(random(0xffff), HEX);

    // Attempt connection with Last Will Testament
    if (mqttClient.connect(
          clientId.c_str(),
          MQTT_USER,
          MQTT_PASSWORD,
          statusTopic.c_str(),  // LWT topic
          1,                     // LWT QoS
          true,                  // LWT retain
          "false"                // LWT message (offline)
        )) {

      Serial.println("connected!");

      // Subscribe to control topic
      if (mqttClient.subscribe(controlTopic.c_str(), 1)) {
        Serial.print("Subscribed to: ");
        Serial.println(controlTopic);
      }

      // Publish online status
      mqttClient.publish(statusTopic.c_str(), "true", true);
      Serial.println("Published online status");

    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" - retrying in 5 seconds");

      retries++;
      delay(5000);
    }
  }

  if (!mqttClient.connected()) {
    Serial.println("MQTT connection failed after max retries!");
  }
}

/**
 * Send heartbeat to keep connection alive
 */
void sendHeartbeat() {
  if (mqttClient.connected()) {
    mqttClient.publish(statusTopic.c_str(), "true", true);
    Serial.println("♥ Heartbeat sent");
  }
}

/**
 * Read sensor data and publish to MQTT
 */
void publishSensorData() {
  // Read DHT22 sensor
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  // Check for sensor errors
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("ERROR: Failed to read from DHT sensor!");
    humidity = 0.0;
    temperature = 0.0;
  }

  // Display sensor readings
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print("°C | Humidity: ");
  Serial.print(humidity);
  Serial.print("% | LED: ");
  Serial.println(ledState == HIGH ? "ON" : "OFF");

  // Create JSON payload
  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();

  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temperature;
  data["humidity"] = humidity;
  data["value"] = ledState;

  // Serialize JSON to string
  char buffer[384];
  size_t bytesWritten = serializeJson(doc, buffer);

  // Publish to MQTT
  if (mqttClient.publish(dataTopic.c_str(), buffer, bytesWritten)) {
    Serial.println("✓ Data published successfully");
  } else {
    Serial.println("✗ Failed to publish data!");
  }

  // Reinforce online status
  mqttClient.publish(statusTopic.c_str(), "true", true);
}
