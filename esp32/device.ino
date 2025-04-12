/*
 * IoT Space - ESP32 Device Client
 * This sketch connects an ESP32 to your IoT Space platform
 * It publishes sensor data and subscribes to control commands
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Wi-Fi credentials - Replace with your network credentials
const char* ssid = "ASHWIN's M06";
const char* password = "00000000";

// MQTT Broker settings - Update to match your setup
// If you're running the broker on your PC, use your PC's IP address
// instead of localhost (which won't work for ESP32)
const char* mqtt_server = "192.168.178.89"; // Your computer's IP address
const int mqtt_port = 1883;
const char* mqtt_user = ""; // Leave empty if no username/password
const char* mqtt_password = ""; // Leave empty if no username/password

// MQTT Topics
// Each device should have a unique ID (e.g., esp32-01, esp32-02)
String deviceId = "esp32-01";
String dataTopic = "devices/" + deviceId + "/data";
String controlTopic = "devices/" + deviceId + "/control";
String statusTopic = "devices/" + deviceId + "/online";

// Sensor configuration - DHT22 (or DHT11)
#define DHTPIN 4      // Digital pin connected to the DHT sensor
#define DHTTYPE DHT22 // DHT 22 (AM2302)
DHT dht(DHTPIN, DHTTYPE);

// LED pin for demonstrating control
#define LED_PIN 2 // Built-in LED on most ESP32 dev boards

// MQTT client
WiFiClient espClient;
PubSubClient client(espClient);

// Variables
unsigned long lastMsg = 0;
const long interval = 5000; // Publish data every 5 seconds
unsigned long lastHeartbeat = 0;
const long heartbeatInterval = 15000; // Send heartbeat every 15 seconds (reduced from 30s)
float temperature = 0;
float humidity = 0;
int ledState = LOW;

void setup() {
  // Initialize serial
  Serial.begin(115200);
  Serial.println("\n\n*** IoT Space ESP32 Device Client ***");
  Serial.println("---------------------------------------");
  Serial.print("Device ID: ");
  Serial.println(deviceId);
  Serial.println("MQTT Topics:");
  Serial.print("  - Data Topic: ");
  Serial.println(dataTopic);
  Serial.print("  - Control Topic: ");
  Serial.println(controlTopic);
  Serial.print("  - Status Topic: ");
  Serial.println(statusTopic);
  Serial.println("---------------------------------------");

  // Initialize sensor
  dht.begin();
  
  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, ledState);

  // Connect to Wi-Fi
  setupWifi();
  
  // Set up MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  // Make sure we're connected to MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Send heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeat > heartbeatInterval) {
    lastHeartbeat = now;
    // Publish online status with retain flag
    client.publish(statusTopic.c_str(), "true", true);
    Serial.println("Sent heartbeat: online");
  }

  // Regular sensor data publishing
  if (now - lastMsg > interval) {
    lastMsg = now;
    publishSensorData();
  }
}

void setupWifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming messages
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  
  // Convert payload to string
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse the JSON control message
  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Process the control command
  if (doc.containsKey("value")) {
    int value = doc["value"];
    Serial.print("Control value: ");
    Serial.println(value);
    
    // Simple control example: if value > 0, turn on LED, else turn off
    if (value > 0) {
      ledState = HIGH;
    } else {
      ledState = LOW;
    }
    
    digitalWrite(LED_PIN, ledState);
    
    // You could control other actuators based on different commands
    // For example: relay, motor, etc.
  }
}

void reconnect() {
  // Loop until we're reconnected
  int retries = 0;
  while (!client.connected() && retries < 5) {
    Serial.print("Attempting MQTT connection...");
    
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    // Last Will Testament setup - this message is sent when device disconnects unexpectedly
    const char* willTopic = statusTopic.c_str();
    const char* willMessage = "false";
    boolean willRetain = true;
    
    // Attempt to connect with LWT
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password, 
                      willTopic, 0, willRetain, willMessage)) {
      Serial.println("connected");
      
      // Subscribe to control topic
      client.subscribe(controlTopic.c_str());
      
      // Publish online status with retain flag
      client.publish(statusTopic.c_str(), "true", true);
      Serial.println("Published online status");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      retries++;
      delay(5000);
    }
  }
}

void publishSensorData() {
  // Read sensor data
  readSensorData();
  
  // Create a JSON document for the main data
  DynamicJsonDocument doc(256);
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  
  // Add sensor readings in the expected format
  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temperature;
  data["humidity"] = humidity;
  data["value"] = ledState;
  
  // Convert to string
  char buffer[256];
  size_t n = serializeJson(doc, buffer);
  
  // Publish data message
  Serial.println("Publishing sensor data:");
  Serial.println(buffer);
  client.publish(dataTopic.c_str(), buffer, n);
  
  // Also publish online status with the data to reinforce connection
  client.publish(statusTopic.c_str(), "true", true);
}

void readSensorData() {
  // Read humidity and temperature
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  // Check if any reads failed
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    humidity = 0.0;
    temperature = 0.0;
  }

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.print(" %\t");
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
} 