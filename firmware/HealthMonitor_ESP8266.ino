#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include "MAX30105.h"
#include "heartRate.h"

// ─── CONFIG ───────────────────────────────────────────
const char* SSID     = "";
const char* PASSWORD = "";
const char* TS_API   = "";
const char* TS_URL   = "http://api.thingspeak.com/update";

// ─── PINS ─────────────────────────────────────────────
#define DHT_PIN  0
#define DHT_TYPE DHT11
#define BUZZER   13

// ─── OBJECTS ──────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
MAX30105 particleSensor;
LiquidCrystal_I2C lcd(0x27, 16, 2);

bool max30102OK = false;

// ─── BPM ROLLING AVERAGE ──────────────────────────────
const byte RATE_SIZE = 6;
byte rates[RATE_SIZE] = {0};
byte rateSpot = 0;
long lastBeat = 0;
float beatAvg = 0;

// ─── GLOBALS ──────────────────────────────────────────
float currentTemp    = 0;
int   currentBpm     = 0;
int   currentSpo2    = 0;
int   currentNews2   = 0;
String currentStatus = "BOOT";
unsigned long lastSend = 0;
unsigned long lastRead = 0;
unsigned long lastLCD  = 0;
byte lcdPage = 0;

// ─── IR THRESHOLD (lowered for your sensor) ───────────
#define IR_THRESHOLD 50000

// ─── SPO2 ─────────────────────────────────────────────
int estimateSpO2(long ir, long red) {
  if (ir < IR_THRESHOLD) return 0;
  float ratio = (float)red / (float)ir;
  // Calibrated for typical MAX30102 modules
  int spo2 = constrain((int)(104.0 - 17.0 * ratio), 90, 100);
  return spo2;
}

// ─── NEWS2 ────────────────────────────────────────────
int calcNEWS2(float temp, int bpm, int spo2) {
  int score = 0;

  if      (temp <= 35.0) score += 3;
  else if (temp <= 36.0) score += 1;
  else if (temp <= 38.0) score += 0;
  else if (temp <= 39.0) score += 1;
  else                   score += 2;

  // Only score BPM if finger detected
  if (bpm > 0) {
    if      (bpm <= 40)  score += 3;
    else if (bpm <= 50)  score += 1;
    else if (bpm <= 90)  score += 0;
    else if (bpm <= 110) score += 1;
    else if (bpm <= 130) score += 2;
    else                 score += 3;
  }

  if (spo2 > 0) {
    if      (spo2 >= 96) score += 0;
    else if (spo2 >= 94) score += 1;
    else if (spo2 >= 92) score += 2;
    else                 score += 3;
  }

  return score;
}

String getStatus(int n) {
  if (n >= 7) return "CRITICAL";
  if (n >= 3) return "WARNING";
  return "NORMAL";
}

// ─── BUZZER ───────────────────────────────────────────
void triggerBuzzer(String s) {
  if (s == "CRITICAL") {
    for (int i = 0; i < 5; i++) {
      digitalWrite(BUZZER, HIGH); delay(200);
      digitalWrite(BUZZER, LOW);  delay(200);
    }
  } else if (s == "WARNING") {
    digitalWrite(BUZZER, HIGH); delay(600);
    digitalWrite(BUZZER, LOW);
  }
}

// ─── LCD ──────────────────────────────────────────────
// ─── LCD SAFE WRITE ───────────────────────────────────
void safeLCDWrite(int row, int col, String text) {
  Wire.beginTransmission(0x27);
  if (Wire.endTransmission() != 0) {
    // LCD not responding, reinit
    lcd.init();
    lcd.backlight();
    return;
  }
  lcd.setCursor(col, row);
  lcd.print(text);
}

void updateLCD() {
  // Check LCD alive before writing
  Wire.beginTransmission(0x27);
  byte error = Wire.endTransmission();
  if (error != 0) {
    lcd.init();
    lcd.backlight();
    delay(100);
    return;
  }

  lcd.clear();
  if (lcdPage == 0) {
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(currentTemp, 1);
    lcd.print("C");
    lcd.setCursor(9, 0);
    lcd.print("B:");
    lcd.print(currentBpm > 0 ? String(currentBpm) : "--");
    lcd.setCursor(0, 1);
    lcd.print(currentBpm == 0 ? "Place finger... " : "BPM OK!         ");
  } else {
    lcd.setCursor(0, 0);
    lcd.print("SpO2:");
    lcd.print(currentSpo2 > 0 ? String(currentSpo2) + "%" : "--  ");
    lcd.setCursor(9, 0);
    lcd.print("N2:");
    lcd.print(currentNews2);
    lcd.setCursor(0, 1);
    lcd.print(">> ");
    lcd.print(currentStatus);
    lcd.print("       ");
  }
  lcdPage = (lcdPage + 1) % 2;
}

// ─── THINGSPEAK ───────────────────────────────────────
void sendToThingSpeak() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, skip send");
    return;
  }
  if (millis() - lastSend > 15000) {
  lastSend = millis();
  // Only send if BPM has stabilized (buffer full)
  if (currentBpm == 0 || rateSpot == 0) return; // skip unstable reading
  sendToThingSpeak();
}
  WiFiClient client;
  HTTPClient http;
  String url = String(TS_URL) +
               "?api_key=" + TS_API +
               "&field1=" + String(currentTemp, 1) +
               "&field2=" + String(currentBpm) +
               "&field3=" + String(currentSpo2) +
               "&field4=" + String(currentNews2);
  http.begin(client, url);
  int code = http.GET();
  Serial.println("TS HTTP: " + String(code));
  http.end();
}

// ─── SETUP ────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  Wire.begin();

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("SmartVital AI");
  lcd.setCursor(0, 1); lcd.print("Booting...");
  delay(1500);

  // DHT
  dht.begin();
  delay(2000);

  // MAX30102
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x2F);  // brighter LED
    particleSensor.setPulseAmplitudeGreen(0);
    particleSensor.setPulseAmplitudeIR(0x2F);   // brighter IR
    max30102OK = true;
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("MAX30102  OK!");
    Serial.println("MAX30102 OK");
  } else {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("MAX30102 FAIL");
    lcd.setCursor(0, 1); lcd.print("Check SDA/SCL");
    Serial.println("MAX30102 FAILED");
  }
  delay(1500);

  // WiFi
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 1); lcd.print("Connected OK!");
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
  } else {
    lcd.setCursor(0, 1); lcd.print("Offline Mode");
    Serial.println("\nWiFi FAILED");
  }
  delay(1500);

  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("Place finger on");
  lcd.setCursor(0, 1); lcd.print("MAX30102 sensor");
  delay(2000);

  // Startup beep — double beep = ready
  digitalWrite(BUZZER, HIGH); delay(150); digitalWrite(BUZZER, LOW); delay(150);
  digitalWrite(BUZZER, HIGH); delay(150); digitalWrite(BUZZER, LOW);
}

// ─── LOOP ─────────────────────────────────────────────
void loop() {

  // ── MAX30102 runs every loop (non-blocking) ──
  if (max30102OK) {
    // Brief I2C pause between MAX30102 and LCD
    long ir  = particleSensor.getIR();
    long red = particleSensor.getRed();
    delayMicroseconds(100); // let bus settle

    if (checkForBeat(ir)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      float bpm = 60.0 / (delta / 1000.0);
      if (bpm > 20 && bpm < 200) {
        rates[rateSpot++] = (byte)bpm;
        rateSpot %= RATE_SIZE;
        float sum = 0;
        for (byte x = 0; x < RATE_SIZE; x++) sum += rates[x];
        beatAvg = sum / RATE_SIZE;
      }
    }

    currentBpm  = (ir < IR_THRESHOLD) ? 0 : (int)beatAvg;
    currentSpo2 = estimateSpO2(ir, red);
    delayMicroseconds(100); // let bus settle before LCD
  }

  // ── DHT + NEWS2 every 10s ──
  if (millis() - lastRead > 10000) {
    lastRead = millis();

    float temp = dht.readTemperature();
    if (!isnan(temp) && temp > 10) {
      currentTemp = temp + 6.5; // offset for body proximity
    }

    currentNews2  = calcNEWS2(currentTemp, currentBpm, currentSpo2);
    currentStatus = getStatus(currentNews2);

    Serial.println("─────────────────────");
    Serial.println("T    : " + String(currentTemp, 1) + "°C");
    Serial.println("BPM  : " + String(currentBpm));
    Serial.println("SpO2 : " + String(currentSpo2) + "%");
    Serial.println("NEWS2: " + String(currentNews2));
    Serial.println("→    : " + currentStatus);
    Serial.println("IR   : " + String(particleSensor.getIR()));

    triggerBuzzer(currentStatus);
  }

  // ── LCD every 3s ──
  if (millis() - lastLCD > 3000) {
    lastLCD = millis();
    updateLCD();
  }

  // ── ThingSpeak every 15s ──
  if (millis() - lastSend > 15000) {
    lastSend = millis();
    sendToThingSpeak();
  }
}