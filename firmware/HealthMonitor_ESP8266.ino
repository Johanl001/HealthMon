#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <HX711.h>
#include "MAX30105.h"
#include "heartRate.h"   // SparkFun built-in BPM helper

// ─── CONFIG ───────────────────────────────────────────
const char* SSID     = "";
const char* PASSWORD = "";
const char* TS_API   = "";
const char* TS_URL   = "http://api.thingspeak.com/update";

// ─── PINS ─────────────────────────────────────────────
#define DHT_PIN   0    // D3 (was D4/GPIO2 which conflicts with WiFi boot strapping)
#define DHT_TYPE  DHT11
#define HX711_DT  12   // D6
#define HX711_SCK 14   // D5
#define BUZZER    13   // D7

// ─── OBJECTS ──────────────────────────────────────────
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHT_TYPE);
HX711 scale;
MAX30105 particleSensor;

// ─── CONNECTION FLAGS ──────────────────────────────────────────────
bool hx711Connected   = false;
bool max30102Connected = false;

// ─── THRESHOLDS ───────────────────────────────────────
struct Thresholds {
  float tempMin = 36.0, tempMax = 37.8;
  int   bpmMin  = 60,   bpmMax  = 100;
  int   spo2Min = 95;
};
Thresholds limits;

// ─── BPM ROLLING AVERAGE ──────────────────────────────
const byte RATE_SIZE = 4;           // Average over 4 readings
byte rates[RATE_SIZE] = {0};
byte rateSpot = 0;
long lastBeat = 0;
int  beatsPerMinute = 0;
int  beatAvg = 0;

// ─── SPO2 ESTIMATION (IR-based ratio) ─────────────────
// Simple estimation: if IR value is strong (finger detected) assume healthy SpO2.
// For a more accurate reading, a proper calibrated lookup table would be used.
int estimateSpO2(long irValue, long redValue) {
  if (irValue < 50000) return 0; // No finger detected
  // Ratio of red to IR is inversely proportional to SpO2
  // This is a simplified linear approximation
  float ratio = (float)redValue / (float)irValue;
  int spo2 = (int)(110.0 - 25.0 * ratio);
  spo2 = constrain(spo2, 80, 100);
  return spo2;
}

// ─── HEALTH STATUS ────────────────────────────────────
String getStatus(float temp, int bpm, int spo2) {
  bool critical = (temp > 39.5 || temp < 35.0 || bpm > 130 || bpm < 45 || (spo2 > 0 && spo2 < 90));
  bool warning  = (temp > limits.tempMax || temp < limits.tempMin ||
                   bpm  > limits.bpmMax  || bpm  < limits.bpmMin || (spo2 > 0 && spo2 < limits.spo2Min));
  if (critical) return "CRITICAL";
  if (warning)  return "WARNING";
  return "NORMAL";
}

void triggerBuzzer(String status) {
  if (status == "CRITICAL") {
    for (int i = 0; i < 5; i++) { digitalWrite(BUZZER, HIGH); delay(200); digitalWrite(BUZZER, LOW); delay(200); }
  } else if (status == "WARNING") {
    digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
  }
}

void sendToThingSpeak(float temp, int bpm, float weight, int spo2) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClient client;
  HTTPClient http;
  String url = String(TS_URL) + "?api_key=" + TS_API +
               "&field1=" + temp + "&field2=" + bpm +
               "&field3=" + weight + "&field4=" + spo2;
  http.begin(client, url);
  http.GET();
  http.end();
}

void displayLCD(float temp, int bpm, float weight, int spo2, String status) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:" + String(temp, 1) + "C B:" + String(bpm));
  lcd.setCursor(0, 1);
  lcd.print("W:" + String(weight, 1) + "kg S:" + String(spo2) + "%");
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("Status:");
  lcd.setCursor(0, 1); lcd.print(status);
  delay(2000);
}

// ─── GLOBALS ──────────────────────────────────────────
unsigned long lastSend = 0;
const long INTERVAL = 15000; // 15s

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER, OUTPUT);
  lcd.init(); lcd.backlight();
  dht.begin();

  scale.begin(HX711_DT, HX711_SCK);
  scale.set_scale(2280.f); // ← CALIBRATE THIS for your load cell
  scale.tare();
  hx711Connected = scale.is_ready();
  Serial.println(hx711Connected ? "HX711: OK" : "HX711: NOT CONNECTED");

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    lcd.print("MAX30102 FAIL"); delay(2000);
    max30102Connected = false;
  } else {
    max30102Connected = true;
    // Configure sensor with defaults — works well for finger readings
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
  }
  Serial.println(max30102Connected ? "MAX30102: OK" : "MAX30102: NOT CONNECTED");

  WiFi.begin(SSID, PASSWORD);
  lcd.print("Connecting WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    lcd.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    lcd.clear(); lcd.print("WiFi Connected!");
    Serial.println("WiFi: CONNECTED");
  } else {
    lcd.clear(); lcd.print("WiFi OFFLINE");
    Serial.println("WiFi: OFFLINE (continuing without network)");
  }
  delay(1000);
}

void loop() {
  // ── Read DHT11 Temperature ──────────────────────────────────────
  float temp = dht.readTemperature();
  if (isnan(temp)) temp = 0;
  Serial.print("Temp: "); Serial.print(temp); Serial.println(" C");

  // ── Read HX711 Weight ─────────────────────────────────────────
  float weight = hx711Connected ? scale.get_units(5) : 0;
  if (weight < 0) weight = 0;
  Serial.print("Weight: "); Serial.print(weight); Serial.println(" kg");

  // ── Read MAX30102 via SparkFun HeartRate helper ─────────────────
  long irValue  = 0;
  long redValue = 0;

  if (max30102Connected) {
    irValue  = particleSensor.getIR();
    redValue = particleSensor.getRed();

    // Beat detection using SparkFun heartRate.h
    if (checkForBeat(irValue)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      beatsPerMinute = 60 / (delta / 1000.0);

      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
        beatAvg /= RATE_SIZE;
      }
    }
  }

  int bpm  = (!max30102Connected || irValue < 50000) ? 0 : beatAvg;  // 0 if no finger or sensor absent
  int spo2 = max30102Connected ? estimateSpO2(irValue, redValue) : 0;
  Serial.print("BPM: "); Serial.println(bpm);
  Serial.print("SpO2: "); Serial.print(spo2); Serial.println("%");

  // ── Health Evaluation ─────────────────────────────
  String status = getStatus(temp, bpm, spo2);
  triggerBuzzer(status);
  displayLCD(temp, bpm, weight, spo2, status);

  // ── Upload to ThingSpeak every 15s ────────────────
  if (millis() - lastSend > INTERVAL) {
    sendToThingSpeak(temp, bpm, weight, spo2);
    lastSend = millis();
  }
}