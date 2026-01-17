/*
 * IoT Space - ESP32 Device with Dynamic WiFi Configuration
 * This sketch connects to WiFi using credentials fetched from backend
 * No need to reflash firmware when changing WiFi networks
 *
 * FEATURES:
 * - Dynamic WiFi configuration from web interface
 * - AP mode fallback for initial setup
 * - NVS storage for WiFi credentials
 * - Automatic credential fetching
 * - MQTT communication
 * - DHT22 sensor support
 *
 * SETUP MODES:
 * 1. If no WiFi configured: Creates AP "IoT-ESP32-SETUP"
 * 2. Connect to AP and browse to http://192.168.4.1
 * 3. Enter fallback WiFi credentials
 * 4. Device fetches real credentials from backend
 *
 * WIRING:
 * - DHT22 sensor data pin -> GPIO 4
 * - Built-in LED -> GPIO 2
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Preferences.h>

// ===== CONFIGURATION - UPDATE THESE VALUES =====
// Device configuration
const char* DEVICE_ID = "esp32-01";  // Must match web configuration
const char* API_KEY = "YOUR_API_KEY_HERE";  // Get from web interface

// Backend server configuration
const char* API_SERVER = "192.168.1.100";  // Your backend server IP
const int API_PORT = 5000;

// MQTT Broker settings
const char* MQTT_SERVER = "192.168.1.100";  // Your MQTT broker IP
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";
const char* MQTT_PASSWORD = "";

// AP Mode configuration (for initial setup)
const char* AP_SSID = "IoT-ESP32-SETUP";
const char* AP_PASSWORD = "12345678";  // Minimum 8 characters

// Sensor configuration
#define DHTPIN 4
#define DHTTYPE DHT22
#define LED_PIN 2
// ================================================

// Preferences for NVS storage
Preferences preferences;

// WiFi credentials
String wifiSSID = "";
String wifiPassword = "";
String fallbackSSID = "";
String fallbackPassword = "";

// MQTT topics
String dataTopic = "devices/" + String(DEVICE_ID) + "/data";
String controlTopic = "devices/" + String(DEVICE_ID) + "/control";
String statusTopic = "devices/" + String(DEVICE_ID) + "/online";

// Clients
WiFiClient espClient;
HTTPClient http;
PubSubClient mqttClient(espClient);
DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

// Timing variables
unsigned long lastMqttMsg = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWiFiCheck = 0;
const long MQTT_INTERVAL = 5000;
const long HEARTBEAT_INTERVAL = 15000;
const long WIFI_CHECK_INTERVAL = 30000;

// Sensor data
float temperature = 0.0;
float humidity = 0.0;
int ledState = LOW;

// State variables
bool apMode = false;
bool credentialsFetched = false;

// Connection settings
const int MAX_WIFI_RETRIES = 20;
const int MAX_MQTT_RETRIES = 3;

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================");
  Serial.println(" IoT Space - Dynamic WiFi ESP32 Client");
  Serial.println("========================================");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.println("========================================\n");

  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, ledState);
  dht.begin();

  // Initialize NVS
  preferences.begin("wifi-config", false);

  // Load saved credentials
  loadAllCredentials();

  // Try to connect to WiFi
  if (fallbackSSID.length() > 0) {
    Serial.println("Attempting connection with fallback credentials...");
    if (connectToWiFi(fallbackSSID.c_str(), fallbackPassword.c_str(), false)) {
      // Connected, now fetch real credentials
      fetchWiFiCredentials();
    }
  }

  // If still not connected, try stored WiFi credentials
  if (WiFi.status() != WL_CONNECTED && wifiSSID.length() > 0) {
    Serial.println("Attempting connection with stored credentials...");
    connectToWiFi(wifiSSID.c_str(), wifiPassword.c_str(), false);
  }

  // If still not connected, start AP mode
  if (WiFi.status() != WL_CONNECTED) {
    startAPMode();
  } else {
    setupMQTT();
  }
}

// ========== MAIN LOOP ==========
void loop() {
  unsigned long now = millis();

  // Handle AP mode
  if (apMode) {
    server.handleClient();
    // Blink LED in AP mode
    if (now % 1000 < 500) {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
    return;
  }

  // Periodic WiFi check
  if (now - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = now;

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected! Reconnecting...");

      // Try saved credentials
      if (!connectToWiFi(wifiSSID.c_str(), wifiPassword.c_str(), false)) {
        // Try fallback
        if (!connectToWiFi(fallbackSSID.c_str(), fallbackPassword.c_str(), false)) {
          // Last resort: start AP mode
          startAPMode();
          return;
        } else {
          // Connected via fallback, fetch new credentials
          fetchWiFiCredentials();
        }
      }
    }
  }

  // MQTT operations (only if WiFi connected)
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
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

  delay(10);
}

// ========== WIFI FUNCTIONS ==========

/**
 * Load all credentials from NVS
 */
void loadAllCredentials() {
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  fallbackSSID = preferences.getString("fb_ssid", "");
  fallbackPassword = preferences.getString("fb_pass", "");

  Serial.println("Loaded credentials from NVS:");
  Serial.print("  WiFi SSID: ");
  Serial.println(wifiSSID.length() > 0 ? wifiSSID : "(empty)");
  Serial.print("  Fallback SSID: ");
  Serial.println(fallbackSSID.length() > 0 ? fallbackSSID : "(empty)");
}

/**
 * Save WiFi credentials to NVS
 */
void saveWiFiCredentials(String ssid, String password) {
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  wifiSSID = ssid;
  wifiPassword = password;

  Serial.println("WiFi credentials saved to NVS");
  Serial.print("  SSID: ");
  Serial.println(ssid);
}

/**
 * Save fallback credentials to NVS
 */
void saveFallbackCredentials(String ssid, String password) {
  preferences.putString("fb_ssid", ssid);
  preferences.putString("fb_pass", password);
  fallbackSSID = ssid;
  fallbackPassword = password;

  Serial.println("Fallback credentials saved to NVS");
  Serial.print("  SSID: ");
  Serial.println(ssid);
}

/**
 * Connect to WiFi network
 */
bool connectToWiFi(const char* ssid, const char* password, bool persistent) {
  if (strlen(ssid) == 0) {
    return false;
  }

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);

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
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    return true;
  } else {
    Serial.println("\nWiFi connection failed!");
    return false;
  }
}

/**
 * Fetch WiFi credentials from backend API
 */
void fetchWiFiCredentials() {
  Serial.println("\n--- Fetching WiFi Credentials from Backend ---");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("ERROR: Not connected to WiFi");
    return;
  }

  String url = "http://" + String(API_SERVER) + ":" + String(API_PORT) +
               "/api/device/" + String(DEVICE_ID) + "/wifi";

  Serial.print("API URL: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("X-API-Key", API_KEY);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);  // 10 second timeout

  int httpCode = http.GET();

  if (httpCode == 200) {  // HTTP_CODE_OK
    String payload = http.getString();
    Serial.println("Response received:");
    Serial.println(payload);

    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      String newSSID = doc["ssid"].as<String>();
      String newPassword = doc["password"].as<String>();

      if (newSSID.length() > 0) {
        Serial.println("New WiFi credentials received!");
        Serial.print("  SSID: ");
        Serial.println(newSSID);

        // Save to NVS
        saveWiFiCredentials(newSSID, newPassword);
        credentialsFetched = true;

        // Connect to new WiFi
        Serial.println("Connecting to new WiFi...");
        if (connectToWiFi(wifiSSID.c_str(), wifiPassword.c_str(), true)) {
          Serial.println("Successfully connected!");
          setupMQTT();

          // Restart for clean state
          Serial.println("Restarting in 3 seconds...");
          delay(3000);
          ESP.restart();
        }
      } else {
        Serial.println("ERROR: Empty SSID in response");
      }
    } else {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.print("HTTP request failed, code: ");
    Serial.println(httpCode);
    if (httpCode > 0) {
      Serial.println(http.getString());
    }
  }

  http.end();
  Serial.println("--- End Credential Fetch ---\n");
}

// ========== AP MODE FUNCTIONS ==========

/**
 * Start Access Point mode for configuration
 */
void startAPMode() {
  apMode = true;

  Serial.println("\n========================================");
  Serial.println("Starting AP Mode for Configuration");
  Serial.println("========================================");

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
  Serial.println("\nConnect to:");
  Serial.print("  SSID: ");
  Serial.println(AP_SSID);
  Serial.print("  Password: ");
  Serial.println(AP_PASSWORD);
  Serial.print("  URL: http://");
  Serial.println(IP);
  Serial.println("========================================\n");

  // Setup web server routes
  server.on("/", handleRoot);
  server.on("/save", handleSave);
  server.begin();

  Serial.println("Web server started");
}

/**
 * Handle root page (configuration form)
 */
void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32 WiFi Setup</title>";
  html += "<style>";
  html += "body{font-family:Arial;margin:20px;background:#f0f0f0}";
  html += ".container{max-width:400px;margin:auto;background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
  html += "h1{color:#333;text-align:center}";
  html += "label{display:block;margin-top:15px;color:#666;font-weight:bold}";
  html += "input{width:100%;padding:10px;margin-top:5px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}";
  html += "button{width:100%;padding:12px;margin-top:20px;background:#4CAF50;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px}";
  html += "button:hover{background:#45a049}";
  html += ".info{background:#e7f3ff;padding:15px;border-radius:5px;margin-top:20px;font-size:14px}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>ESP32 WiFi Setup</h1>";
  html += "<form action='/save' method='POST'>";
  html += "<label>Device ID:</label>";
  html += "<input type='text' value='" + String(DEVICE_ID) + "' disabled>";
  html += "<label>Fallback WiFi SSID:</label>";
  html += "<input type='text' name='ssid' required placeholder='Your WiFi Network'>";
  html += "<label>Fallback WiFi Password:</label>";
  html += "<input type='password' name='password' required placeholder='WiFi Password'>";
  html += "<button type='submit'>Save & Connect</button>";
  html += "</form>";
  html += "<div class='info'>";
  html += "<strong>Note:</strong> This is a fallback WiFi that allows the device to connect and fetch ";
  html += "the real WiFi credentials from your IoT Space backend.";
  html += "</div>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

/**
 * Handle save configuration
 */
void handleSave() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");

  Serial.println("\nReceived fallback credentials:");
  Serial.print("  SSID: ");
  Serial.println(ssid);

  // Save fallback credentials
  saveFallbackCredentials(ssid, password);

  // Send success page
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32 WiFi Setup</title>";
  html += "<style>";
  html += "body{font-family:Arial;margin:20px;background:#f0f0f0;text-align:center}";
  html += ".container{max-width:400px;margin:auto;background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
  html += "h1{color:#4CAF50}";
  html += "p{color:#666;line-height:1.6}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>✓ Saved!</h1>";
  html += "<p>Fallback WiFi credentials saved. Device will now restart and connect to your WiFi network.</p>";
  html += "<p>Please check the serial monitor for connection status.</p>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);

  // Restart after 3 seconds
  delay(3000);
  ESP.restart();
}

// ========== MQTT FUNCTIONS ==========

/**
 * Setup MQTT client
 */
void setupMQTT() {
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
}

/**
 * MQTT callback
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT message [");
  Serial.print(topic);
  Serial.print("]: ");

  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (!error && doc.containsKey("value")) {
    int value = doc["value"];
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
    Serial.print("Connecting to MQTT... ");

    String clientId = "ESP32-" + String(DEVICE_ID) + "-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD,
                           statusTopic.c_str(), 1, true, "false")) {
      Serial.println("connected!");
      mqttClient.subscribe(controlTopic.c_str(), 1);
      mqttClient.publish(statusTopic.c_str(), "true", true);
    } else {
      Serial.print("failed, rc=");
      Serial.println(mqttClient.state());
      retries++;
      delay(3000);
    }
  }
}

/**
 * Send heartbeat
 */
void sendHeartbeat() {
  if (mqttClient.connected()) {
    mqttClient.publish(statusTopic.c_str(), "true", true);
    Serial.println("♥ Heartbeat");
  }
}

/**
 * Publish sensor data
 */
void publishSensorData() {
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    humidity = 0.0;
    temperature = 0.0;
  }

  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.print("°C | Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();

  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temperature;
  data["humidity"] = humidity;
  data["value"] = ledState;

  char buffer[384];
  size_t n = serializeJson(doc, buffer);

  if (mqttClient.publish(dataTopic.c_str(), buffer, n)) {
    Serial.println("✓ Data published");
  }

  mqttClient.publish(statusTopic.c_str(), "true", true);
}
