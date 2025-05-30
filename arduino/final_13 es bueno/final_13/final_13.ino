#include <WiFi.h>
#include "AdafruitIO_WiFi.h"
#include "DHT.h"

// -------------------- CONFIGURACIÓN WIFI Y ADAFRUIT IO --------------------
#define WIFI_SSID       "POCO X3 Pro"
#define WIFI_PASS       "123456789"
#define AIO_USERNAME    "cmujanajinsoy"
#define AIO_KEY         "aio_kGak217ktHSukvE2Zey2l7QFdLZw"

AdafruitIO_WiFi io(AIO_USERNAME, AIO_KEY, WIFI_SSID, WIFI_PASS);

// ------------------------ SENSORES Y PINES ------------------------
#define DHTPIN1 2
#define DHTPIN2 4
#define DHTTYPE DHT22

DHT dht1(DHTPIN1, DHTTYPE);
DHT dht2(DHTPIN2, DHTTYPE);

#define YL69_1 35
#define YL69_2 34

#define NEBULIZADORES_PIN 13
#define VENTILADORES_PIN 12
#define EXTRACTOR_PIN     14

// ------------------------ FEEDS ------------------------
AdafruitIO_Feed *temp1 = io.feed("TEMPERATURA-1");
AdafruitIO_Feed *temp2 = io.feed("TEMPERATURA-2");
AdafruitIO_Feed *hum1 = io.feed("HUMEDAD-RELATIVA-1");
AdafruitIO_Feed *hum2 = io.feed("HUMEDAD-RELATIVA-2");
AdafruitIO_Feed *suelo1 = io.feed("HUMEDAD-DE-SUELO-1");
AdafruitIO_Feed *suelo2 = io.feed("HUMEDAD-DE-SUELO-2");

AdafruitIO_Feed *nebulizadores = io.feed("NEBULIZADORES");
AdafruitIO_Feed *ventiladores = io.feed("VENTILADORES");
AdafruitIO_Feed *extractor = io.feed("EXTRACTOR");

AdafruitIO_Feed *modo = io.feed("MODO");

// ------------------------ VARIABLES ------------------------
String modoActual = "AUTO"; // Modo inicial automático

// ------------------------ SETUP ------------------------
void setup() {
  Serial.begin(115200);
  dht1.begin();
  dht2.begin();

  pinMode(NEBULIZADORES_PIN, OUTPUT);
  pinMode(VENTILADORES_PIN, OUTPUT);
  pinMode(EXTRACTOR_PIN, OUTPUT);

  digitalWrite(NEBULIZADORES_PIN, LOW);
  digitalWrite(VENTILADORES_PIN, LOW);
  digitalWrite(EXTRACTOR_PIN, LOW);

  // Conectar a Adafruit IO
  io.connect();

  // Asociar función al feed de modo
  modo->onMessage(handleModo);

  io.run();
  modo->get();
}

// ------------------------ LOOP PRINCIPAL ------------------------
void loop() {
  io.run();

  // Verificar conexión con Adafruit IO
  if (io.status() != AIO_CONNECTED) {
    Serial.println("Conexión perdida con Adafruit IO. Reconectando...");
    io.connect();
  }

  // Lecturas de sensores
  float t1 = dht1.readTemperature();
  if (isnan(t1)) {
    Serial.println("Error al leer la temperatura del sensor 1.");
    return;
  }

  float t2 = dht2.readTemperature();
  if (isnan(t2)) {
    Serial.println("Error al leer la temperatura del sensor 2.");
    return;
  }

  float h1 = dht1.readHumidity();
  if (isnan(h1)) {
    Serial.println("Error al leer la humedad del sensor 1.");
    return;
  }

  float h2 = dht2.readHumidity();
  if (isnan(h2)) {
    Serial.println("Error al leer la humedad del sensor 2.");
    return;
  }

  int rawSoil1 = analogRead(YL69_1);
  int rawSoil2 = analogRead(YL69_2);
  float soil1_percent = map(rawSoil1, 4095, 1500, 0, 100);
  float soil2_percent = map(rawSoil2, 4095, 1500, 0, 100);

  // Guardar los datos en Adafruit IO
  temp1->save(t1);
  temp2->save(t2);
  hum1->save(h1);
  hum2->save(h2);
  suelo1->save(soil1_percent);
  suelo2->save(soil2_percent);

  // Mostrar datos en el monitor serie
  Serial.print("Modo: ");
  Serial.println(modoActual);
  Serial.print("Temperatura 1: ");
  Serial.print(t1);
  Serial.print(" °C, ");
  Serial.print("Temperatura 2: ");
  Serial.print(t2);
  Serial.print(" °C, ");
  Serial.print("Humedad 1: ");
  Serial.print(h1);
  Serial.print(" %, ");
  Serial.print("Humedad 2: ");
  Serial.print(h2);
  Serial.print(" %, ");
  Serial.print("Humedad de suelo 1: ");
  Serial.print(soil1_percent);
  Serial.print(" %, ");
  Serial.print("Humedad de suelo 2: ");
  Serial.println(soil2_percent);

  // Control automático o manual
  if (modoActual == "AUTO") {
    controlarActuadores(t1, t2, h1, h2, soil1_percent, soil2_percent);
  } else {
    aplicarControlManual();
  }

  delay(5000); // Reducción del intervalo de tiempo para actualizar más rápido
}

// ------------------------ CAMBIO DE MODO ------------------------
void handleModo(AdafruitIO_Data *data) {
  modoActual = data->toString();
  Serial.print("Modo cambiado a: ");
  Serial.println(modoActual);
}

// ------------------------ CONTROL AUTOMÁTICO ------------------------
void controlarActuadores(float t1, float t2, float h1, float h2, float s1, float s2) {
  bool activarNebulizadores = false;
  bool activarVentiladores = false;
  bool activarExtractor = false;

  float avgT = (t1 + t2) / 2;
  float avgH = (h1 + h2) / 2;
  float avgS = (s1 + s2) / 2;

  // Condiciones para controlar actuadores
  if (avgT > 30) activarVentiladores = true;
  if (avgT > 35 || avgT < 10) activarVentiladores = true;

  if (avgH > 85) {
    activarExtractor = true;
    activarVentiladores = true;
  } else if (avgH < 75) {
    activarNebulizadores = true;
  }

  // Ajuste de la humedad del suelo para activar los nebulizadores
  if (avgS < 20) {  // Si la humedad del suelo es menor al 20%, se encienden los nebulizadores
    activarNebulizadores = true;
  } else if (avgS > 60) {  // Si la humedad del suelo es mayor al 60%, se apagan los nebulizadores
    activarNebulizadores = false;
  }

  // Aplicar estados a los actuadores
  controlarActuador(NEBULIZADORES_PIN, activarNebulizadores, nebulizadores);
  controlarActuador(VENTILADORES_PIN, activarVentiladores, ventiladores);
  controlarActuador(EXTRACTOR_PIN, activarExtractor, extractor);
}

// ------------------------ CONTROL MANUAL ------------------------
void aplicarControlManual() {
  leerControl(nebulizadores, NEBULIZADORES_PIN);
  leerControl(ventiladores, VENTILADORES_PIN);
  leerControl(extractor, EXTRACTOR_PIN);
}

// ------------------------ FUNCIONES AUXILIARES ------------------------
void controlarActuador(int pin, bool estado, AdafruitIO_Feed *feed) {
  digitalWrite(pin, estado ? HIGH : LOW);
  feed->save(estado ? "ON" : "OFF");

  // Mostrar el estado del actuador en el monitor serie
  if (estado) {
    Serial.print("Actuador ");
    if (feed == nebulizadores) {
      Serial.print("NEBULIZADORES");
    } else if (feed == ventiladores) {
      Serial.print("VENTILADORES");
    } else if (feed == extractor) {
      Serial.print("EXTRACTOR");
    }
    Serial.println(" ENCENDIDO.");
  } else {
    Serial.print("Actuador ");
    if (feed == nebulizadores) {
      Serial.print("NEBULIZADORES");
    } else if (feed == ventiladores) {
      Serial.print("VENTILADORES");
    } else if (feed == extractor) {
      Serial.print("EXTRACTOR");
    }
    Serial.println(" APAGADO.");
  }
}

void leerControl(AdafruitIO_Feed *feed, int pin) {
  String valor = String(feed->get());
  if (valor == "ON") {
    digitalWrite(pin, HIGH);
  } else if (valor == "OFF") {
    digitalWrite(pin, LOW);
  }
}
