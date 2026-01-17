/**
 * ESP32 Manifold Controller for MANIFOLD-27 System
 *
 * Features:
 * - Controls 4 solenoid valves via relay modules
 * - Dynamic GPIO configuration loaded from server
 * - MQTT communication for real-time control
 * - Status publishing every 5 seconds
 * - Command acknowledgment system
 * - Heartbeat for online presence detection
 * - Cycle count tracking per valve
 * - Fault detection and alarm generation
 *
 * Hardware Requirements:
 * - ESP32 DevKit
 * - 4-Channel Relay Module (Active LOW)
 * - 12V Power Supply for valves
 * - MANIFOLD-27 with 4 solenoid valves
 *
 * Wiring:
 * - Relay CH1-CH4 → ESP32 GPIO (configured via server)
 * - Relay VCC → 5V
 * - Relay GND → GND
 * - Valve Solenoids → Relay NO (Normally Open)
 * - 12V Supply → Common terminal on relays
 *
 * MQTT Topics:
 * - Subscribe: manifolds/{MANIFOLD_ID}/command
 * - Publish: manifolds/{MANIFOLD_ID}/status
 * - Publish: manifolds/{MANIFOLD_ID}/ack
 * - Publish: manifolds/{MANIFOLD_ID}/online
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ============================
// Configuration
// ============================

// Device Identification
String DEVICE_ID = "";  // Loaded from preferences
String MANIFOLD_ID = "";  // Loaded from server

// Network Configuration
String WIFI_SSID = "";
String WIFI_PASSWORD = "";
String SERVER_URL = "http://192.168.1.100:5000";  // Update with your server IP
String MQTT_SERVER = "192.168.1.100";  // Update with your MQTT broker IP
int MQTT_PORT = 1883;

// GPIO Pins for Valves (Dynamic - loaded from server)
int VALVE_PINS[4] = {12, 13, 14, 15};  // Default pins, will be updated from server

// Valve States
enum ValveStatus { OFF, ON, FAULT };
struct Valve {
  int pin;
  ValveStatus status;
  int cycleCount;
  unsigned long lastToggleTime;
  bool manualOverride;
};

Valve valves[4];

// Timing Configuration
const unsigned long STATUS_PUBLISH_INTERVAL = 5000;  // 5 seconds
const unsigned long HEARTBEAT_INTERVAL = 10000;      // 10 seconds
const unsigned long WIFI_RECONNECT_INTERVAL = 30000; // 30 seconds
const unsigned long CONFIG_FETCH_INTERVAL = 60000;   // 1 minute

// Timers
unsigned long lastStatusPublish = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWiFiCheck = 0;
unsigned long lastConfigFetch = 0;

// Objects
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Preferences preferences;

// ============================
// Setup
// ============================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n=================================");
  Serial.println("ESP32 Manifold Controller v1.0");
  Serial.println("MANIFOLD-27 System");
  Serial.println("=================================\n");

  // Initialize preferences
  preferences.begin("manifold", false);

  // Load WiFi credentials from preferences
  loadWiFiCredentials();

  // Load or generate Device ID
  loadDeviceID();

  // Initialize GPIO pins with defaults (will be updated from server)
  initializeValves();

  // Connect to WiFi
  connectWiFi();

  // Fetch configuration from server
  fetchManifoldConfig();

  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER.c_str(), MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(30);

  // Connect to MQTT
  connectMQTT();

  Serial.println("\n✓ System initialized successfully");
  Serial.println("✓ Ready to receive commands\n");
}

// ============================
// Main Loop
// ============================

void loop() {
  unsigned long currentMillis = millis();

  // Maintain WiFi connection
  if (currentMillis - lastWiFiCheck >= WIFI_RECONNECT_INTERVAL) {
    lastWiFiCheck = currentMillis;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected. Reconnecting...");
      connectWiFi();
    }
  }

  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // Publish status periodically
  if (currentMillis - lastStatusPublish >= STATUS_PUBLISH_INTERVAL) {
    lastStatusPublish = currentMillis;
    publishStatus();
  }

  // Publish heartbeat
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentMillis;
    publishHeartbeat();
  }

  // Fetch configuration periodically
  if (currentMillis - lastConfigFetch >= CONFIG_FETCH_INTERVAL) {
    lastConfigFetch = currentMillis;
    fetchManifoldConfig();
  }

  // Monitor valve health
  checkValveHealth();

  delay(10);  // Small delay to prevent watchdog issues
}

// ============================
// WiFi Functions
// ============================

void loadWiFiCredentials() {
  WIFI_SSID = preferences.getString("wifi_ssid", "");
  WIFI_PASSWORD = preferences.getString("wifi_pass", "");

  if (WIFI_SSID.length() == 0) {
    Serial.println("⚠ No WiFi credentials found in memory");
    Serial.println("Please configure via HTTP AP mode or update code");
    // You can implement AP mode for WiFi configuration here
  }
}

void connectWiFi() {
  if (WIFI_SSID.length() == 0) {
    Serial.println("✗ Cannot connect to WiFi - no credentials");
    return;
  }

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID.c_str(), WIFI_PASSWORD.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed");
  }
}

// ============================
// MQTT Functions
// ============================

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Cannot connect to MQTT - WiFi not connected");
    return;
  }

  if (MANIFOLD_ID.length() == 0) {
    Serial.println("✗ Cannot connect to MQTT - no MANIFOLD_ID");
    return;
  }

  Serial.print("Connecting to MQTT broker: ");
  Serial.println(MQTT_SERVER);

  String clientId = "ESP32_" + DEVICE_ID;

  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("✓ MQTT Connected");

      // Subscribe to command topic
      String commandTopic = "manifolds/" + MANIFOLD_ID + "/command";
      mqttClient.subscribe(commandTopic.c_str());
      Serial.print("✓ Subscribed to: ");
      Serial.println(commandTopic);

      // Publish online status
      publishHeartbeat();
      publishStatus();

    } else {
      Serial.print("✗ MQTT Connection failed, rc=");
      Serial.println(mqttClient.state());
      delay(2000);
      attempts++;
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);

  // Parse JSON payload
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("✗ JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Extract command details
  String commandId = doc["commandId"] | "";
  int valveNumber = doc["valveNumber"] | 0;
  String action = doc["action"] | "";
  unsigned long timestamp = doc["timestamp"] | 0;

  Serial.println("Command Details:");
  Serial.print("  Command ID: ");
  Serial.println(commandId);
  Serial.print("  Valve: ");
  Serial.println(valveNumber);
  Serial.print("  Action: ");
  Serial.println(action);

  // Validate valve number
  if (valveNumber < 1 || valveNumber > 4) {
    Serial.println("✗ Invalid valve number");
    publishAcknowledgment(commandId, valveNumber, action, false, "Invalid valve number");
    return;
  }

  // Execute command
  bool success = executeValveCommand(valveNumber, action);

  // Publish acknowledgment
  String message = success ? "Command executed successfully" : "Command execution failed";
  publishAcknowledgment(commandId, valveNumber, action, success, message);

  // Publish updated status immediately
  publishStatus();
}

// ============================
// Valve Control Functions
// ============================

void initializeValves() {
  Serial.println("Initializing valves with default pins...");

  for (int i = 0; i < 4; i++) {
    valves[i].pin = VALVE_PINS[i];
    valves[i].status = OFF;
    valves[i].cycleCount = 0;
    valves[i].lastToggleTime = 0;
    valves[i].manualOverride = false;

    // Configure GPIO as output
    pinMode(valves[i].pin, OUTPUT);
    digitalWrite(valves[i].pin, HIGH);  // Relay is Active LOW, so HIGH = OFF

    Serial.print("  Valve ");
    Serial.print(i + 1);
    Serial.print(" → GPIO ");
    Serial.println(valves[i].pin);
  }
}

void updateValvePins(int pins[4]) {
  Serial.println("Updating valve GPIO pins...");

  // Turn off all valves first
  for (int i = 0; i < 4; i++) {
    digitalWrite(valves[i].pin, HIGH);
  }

  // Update pins
  for (int i = 0; i < 4; i++) {
    valves[i].pin = pins[i];
    pinMode(valves[i].pin, OUTPUT);
    digitalWrite(valves[i].pin, HIGH);  // OFF state

    Serial.print("  Valve ");
    Serial.print(i + 1);
    Serial.print(" → GPIO ");
    Serial.println(valves[i].pin);
  }

  // Save to preferences
  preferences.putBytes("valve_pins", pins, sizeof(pins));
}

bool executeValveCommand(int valveNumber, String action) {
  int index = valveNumber - 1;  // Convert to 0-based index

  Serial.print("Executing command: Valve ");
  Serial.print(valveNumber);
  Serial.print(" → ");
  Serial.println(action);

  if (action == "ON") {
    digitalWrite(valves[index].pin, LOW);  // Active LOW relay
    valves[index].status = ON;

    // Increment cycle count only when turning ON
    if (millis() - valves[index].lastToggleTime > 1000) {  // Debounce
      valves[index].cycleCount++;
    }
    valves[index].lastToggleTime = millis();

    Serial.println("✓ Valve turned ON");
    return true;

  } else if (action == "OFF") {
    digitalWrite(valves[index].pin, HIGH);  // Active LOW relay
    valves[index].status = OFF;
    valves[index].lastToggleTime = millis();

    Serial.println("✓ Valve turned OFF");
    return true;

  } else {
    Serial.println("✗ Unknown action");
    return false;
  }
}

void checkValveHealth() {
  // Simple health check - you can add more sophisticated checks
  // For example, check if valve is stuck, measure current, etc.

  for (int i = 0; i < 4; i++) {
    // Check if valve has been ON for too long (> 24 hours)
    if (valves[i].status == ON) {
      unsigned long onDuration = millis() - valves[i].lastToggleTime;
      if (onDuration > 86400000) {  // 24 hours in milliseconds
        Serial.print("⚠ Warning: Valve ");
        Serial.print(i + 1);
        Serial.println(" has been ON for > 24 hours");
        // You could set fault status here if needed
        // valves[i].status = FAULT;
      }
    }
  }
}

// ============================
// Publishing Functions
// ============================

void publishStatus() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<1024> doc;
  doc["manifoldId"] = MANIFOLD_ID;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();

  JsonArray valvesArray = doc.createNestedArray("valves");

  for (int i = 0; i < 4; i++) {
    JsonObject valve = valvesArray.createNestedObject();
    valve["valveNumber"] = i + 1;
    valve["status"] = valves[i].status == ON ? "ON" : (valves[i].status == FAULT ? "FAULT" : "OFF");
    valve["cycleCount"] = valves[i].cycleCount;
    valve["pin"] = valves[i].pin;
  }

  String jsonString;
  serializeJson(doc, jsonString);

  String topic = "manifolds/" + MANIFOLD_ID + "/status";
  mqttClient.publish(topic.c_str(), jsonString.c_str());

  Serial.print("📡 Published status to: ");
  Serial.println(topic);
}

void publishAcknowledgment(String commandId, int valveNumber, String action, bool success, String message) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  doc["commandId"] = commandId;
  doc["manifoldId"] = MANIFOLD_ID;
  doc["deviceId"] = DEVICE_ID;
  doc["valveNumber"] = valveNumber;
  doc["action"] = action;
  doc["success"] = success;
  doc["message"] = message;
  doc["timestamp"] = millis();

  String jsonString;
  serializeJson(doc, jsonString);

  String topic = "manifolds/" + MANIFOLD_ID + "/ack";
  mqttClient.publish(topic.c_str(), jsonString.c_str());

  Serial.print("✓ Published ACK to: ");
  Serial.println(topic);
}

void publishHeartbeat() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["manifoldId"] = MANIFOLD_ID;
  doc["deviceId"] = DEVICE_ID;
  doc["status"] = "online";
  doc["timestamp"] = millis();
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  String jsonString;
  serializeJson(doc, jsonString);

  String topic = "manifolds/" + MANIFOLD_ID + "/online";
  mqttClient.publish(topic.c_str(), jsonString.c_str());
}

// ============================
// HTTP Configuration Functions
// ============================

void loadDeviceID() {
  DEVICE_ID = preferences.getString("device_id", "");

  if (DEVICE_ID.length() == 0) {
    // Generate a unique device ID based on MAC address
    uint8_t mac[6];
    WiFi.macAddress(mac);
    DEVICE_ID = String(mac[0], HEX) + String(mac[1], HEX) +
                String(mac[2], HEX) + String(mac[3], HEX) +
                String(mac[4], HEX) + String(mac[5], HEX);
    DEVICE_ID.toUpperCase();
    preferences.putString("device_id", DEVICE_ID);
  }

  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
}

void fetchManifoldConfig() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Cannot fetch config - WiFi not connected");
    return;
  }

  HTTPClient http;
  String url = SERVER_URL + "/api/manifolds/device/" + DEVICE_ID;

  Serial.print("Fetching configuration from: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("✓ Configuration received");

    StaticJsonDocument<2048> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      // Update manifold ID
      MANIFOLD_ID = doc["manifoldId"].as<String>();
      Serial.print("Manifold ID: ");
      Serial.println(MANIFOLD_ID);

      // Update valve pins from configuration
      JsonArray valvesJson = doc["valves"];
      if (valvesJson.size() == 4) {
        int newPins[4];
        for (int i = 0; i < 4; i++) {
          newPins[i] = valvesJson[i]["esp32PinNumber"];
        }
        updateValvePins(newPins);
      }

      Serial.println("✓ Configuration applied successfully");
    } else {
      Serial.print("✗ JSON parsing error: ");
      Serial.println(error.c_str());
    }
  } else if (httpCode == 404) {
    Serial.println("⚠ No manifold found for this device");
    Serial.println("Please create a manifold in the web interface");
  } else {
    Serial.print("✗ HTTP error: ");
    Serial.println(httpCode);
  }

  http.end();
}

// ============================
// Utility Functions
// ============================

void printSystemInfo() {
  Serial.println("\n========== System Info ==========");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Manifold ID: ");
  Serial.println(MANIFOLD_ID);
  Serial.print("WiFi SSID: ");
  Serial.println(WIFI_SSID);
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("MQTT Server: ");
  Serial.println(MQTT_SERVER);
  Serial.println("=================================\n");
}
