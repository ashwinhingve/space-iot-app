/*
 * ESP32 IoT Device - Dynamic Wi-Fi Configuration
 *
 * FEATURES:
 * - Web-based Wi-Fi configuration (scan and select networks)
 * - Credentials saved to NVS (persistent storage)
 * - Boot button hold (2 sec) to reset Wi-Fi credentials
 * - 6 GPIO pins HIGH for 20 seconds on startup
 * - MQTT communication for IoT platform
 * - DHT22 sensor support
 *
 * USAGE:
 * 1. On first boot, connects to default Wi-Fi
 * 2. Open browser to ESP32's IP address to change Wi-Fi
 * 3. Hold BOOT button for 2 seconds to reset to default credentials
 */

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <esp_task_wdt.h>  // Watchdog timer for auto-recovery

// ============================================================
// ===== DEFAULT WIFI CONFIGURATION =====
// ============================================================

// UPDATE THESE to your Windows Mobile Hotspot credentials:
const char* DEFAULT_SSID = "ASHWIN_HINGVE 5294";      // <-- Change this
const char* DEFAULT_PASSWORD = "qwerty123";      // <-- Change this

// ============================================================
// ===== MQTT BROKER CONFIGURATION =====
// ============================================================

const char* MQTT_SERVER = "192.168.137.1";  // Windows Mobile Hotspot IP
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";
const char* MQTT_PASSWORD = "";

// ============================================================
// ===== DEVICE CONFIGURATION =====
// ============================================================

const char* DEVICE_ID = "esp32-devkit-v1";

// Pin configuration
#define DHTPIN 4
#define DHTTYPE DHT22
#define LED_PIN 2
#define BOOT_BUTTON_PIN 0  // GPIO0 - Boot button

// 6 Safe GPIO Output Pins
const int OUTPUT_PINS[6] = {13, 14, 25, 26, 27, 33};
const unsigned long PINS_ON_DURATION = 20000;  // 20 seconds

// ============================================================
// ===== GLOBAL OBJECTS =====
// ============================================================

AsyncWebServer webServer(80);
AsyncWebSocket ws("/ws");
Preferences preferences;
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHTPIN, DHTTYPE);

// MQTT Topics
String dataTopic;
String controlTopic;
String statusTopic;

// Wi-Fi credentials
String currentSSID = "";
String currentPassword = "";

// Timing variables
unsigned long lastMqttMsg = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWiFiScan = 0;
unsigned long pinsStartTime = 0;
unsigned long buttonPressStart = 0;

const long MQTT_INTERVAL = 5000;
const long HEARTBEAT_INTERVAL = 15000;
const long WIFI_SCAN_INTERVAL = 10000;

// State variables
bool pinsActive = false;
bool wifiConnected = false;
float temperature = 0.0;
float humidity = 0.0;
int ledState = LOW;

// ============================================================
// ===== WIFI SCAN & WEB SERVER =====
// ============================================================

String getEncryptionType(wifi_auth_mode_t encType) {
  switch (encType) {
    case WIFI_AUTH_OPEN: return "Open";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA";
    case WIFI_AUTH_WPA2_PSK: return "WPA2";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA+WPA2";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2-EAP";
    case WIFI_AUTH_WPA3_PSK: return "WPA3";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2+WPA3";
    default: return "Unknown";
  }
}

void sendWiFiScanResult() {
  int n = WiFi.scanNetworks();
  DynamicJsonDocument doc(2048);
  JsonArray networks = doc.to<JsonArray>();

  for (int i = 0; i < n; i++) {
    JsonObject network = networks.createNestedObject();
    network["ssid"] = WiFi.SSID(i);
    network["rssi"] = WiFi.RSSI(i);
    network["channel"] = WiFi.channel(i);
    network["encryption"] = getEncryptionType(WiFi.encryptionType(i));
  }

  String json;
  serializeJson(doc, json);
  ws.textAll(json);
}

void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                      AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.println("WebSocket client connected");
    sendWiFiScanResult();  // Send scan results immediately on connect
  } else if (type == WS_EVT_DISCONNECT) {
    Serial.println("WebSocket client disconnected");
  }
}

void handleRoot(AsyncWebServerRequest *request) {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>ESP32 Wi-Fi Config</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
    .container { max-width: 600px; margin: auto; }
    h1 { color: #00d9ff; text-align: center; }
    h2 { color: #00d9ff; margin-top: 30px; }
    .status { background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .status-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #0f3460; }
    .status-item:last-child { border-bottom: none; }
    .online { color: #00ff88; }
    .offline { color: #ff4757; }
    table { width: 100%; border-collapse: collapse; background: #16213e; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #0f3460; }
    th { background: #0f3460; color: #00d9ff; }
    tr:hover { background: #1f4068; cursor: pointer; }
    .ssid-link { color: #00d9ff; text-decoration: none; }
    .ssid-link:hover { text-decoration: underline; }
    .form-container { background: #16213e; padding: 20px; border-radius: 8px; margin-top: 20px; display: none; }
    input[type="text"], input[type="password"] {
      width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #0f3460;
      border-radius: 5px; background: #1a1a2e; color: #eee;
    }
    input[type="submit"], .btn {
      width: 100%; padding: 14px; margin: 8px 0; border: none; border-radius: 5px;
      cursor: pointer; font-size: 16px;
    }
    input[type="submit"] { background: #00d9ff; color: #1a1a2e; }
    input[type="submit"]:hover { background: #00b8d4; }
    .btn-danger { background: #ff4757; color: white; }
    .btn-danger:hover { background: #ff3344; }
    .info { background: #0f3460; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
    .refresh-btn { background: #4834d4; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
  </style>
  <script>
    var ws;

    function initWebSocket() {
      ws = new WebSocket('ws://' + window.location.hostname + '/ws');
      ws.onmessage = function(event) {
        var wifiList = JSON.parse(event.data);
        updateWiFiTable(wifiList);
      };
      ws.onclose = function() {
        setTimeout(initWebSocket, 2000);
      };
    }

    function updateWiFiTable(wifiList) {
      var tbody = document.getElementById('wifiBody');
      tbody.innerHTML = '';
      wifiList.forEach((network, index) => {
        var row = tbody.insertRow();
        row.insertCell(0).innerHTML = index + 1;
        row.insertCell(1).innerHTML = '<a href="#" class="ssid-link" onclick="selectSSID(\'' + network.ssid + '\')">' + network.ssid + '</a>';
        row.insertCell(2).innerHTML = network.rssi + ' dBm';
        row.insertCell(3).innerHTML = network.channel;
        row.insertCell(4).innerHTML = network.encryption;
      });
    }

    function selectSSID(ssid) {
      document.getElementById('ssid').value = ssid;
      document.getElementById('ssidDisplay').textContent = ssid;
      document.getElementById('connect-form').style.display = 'block';
      document.getElementById('password').focus();
    }

    function refreshScan() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('scan');
      }
    }

    window.onload = initWebSocket;
  </script>
</head>
<body>
  <div class="container">
    <h1>ESP32 IoT Device</h1>

    <div class="status">
      <div class="status-item">
        <span>Device ID:</span>
        <span>)rawliteral" + String(DEVICE_ID) + R"rawliteral(</span>
      </div>
      <div class="status-item">
        <span>Current Wi-Fi:</span>
        <span>)rawliteral" + WiFi.SSID() + R"rawliteral(</span>
      </div>
      <div class="status-item">
        <span>IP Address:</span>
        <span>)rawliteral" + WiFi.localIP().toString() + R"rawliteral(</span>
      </div>
      <div class="status-item">
        <span>Signal Strength:</span>
        <span>)rawliteral" + String(WiFi.RSSI()) + R"rawliteral( dBm</span>
      </div>
      <div class="status-item">
        <span>MQTT Status:</span>
        <span class=")rawliteral" + String(mqttClient.connected() ? "online" : "offline") + R"rawliteral(">)rawliteral" + String(mqttClient.connected() ? "Connected" : "Disconnected") + R"rawliteral(</span>
      </div>
    </div>

    <h2>Available Networks</h2>
    <button class="refresh-btn" onclick="refreshScan()">Refresh Scan</button>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>SSID</th>
          <th>Signal</th>
          <th>Channel</th>
          <th>Security</th>
        </tr>
      </thead>
      <tbody id="wifiBody">
        <tr><td colspan="5">Scanning...</td></tr>
      </tbody>
    </table>

    <div class="form-container" id="connect-form">
      <h2>Connect to: <span id="ssidDisplay"></span></h2>
      <form action="/connect" method="POST">
        <input type="hidden" name="ssid" id="ssid">
        <label>Password:</label>
        <input type="password" name="password" id="password" placeholder="Enter Wi-Fi password">
        <input type="submit" value="Connect">
      </form>
    </div>

    <div class="info">
      <strong>Tips:</strong><br>
      - Click on a network name to connect<br>
      - Hold BOOT button for 2 seconds to reset credentials<br>
      - Device will restart after changing Wi-Fi
    </div>

    <form action="/reset" method="POST" style="margin-top: 20px;">
      <button type="submit" class="btn btn-danger">Reset to Default Wi-Fi</button>
    </form>
  </div>
</body>
</html>
)rawliteral";

  request->send(200, "text/html", html);
}

void handleConnect(AsyncWebServerRequest *request) {
  if (request->hasParam("ssid", true) && request->hasParam("password", true)) {
    String newSSID = request->getParam("ssid", true)->value();
    String newPassword = request->getParam("password", true)->value();

    Serial.println("\n========================================");
    Serial.println("New Wi-Fi credentials received:");
    Serial.print("SSID: ");
    Serial.println(newSSID);
    Serial.println("========================================");

    // Save to NVS
    preferences.putString("ssid", newSSID);
    preferences.putString("password", newPassword);

    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Connecting...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial; background: #1a1a2e; color: #eee; text-align: center; padding: 50px; }
    h1 { color: #00d9ff; }
    p { font-size: 18px; }
  </style>
</head>
<body>
  <h1>Credentials Saved!</h1>
  <p>Connecting to: )rawliteral" + newSSID + R"rawliteral(</p>
  <p>Device will restart in 3 seconds...</p>
  <p>Reconnect to the new network and access the device at its new IP.</p>
</body>
</html>
)rawliteral";

    request->send(200, "text/html", html);

    // Restart after delay
    delay(3000);
    ESP.restart();
  } else {
    request->send(400, "text/html", "Bad Request - Missing parameters");
  }
}

void handleReset(AsyncWebServerRequest *request) {
  Serial.println("Resetting Wi-Fi credentials to default...");

  preferences.putString("ssid", DEFAULT_SSID);
  preferences.putString("password", DEFAULT_PASSWORD);

  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Reset</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial; background: #1a1a2e; color: #eee; text-align: center; padding: 50px; }
    h1 { color: #ff4757; }
  </style>
</head>
<body>
  <h1>Credentials Reset!</h1>
  <p>Device will restart and connect to default Wi-Fi...</p>
</body>
</html>
)rawliteral";

  request->send(200, "text/html", html);
  delay(3000);
  ESP.restart();
}

// ============================================================
// ===== MQTT FUNCTIONS =====
// ============================================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT [");
  Serial.print(topic);
  Serial.print("]: ");

  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message)) return;

  if (doc.containsKey("value")) {
    int value = doc["value"];
    ledState = (value > 0) ? HIGH : LOW;
    digitalWrite(LED_PIN, ledState);
    Serial.print("LED: ");
    Serial.println(ledState ? "ON" : "OFF");
  }

  if (doc.containsKey("activatePins") && doc["activatePins"] == true && !pinsActive) {
    Serial.println("Activating pins via MQTT");
    for (int i = 0; i < 6; i++) {
      digitalWrite(OUTPUT_PINS[i], HIGH);
    }
    pinsActive = true;
    pinsStartTime = millis();
  }
}

void connectMQTT() {
  if (mqttClient.connected()) return;

  Serial.print("Connecting to MQTT... ");

  String clientId = "ESP32-" + String(DEVICE_ID) + "-" + String(random(0xffff), HEX);

  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD,
                         statusTopic.c_str(), 1, true, "false")) {
    Serial.println("Connected!");
    mqttClient.subscribe(controlTopic.c_str(), 1);
    mqttClient.publish(statusTopic.c_str(), "true", true);
    Serial.print("Subscribed to: ");
    Serial.println(controlTopic);
  } else {
    Serial.print("Failed (rc=");
    Serial.print(mqttClient.state());
    Serial.println(")");
  }
}

void publishSensorData() {
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    humidity = 0.0;
    temperature = 0.0;
  }

  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.print("C | Humidity: ");
  Serial.print(humidity);
  Serial.print("% | Pins: ");
  Serial.println(pinsActive ? "ACTIVE" : "OFF");

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["ip"] = WiFi.localIP().toString();

  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temperature;
  data["humidity"] = humidity;
  data["ledState"] = ledState;
  data["pinsActive"] = pinsActive;
  data["rssi"] = WiFi.RSSI();

  char buffer[384];
  serializeJson(doc, buffer);

  if (mqttClient.publish(dataTopic.c_str(), buffer)) {
    Serial.println("Data published");
  }

  // Refresh online status
  mqttClient.publish(statusTopic.c_str(), "true", true);
}

// ============================================================
// ===== BOOT BUTTON MONITOR TASK =====
// ============================================================

void buttonMonitorTask(void* parameter) {
  while (true) {
    if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
      if (buttonPressStart == 0) {
        buttonPressStart = millis();
      } else if (millis() - buttonPressStart > 2000) {
        Serial.println("\n========================================");
        Serial.println("Boot button held - Resetting credentials!");
        Serial.println("========================================");
        preferences.putString("ssid", DEFAULT_SSID);
        preferences.putString("password", DEFAULT_PASSWORD);
        delay(500);
        ESP.restart();
      }
    } else {
      buttonPressStart = 0;
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// ============================================================
// ===== WI-FI SCANNER TASK =====
// ============================================================

void wifiScannerTask(void* parameter) {
  while (true) {
    if (WiFi.status() == WL_CONNECTED) {
      sendWiFiScanResult();
    }
    vTaskDelay(WIFI_SCAN_INTERVAL / portTICK_PERIOD_MS);
  }
}

// ============================================================
// ===== CONNECT TO WIFI =====
// ============================================================

bool connectToWiFi(const char* ssid, const char* password) {
  Serial.println("\n========================================");
  Serial.print("Connecting to: ");
  Serial.println(ssid);
  Serial.println("========================================");

  // Full Wi-Fi reset to ensure SSID updates
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(1000);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Blink LED
    delay(500);
    Serial.print(".");
    attempts++;
  }
  digitalWrite(LED_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n========================================");
    Serial.println("Wi-Fi Connected!");
    Serial.print("SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.println("========================================\n");
    return true;
  } else {
    Serial.println("\nWi-Fi connection failed!");
    return false;
  }
}

// ============================================================
// ===== SETUP =====
// ============================================================

void setup() {
  // Enable watchdog timer (8 seconds) for auto-recovery
  esp_task_wdt_init(8, true);
  esp_task_wdt_add(NULL);

  Serial.begin(115200);
  delay(100);  // Reduced delay

  Serial.println("\n\n========================================");
  Serial.println("  ESP32 IoT Device - Starting");
  Serial.println("========================================");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  // Initialize MQTT topics
  dataTopic = "devices/" + String(DEVICE_ID) + "/data";
  controlTopic = "devices/" + String(DEVICE_ID) + "/control";
  statusTopic = "devices/" + String(DEVICE_ID) + "/online";

  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN, LOW);

  // Initialize DHT sensor
  dht.begin();

  // Initialize 6 output pins and set HIGH
  Serial.println("\nActivating 6 GPIO pins for 20 seconds:");
  for (int i = 0; i < 6; i++) {
    pinMode(OUTPUT_PINS[i], OUTPUT);
    digitalWrite(OUTPUT_PINS[i], HIGH);
    Serial.print("  GPIO ");
    Serial.print(OUTPUT_PINS[i]);
    Serial.println(" -> HIGH");
  }
  pinsActive = true;
  pinsStartTime = millis();

  // Initialize NVS preferences
  preferences.begin("wifi", false);

  // Start button monitor task
  xTaskCreate(buttonMonitorTask, "ButtonMonitor", 2048, NULL, 1, NULL);

  // Load saved credentials or use default
  currentSSID = preferences.getString("ssid", DEFAULT_SSID);
  currentPassword = preferences.getString("password", DEFAULT_PASSWORD);

  Serial.print("\nLoaded SSID: ");
  Serial.println(currentSSID);

  // Connect to Wi-Fi
  if (!connectToWiFi(currentSSID.c_str(), currentPassword.c_str())) {
    // Try default if saved credentials fail
    Serial.println("Trying default credentials...");
    connectToWiFi(DEFAULT_SSID, DEFAULT_PASSWORD);
  }

  if (WiFi.status() == WL_CONNECTED) {
    // Setup MQTT
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(512);

    // Setup WebSocket
    ws.onEvent(onWebSocketEvent);
    webServer.addHandler(&ws);

    // Setup web server routes
    webServer.on("/", HTTP_GET, handleRoot);
    webServer.on("/connect", HTTP_POST, handleConnect);
    webServer.on("/reset", HTTP_POST, handleReset);

    webServer.begin();
    Serial.println("Web server started at http://" + WiFi.localIP().toString());

    // Start Wi-Fi scanner task
    xTaskCreate(wifiScannerTask, "WiFiScanner", 4096, NULL, 1, NULL);
  }

  Serial.println("\n========================================");
  Serial.println("Setup complete!");
  Serial.println("========================================\n");
}

// ============================================================
// ===== MAIN LOOP =====
// ============================================================

unsigned long lastWiFiCheck = 0;
const long WIFI_CHECK_INTERVAL = 30000;  // Check WiFi every 30 seconds

void loop() {
  // Feed the watchdog timer - prevents auto-reset
  esp_task_wdt_reset();

  unsigned long now = millis();

  // Handle 20-second pin timer
  if (pinsActive && (now - pinsStartTime >= PINS_ON_DURATION)) {
    Serial.println("\n20 seconds elapsed - Turning OFF pins");
    for (int i = 0; i < 6; i++) {
      digitalWrite(OUTPUT_PINS[i], LOW);
    }
    pinsActive = false;
  }

  // WebSocket cleanup
  ws.cleanupClients();

  // Check WiFi connection and reconnect if needed
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
      lastWiFiCheck = now;
      Serial.println("WiFi disconnected - reconnecting...");
      WiFi.disconnect();
      delay(100);
      WiFi.begin(currentSSID.c_str(), currentPassword.c_str());
    }
  } else {
    // MQTT operations
    if (!mqttClient.connected()) {
      connectMQTT();
    }
    mqttClient.loop();

    // Heartbeat
    if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
      lastHeartbeat = now;
      if (mqttClient.connected()) {
        mqttClient.publish(statusTopic.c_str(), "true", true);
        Serial.println("Heartbeat sent");
      }
    }

    // Publish sensor data
    if (now - lastMqttMsg > MQTT_INTERVAL) {
      lastMqttMsg = now;
      if (mqttClient.connected()) {
        publishSensorData();
      }
    }
  }

  delay(10);
}
