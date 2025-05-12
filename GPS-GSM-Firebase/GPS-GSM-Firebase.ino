/*
Ce code a été réalisé par CHOUBIK Houssam dans le cadre de la réalisation 
d'un système de localisation GPS - 2024/2025.
*/

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>

// === Wi-Fi credentials ===
const char* ssid = "#";
const char* password = "#";

// === Firebase Realtime Database URL ===
const char* firebaseURL = "https://gps-techno-default-rtdb.europe-west1.firebasedatabase.app/gps.json";

// === GPS configuration ===
#define RX_PIN 14  // D5 on NodeMCU
#define TX_PIN 12  // D6 on NodeMCU
SoftwareSerial gpsSerial(RX_PIN, TX_PIN);
TinyGPSPlus gps;

// === GSM configuration ===
SoftwareSerial gsmSerial(D3, D2); // RX, TX for GSM 800A module
String phoneNumber = "+212645760381"; // Replace with your phone number

unsigned long lastFirebaseTime = 0;
unsigned long lastSMSTime = 0;
const unsigned long firebaseInterval = 5000;  // 5 seconds
const unsigned long smsInterval = 300000;     // 5 minutes

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Connected to Wi-Fi: " + WiFi.localIP().toString());
}

void sendToFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Wi-Fi not connected, skipping Firebase send.");
    return;
  }

  float lat = gps.location.lat();
  float lon = gps.location.lng();
  float alt = gps.altitude.meters();
  float spd = gps.speed.kmph();
  int sats = gps.satellites.value();
  unsigned long accuracy = gps.location.age();

  char dateStr[11];
  snprintf(dateStr, sizeof(dateStr), "%02d/%02d/%04d",
           gps.date.day(), gps.date.month(), gps.date.year());

  char timeStr[9];
  snprintf(timeStr, sizeof(timeStr), "%02d:%02d:%02d",
           gps.time.hour(), gps.time.minute(), gps.time.second());

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, firebaseURL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> json;
  json["lat"] = lat;
  json["lon"] = lon;
  json["altitude"] = alt;
  json["speed_kmph"] = spd;
  json["satellites"] = sats;
  json["accuracy_ms"] = accuracy;
  json["date"] = dateStr;
  json["time"] = timeStr;

  String payload;
  serializeJson(json, payload);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("📡 Data sent to Firebase: " + response);
  } else {
    Serial.println("❌ Firebase error: " + http.errorToString(httpCode));
  }

  http.end();
}

void sendATCommand(String command, String expectedResponse) {
  gsmSerial.println(command);
  Serial.println("Sending AT Command: " + command);
  
  String response = "";
  unsigned long timeout = millis();
  while (millis() - timeout < 5000) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      response += c;
    }
  }

  Serial.println("GSM Response: " + response);
  if (response.indexOf(expectedResponse) != -1) {
    Serial.println("✅ AT Command Successful");
  } else {
    Serial.println("❌ AT Command Failed");
  }
}

void sendSMSText(String message) {
  Serial.println("Sending SMS...");
  sendATCommand("AT", "OK");
  sendATCommand("AT+CMGF=1", "OK"); // Set SMS text mode
  gsmSerial.println("AT+CMGS=\"" + phoneNumber + "\"");
  delay(1000);

  gsmSerial.print(message);
  delay(200);
  gsmSerial.write(26); // Ctrl+Z
  delay(5000);
  Serial.println("✅ SMS Sent: " + message);
}

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600);
  gsmSerial.begin(9600);

  Serial.println("Initializing system...");
  connectWiFi();

  Serial.println("Waiting for GSM module...");
  delay(10000);

  Serial.println("Sending initial SMS...");
  sendSMSText("Wi-Fi connected. Starting GPS tracking.");
  lastSMSTime = millis();  // Reset SMS timer

  Serial.println("System Ready.");
}

void loop() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isUpdated()) {
    float lat = gps.location.lat();
    float lon = gps.location.lng();
    float alt = gps.altitude.meters();
    float spd = gps.speed.kmph();
    int sats = gps.satellites.value();
    unsigned long accuracy = gps.location.age();

    Serial.printf("\n📍 Lat: %.6f | Lon: %.6f | Alt: %.2f m | Speed: %.2f km/h\n", lat, lon, alt, spd);
    Serial.printf("🛰 Satellites: %d | Accuracy: %lu ms\n", sats, accuracy);
    Serial.printf("📅 Date: %02d/%02d/%04d | ⏰ Time: %02d:%02d:%02d\n",
                  gps.date.day(), gps.date.month(), gps.date.year(),
                  gps.time.hour(), gps.time.minute(), gps.time.second());

    unsigned long currentTime = millis();

    // Firebase every 5 sec
    if (currentTime - lastFirebaseTime >= firebaseInterval) {
      sendToFirebase();
      lastFirebaseTime = currentTime;
    }

    // SMS every 5 min
    if (currentTime - lastSMSTime >= smsInterval) {
      String smsMessage = "GPS Data:\nLat: " + String(lat, 6) +
                          "\nLon: " + String(lon, 6) +
                          "\nAlt: " + String(alt, 2) +
                          " m\nSpd: " + String(spd, 2) +
                          " km/h\nSats: " + String(sats);
      sendSMSText(smsMessage);
      lastSMSTime = currentTime;
    }
  }
}