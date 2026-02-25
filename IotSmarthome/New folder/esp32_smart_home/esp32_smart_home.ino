/**
 * ESP32-S3 Smart Home System - FreeRTOS với Backend Integration
 * 
 * Tích hợp với Smart Home System Backend qua REST API
 * 
 * Flow kết nối:
 * 1. ESP32 khởi động và kết nối WiFi
 * 2. Nếu chưa có API Key -> Vào chế độ Setup (hiển thị serial number)
 * 3. User dùng App để pair ESP32 với Home
 * 4. ESP32 nhận được API Key -> Lưu vào flash
 * 5. Gửi heartbeat định kỳ với sensor data
 * 6. Nhận lệnh điều khiển từ backend
 * 
 * @version 2.0
 * @author Smart Home System Team
 */
// ============ INCLUDES ============
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <PubSubClient.h>  // MQTT Client library
// #include <esp_task_wdt.h>  // WATCHDOG DISABLED

// Include configuration file - all settings are defined here
#include "config.h"

// ============ WATCHDOG ============
// WATCHDOG DISABLED - Commented out for simplicity
// #define WDT_TIMEOUT_SECONDS 30

// ============ COMMAND RETRY ============
#define MAX_ACK_RETRIES 3
#define ACK_RETRY_DELAY_MS 2000
#define QUEUE_SIZE_ACK_RETRY 20

struct PendingAck {
  long commandId;
  uint8_t retryCount;
  unsigned long nextRetryTime;
};



// ============ SENSOR BUFFERING ============
#define SENSOR_BUFFER_SIZE 50

struct SensorDataPoint {
  float tempIn, humIn, tempOut, humOut;
  int gas, light, rain;
  bool flame, motion, door;
  unsigned long timestamp;
};

static SensorDataPoint sensorBuffer[SENSOR_BUFFER_SIZE];
static uint8_t sensorBufferHead = 0;
static uint8_t sensorBufferTail = 0;
static uint8_t sensorBufferCount = 0;

// ============ COMMAND DEDUPLICATION ============
struct ProcessedCommand {
  long commandId;
  unsigned long processedTime;
};

static ProcessedCommand processedCommands[MQTT_MAX_PROCESSED_COMMANDS];
static uint8_t processedCommandsHead = 0;
static uint8_t processedCommandsCount = 0;


// ============ HARDWARE INITIALIZATION ============
// Using PIN definitions from config.h
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
MFRC522 rfid(PIN_SS_RFID, PIN_RST_RFID);
DHT dhtIn(PIN_DHT_IN, DHT11);
DHT dhtOut(PIN_DHT_OUT, DHT11);
Servo doorServo;
WebServer server(80);
Preferences preferences;

// ============ MQTT CLIENT ============
WiFiClient espClient;
PubSubClient mqttClient(espClient);
volatile bool mqttConnected = false;
unsigned long lastMqttReconnectAttempt = 0;
unsigned long mqttRetryDelay = MQTT_RETRY_MIN_MS;  // Exponential backoff delay
unsigned long mqttDisconnectStartTime = 0;  // Track when disconnection started

// ============ BACKEND CONNECTION STATE ============
struct BackendConfig {
  String serialNumber;
  String apiKey;
  String deviceName;
  String serverIP;     // Backend & MQTT server IP (configured via WiFiManager)
  bool isPaired;
  long mcuGatewayId;
  long homeId;
} backendConfig;

// ============ FREERTOS HANDLES ============
TaskHandle_t taskHandleSensors = NULL;
TaskHandle_t taskHandleLCD = NULL;
TaskHandle_t taskHandleRFID = NULL;
TaskHandle_t taskHandleWeb = NULL;
TaskHandle_t taskHandleAutomation = NULL;
TaskHandle_t taskHandleEmergency = NULL;
TaskHandle_t taskHandleServo = NULL;
TaskHandle_t taskHandleBackend = NULL;  // Backend communication task (HTTP fallback)
TaskHandle_t taskHandleMQTT = NULL;     // MQTT communication task

// Semaphores for thread-safe access
SemaphoreHandle_t xSensorMutex = NULL;
SemaphoreHandle_t xConfigMutex = NULL;
SemaphoreHandle_t xLCDMutex = NULL;
SemaphoreHandle_t xBackendMutex = NULL;

// Queues for inter-task communication
QueueHandle_t xEmergencyQueue = NULL;
QueueHandle_t xDoorQueue = NULL;
QueueHandle_t xCommandQueue = NULL;

// ============ SYSTEM CONFIGURATION ============
// Using timing values from config.h

// RFID Card structure with extended info
struct RFIDCardInfo {
  byte uid[4];
  char name[32];
  bool enabled;
  unsigned long lastUsed;
};

RFIDCardInfo rfidCards[MAX_ALLOWED_RFID_CARDS];
uint8_t allowedCardsCount = 0;

// Legacy array for backward compatibility
byte allowedCards[MAX_ALLOWED_RFID_CARDS][4];

// RFID Learning state
volatile bool rfidLearningMode = false;
volatile bool rfidLearningComplete = false;
volatile bool rfidLearningSuccess = false;
String rfidLearningResult = "";

struct SystemConfig {
  int autoLightThreshold = DEFAULT_LIGHT_THRESHOLD;
  int autoFanThreshold = DEFAULT_TEMP_THRESHOLD;
  int gasAlertThreshold = DEFAULT_GAS_THRESHOLD;
  bool autoLightEnabled = true;
  bool autoFanEnabled = true;
  bool autoCloseDoor = true;
  String deviceName = DEVICE_NAME_DEFAULT;
} config;

struct SensorData {
  float tempIn = 0; float humIn = 0;
  float tempOut = 0; float humOut = 0;
  int mq2Value = 0; int ldrValue = 0;
  bool flameStatus = false;
  int servoAngle = 0;
  bool doorOpen = false;
  bool relayLightStatus = false;
  bool relayFanStatus = false;
  bool motionDetected = false;
  int rainValue = 4095;
  bool gasAlert = false;
  unsigned long lastMotionTime = 0;
} sensorData;

enum EmergencyType {
  EMERGENCY_NONE = 0,
  EMERGENCY_FIRE = 1,
  EMERGENCY_GAS = 2,
  EMERGENCY_BOTH = 3
};

struct EmergencyEvent {
  EmergencyType type;
  bool active;
};

/**
 * FIXED STRUCTURES - Tránh LoadStoreAlignmentCause
 *
 * Thay đổi chính:
 * 1. Loại bỏ String trong struct được truyền qua Queue
 * 2. Dùng fixed-size char array thay vì String
 * 3. Optimize string operations để tránh fragmentation
 */

// ============ FIXED COMMAND STRUCTURES ============

#define MAX_PAYLOAD_SIZE 256
#define MAX_DEVICE_CODE_SIZE 32

enum CommandType {
  CMD_NONE = 0,
  CMD_LIGHT_ON,
  CMD_LIGHT_OFF,
  CMD_FAN_ON,
  CMD_FAN_OFF,
  CMD_DOOR_OPEN,
  CMD_DOOR_CLOSE,
  CMD_SET_CONFIG
};

// FIXED: Struct an toàn cho Queue - không dùng String
struct DeviceCommand {
  CommandType type;
  char payload[MAX_PAYLOAD_SIZE];
  uint16_t payloadLength;

  DeviceCommand() : type(CMD_NONE), payloadLength(0) {
    memset(payload, 0, MAX_PAYLOAD_SIZE);
  }

  void setPayload(const char* str) {
    if (str == nullptr) {
      payloadLength = 0;
      payload[0] = '\0';
      return;
    }
    payloadLength = min((int)strlen(str), MAX_PAYLOAD_SIZE - 1);
    strncpy(payload, str, payloadLength);
    payload[payloadLength] = '\0';
  }
};

// FIXED: Backend command structure
struct BackendCommand {
  long id;
  char deviceCode[MAX_DEVICE_CODE_SIZE];
  int gpioPin;
  char command[32];
  char payload[MAX_PAYLOAD_SIZE];

  BackendCommand() : id(0), gpioPin(-1) {
    memset(deviceCode, 0, MAX_DEVICE_CODE_SIZE);
    memset(command, 0, 32);
    memset(payload, 0, MAX_PAYLOAD_SIZE);
  }
};

// ============ STRING OPTIMIZATION HELPERS ============

class StringBuffer {
private:
  static const int BUFFER_SIZE = 512;
  char buffer[BUFFER_SIZE];

public:
  StringBuffer() { clear(); }

  void clear() { buffer[0] = '\0'; }

  char* get() { return buffer; }
  const char* c_str() const { return buffer; }
  size_t capacity() const { return BUFFER_SIZE; }

  void append(const char* str) {
    size_t current = strlen(buffer);
    size_t available = BUFFER_SIZE - current - 1;
    if (available > 0) strncat(buffer, str, available);
  }

  void appendInt(int value) {
    char temp[16];
    snprintf(temp, sizeof(temp), "%d", value);
    append(temp);
  }

  void appendFloat(float value, int decimals = 2) {
    char temp[16];
    snprintf(temp, sizeof(temp), "%.*f", decimals, value);
    append(temp);
  }
};

volatile EmergencyType currentEmergency = EMERGENCY_NONE;
volatile bool systemActive = true;
volatile bool backendConnected = false;
volatile unsigned long lastHeartbeat = 0;
volatile bool triggerHeartbeatFlag = false;  // Flag to trigger immediate heartbeat

// ============ MANUAL OVERRIDE STATE ============
// Time-based priority system: manual/RFID actions take precedence over auto mode
volatile unsigned long lastManualLightAction = 0;   // Last manual light control time
volatile unsigned long lastManualFanAction = 0;     // Last manual fan control time  
volatile unsigned long lastUserDoorAction = 0;      // Last user door action (RFID/manual)
volatile unsigned long rainStartTime = 0;           // When persistent rain started
volatile bool triggerSyncFlag = false;              // Flag to trigger full state sync
volatile bool mqttNeedsReconnect = false;           // Flag: reconnect MQTT (after pairing)

// Pending pairing credentials (set in callback, processed in taskMQTT)
struct PendingPairing {
  char apiKey[128];
  long mcuGatewayId;
  long homeId;
  volatile bool pending;
} pendingPairing = {"", 0, 0, false};

// ============ SERVO CONTROL ============
struct ServoCommand {
  int targetAngle;
  bool execute;
};

int currentServoAngle = 0;
int targetServoAngle = 0;

// ============ FUNCTION DECLARATIONS ============
void loadBackendConfig();
void saveBackendConfig();
String getSerialNumber();
bool initPairing();
bool sendHeartbeat();
void processBackendCommand(const char* commandJson);
String buildSensorDataJson();
void saveRFIDCards();
void reportRFIDAccess(const char* uid, bool authorized, const char* cardName, const char* status);
// pollCommands() and acknowledgeCommand() removed - MQTT-only mode


// MQTT Functions
void setupMQTT();
bool mqttConnect();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void mqttPublishSensorData();
void mqttPublishStatus(const char* status);
void mqttPublishDeviceStatus(int gpioPin, const char* deviceCode, const char* status, const char* stateValue);
void mqttPublishCommandAck(long commandId, bool success);
void mqttPublishRFIDAccess(const char* uid, bool authorized, const char* cardName, const char* status);
void mqttPublishRFIDLearnStatus();
void mqttPublishRFIDLearnStatusWithRequestId(const char* requestId);
void mqttPublishRFIDCardsList(const char* requestId);
void mqttPublishGPIOAvailable(const char* requestId);
void processMqttCommand(const char* payload);
void processPairingMessage(const char* payload);
void processMqttRFIDCommand(const char* payload);
void taskMQTT(void *pvParameters);
void syncAllDeviceStates();  // Sync all device states to MQTT

// ============ UTILITY FUNCTIONS ============
String getSerialNumber() {
  uint64_t chipId = ESP.getEfuseMac();
  char serialBuf[17];
  snprintf(serialBuf, sizeof(serialBuf), "%04X%08X",
           (uint16_t)(chipId >> 32), (uint32_t)chipId);
  return String(serialBuf);
}

void loadBackendConfig() {
  backendConfig.serialNumber = getSerialNumber();
  backendConfig.apiKey = preferences.getString("api_key", "");
  backendConfig.deviceName = preferences.getString("dev_name", "Smart Home ESP32");
  backendConfig.serverIP = preferences.getString("server_ip", BACKEND_HOST);  // Fallback to config.h default
  backendConfig.isPaired = preferences.getBool("is_paired", false);
  backendConfig.mcuGatewayId = preferences.getLong("mcu_id", 0);
  backendConfig.homeId = preferences.getLong("home_id", 0);
  
  Serial.println("[CONFIG] Backend config loaded");
  Serial.println("  Serial: " + backendConfig.serialNumber);
  Serial.println("  Server IP: " + backendConfig.serverIP);
  Serial.println("  Paired: " + String(backendConfig.isPaired ? "Yes" : "No"));
}

void saveBackendConfig() {
  if (xSemaphoreTake(xBackendMutex, portMAX_DELAY) == pdTRUE) {
    preferences.putString("api_key", backendConfig.apiKey);
    preferences.putString("dev_name", backendConfig.deviceName);
    preferences.putString("server_ip", backendConfig.serverIP);
    preferences.putBool("is_paired", backendConfig.isPaired);
    preferences.putLong("mcu_id", backendConfig.mcuGatewayId);
    preferences.putLong("home_id", backendConfig.homeId);
    xSemaphoreGive(xBackendMutex);
  }
  Serial.println("[CONFIG] Backend config saved");
}

// ============ BACKEND COMMUNICATION ============
String buildSensorDataJson() {
  StaticJsonDocument<768> doc;  // Increased size for automation config
  
  if (xSemaphoreTake(xSensorMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    doc["tempIn"] = sensorData.tempIn;
    doc["humIn"] = sensorData.humIn;
    doc["tempOut"] = sensorData.tempOut;
    doc["humOut"] = sensorData.humOut;
    doc["gas"] = sensorData.mq2Value;
    doc["light"] = sensorData.ldrValue;
    doc["rain"] = sensorData.rainValue;
    doc["flame"] = (currentEmergency & EMERGENCY_FIRE) ? true : false;
    doc["motion"] = sensorData.motionDetected;
    doc["door"] = sensorData.doorOpen;
    doc["lightStatus"] = sensorData.relayLightStatus;
    doc["fanStatus"] = sensorData.relayFanStatus;
    doc["gasAlert"] = sensorData.gasAlert;
    xSemaphoreGive(xSensorMutex);
  }
  
  doc["emergency"] = (currentEmergency != EMERGENCY_NONE);
  doc["emergencyFire"] = (currentEmergency & EMERGENCY_FIRE) ? true : false;
  doc["emergencyGas"] = (currentEmergency & EMERGENCY_GAS) ? true : false;
  
  // Add automation config for frontend sync
  if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    doc["autoLight"] = config.autoLightEnabled;
    doc["autoFan"] = config.autoFanEnabled;
    doc["autoCloseDoor"] = config.autoCloseDoor;
    doc["autoLightThreshold"] = config.autoLightThreshold;
    doc["autoFanThreshold"] = config.autoFanThreshold;
    doc["gasAlertThreshold"] = config.gasAlertThreshold;
    xSemaphoreGive(xConfigMutex);
  }

  String output;
  output.reserve(500);
  serializeJson(doc, output);
  return output;
}

/**
 * Lightweight Heartbeat (MQTT-Only Mode)
 * Only sends metadata to keep connection alive, sensor data sent separately via MQTT
 */
bool sendHeartbeat() {
  if (!backendConfig.isPaired || backendConfig.apiKey.isEmpty()) {
    return false;
  }

  // Use MQTT if connected (primary method)
  if (mqttConnected) {
    StaticJsonDocument<256> doc;
    doc["serialNumber"] = backendConfig.serialNumber.c_str();
    doc["ipAddress"] = WiFi.localIP().toString();
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["timestamp"] = millis();
    doc["uptime"] = millis();
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["mqttConnected"] = true;

    char topic[64];
    snprintf(topic, sizeof(topic), MQTT_TOPIC_STATUS, backendConfig.homeId);

    char payload[384];
    size_t len = serializeJson(doc, payload, sizeof(payload));
    if (mqttClient.publish(topic, (uint8_t*)payload, len, true)) {
      lastHeartbeat = millis();
      backendConnected = true;
      Serial.println("[HEARTBEAT] MQTT heartbeat sent");
      return true;
    }
  }

  Serial.println("[HEARTBEAT] MQTT not connected, skipping heartbeat");
  backendConnected = false;
  return false;
}

/**
 * FIXED: reportRFIDAccess - Optimize string operations
 */
void reportRFIDAccess(const char* uid, bool authorized, const char* cardName, const char* status) {
  if (!backendConfig.isPaired) return;

  if (mqttConnected) {
    mqttPublishRFIDAccess(uid, authorized, cardName, status);
    return;
  }

  Serial.println("[RFID] MQTT disconnected - cannot report access");
}

/**
 * FIXED: processBackendCommand - Không dùng String trong Queue
 */
void processBackendCommand(const char* commandJson) {
  Serial.print("[CMD] Received: ");
  Serial.println(commandJson);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, commandJson);
  if (error) {
    Serial.println("[CMD] JSON parse error");
    return;
  }

  const char* type = doc["type"] | "";
  const char* deviceCode = doc["deviceCode"] | "";
  const char* action = doc["action"] | "";

  DeviceCommand cmd;
  cmd.setPayload(commandJson);

  if (strcmp(type, "LIGHT") == 0 || strncmp(deviceCode, "LIGHT", 5) == 0) {
    if (strcmp(action, "ON") == 0 || strcmp(action, "TURN_ON") == 0) {
      cmd.type = CMD_LIGHT_ON;
    } else {
      cmd.type = CMD_LIGHT_OFF;
    }
  } else if (strcmp(type, "FAN") == 0 || strncmp(deviceCode, "FAN", 3) == 0) {
    if (strcmp(action, "ON") == 0 || strcmp(action, "TURN_ON") == 0) {
      cmd.type = CMD_FAN_ON;
    } else {
      cmd.type = CMD_FAN_OFF;
    }
  } else if (strcmp(type, "DOOR") == 0 || strncmp(deviceCode, "DOOR", 4) == 0) {
    if (strcmp(action, "OPEN") == 0) {
      cmd.type = CMD_DOOR_OPEN;
    } else {
      cmd.type = CMD_DOOR_CLOSE;
    }
  }

  xQueueSend(xCommandQueue, &cmd, 0);
}

/**
 * HTTP-based acknowledge (deprecated - MQTT-only mode)
 * Kept for potential fallback/retry scenarios
 */


/**
 * Command Retry: retry ack until success or MAX_ACK_RETRIES.
 */


/**
 * FIXED: executeBackendCommand - Dùng char* thay vì String
 */
void executeBackendCommand(BackendCommand& cmd) {
  DeviceCommand deviceCmd;
  deviceCmd.setPayload(cmd.payload);

  for (int i = 0; cmd.deviceCode[i]; i++) {
    cmd.deviceCode[i] = toupper(cmd.deviceCode[i]);
  }
  for (int i = 0; cmd.command[i]; i++) {
    cmd.command[i] = toupper(cmd.command[i]);
  }

  bool isLight = strstr(cmd.deviceCode, "LIGHT") != nullptr ||
                 strstr(cmd.deviceCode, "L_") != nullptr ||
                 cmd.gpioPin == PIN_RELAY_LIGHT;
  bool isFan = strstr(cmd.deviceCode, "FAN") != nullptr ||
               strstr(cmd.deviceCode, "F_") != nullptr ||
               cmd.gpioPin == PIN_RELAY_FAN;
  bool isDoor = strstr(cmd.deviceCode, "DOOR") != nullptr ||
                strstr(cmd.deviceCode, "SERVO") != nullptr ||
                cmd.gpioPin == PIN_SERVO;

  if (isLight) {
    if (strcmp(cmd.command, "TURN_ON") == 0 || strcmp(cmd.command, "ON") == 0) {
      deviceCmd.type = CMD_LIGHT_ON;
    } else if (strcmp(cmd.command, "TURN_OFF") == 0 || strcmp(cmd.command, "OFF") == 0) {
      deviceCmd.type = CMD_LIGHT_OFF;
    } else if (strcmp(cmd.command, "TOGGLE") == 0) {
      deviceCmd.type = sensorData.relayLightStatus ? CMD_LIGHT_OFF : CMD_LIGHT_ON;
    }
  } else if (isFan) {
    if (strcmp(cmd.command, "TURN_ON") == 0 || strcmp(cmd.command, "ON") == 0) {
      deviceCmd.type = CMD_FAN_ON;
    } else if (strcmp(cmd.command, "TURN_OFF") == 0 || strcmp(cmd.command, "OFF") == 0) {
      deviceCmd.type = CMD_FAN_OFF;
    } else if (strcmp(cmd.command, "TOGGLE") == 0) {
      deviceCmd.type = sensorData.relayFanStatus ? CMD_FAN_OFF : CMD_FAN_ON;
    }
  } else if (isDoor) {
    if (strcmp(cmd.command, "TURN_ON") == 0 || strcmp(cmd.command, "ON") == 0 ||
        strcmp(cmd.command, "OPEN") == 0) {
      deviceCmd.type = CMD_DOOR_OPEN;
    } else if (strcmp(cmd.command, "TURN_OFF") == 0 || strcmp(cmd.command, "OFF") == 0 ||
               strcmp(cmd.command, "CLOSE") == 0) {
      deviceCmd.type = CMD_DOOR_CLOSE;
    } else if (strcmp(cmd.command, "TOGGLE") == 0) {
      deviceCmd.type = sensorData.doorOpen ? CMD_DOOR_CLOSE : CMD_DOOR_OPEN;
    }
  } else {
    Serial.print("[CMD] Unknown device type: ");
    Serial.println(cmd.deviceCode);
    return;
  }

  Serial.printf("[CMD] executeBackendCommand: deviceCode=%s, command=%s, gpioPin=%d, cmdType=%d\n",
                cmd.deviceCode, cmd.command, cmd.gpioPin, deviceCmd.type);
  
  xQueueSend(xCommandQueue, &deviceCmd, 0);
  Serial.print("[CMD] Queued command type: ");
  Serial.println(deviceCmd.type);
}

// ============ MQTT IMPLEMENTATION ============

/**
 * Setup MQTT client with broker connection
 */
void setupMQTT() {
  // Use dynamic server IP from WiFiManager config (stored in Preferences)
  // Falls back to MQTT_BROKER_HOST from config.h if not configured
  const char* brokerHost = backendConfig.serverIP.c_str();
  mqttClient.setServer(brokerHost, MQTT_BROKER_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(MQTT_KEEPALIVE_SECONDS);
  mqttClient.setBufferSize(1024);  // Increase buffer for larger messages
  Serial.println("[MQTT] Setup complete - Broker: " + backendConfig.serverIP + ":" + String(MQTT_BROKER_PORT));
}

/**
 * Connect to MQTT broker with retry logic
 */
/**
 * MQTT Connect with Exponential Backoff
 * Retry delay increases exponentially: 5s -> 10s -> 20s -> ... -> max 5min
 */
bool mqttConnect() {
  String clientId;
  char lwtTopic[64];
  bool isPairingMode = !backendConfig.isPaired || backendConfig.homeId <= 0;

  if (isPairingMode) {
    // Pairing mode: connect to receive credentials via smarthome/pairing/{serialNumber}
    clientId = "ESP32-pairing-" + backendConfig.serialNumber;
    snprintf(lwtTopic, sizeof(lwtTopic), "smarthome/pairing/%s/status", backendConfig.serialNumber.c_str());
  } else {
    clientId = "ESP32-" + backendConfig.serialNumber;
    snprintf(lwtTopic, sizeof(lwtTopic), MQTT_TOPIC_STATUS, backendConfig.homeId);
  }

  Serial.print("[MQTT] Connecting (retry delay: ");
  Serial.print(mqttRetryDelay);
  Serial.println("ms)...");

  bool connected;
  if (strlen(MQTT_USERNAME) > 0) {
    connected = mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD,
                                   lwtTopic, MQTT_QOS, true, "offline");
  } else {
    connected = mqttClient.connect(clientId.c_str(), lwtTopic, MQTT_QOS, true, "offline");
  }

  if (connected) {
    Serial.println("[MQTT] Connected successfully!");
    mqttConnected = true;
    mqttRetryDelay = MQTT_RETRY_MIN_MS;  // Reset on success
    mqttDisconnectStartTime = 0;  // Clear disconnect time

    if (isPairingMode) {
      // Subscribe to pairing topic to receive API key
      char pairTopic[80];
      snprintf(pairTopic, sizeof(pairTopic), MQTT_TOPIC_PAIRING, backendConfig.serialNumber.c_str());
      mqttClient.subscribe(pairTopic, MQTT_QOS);
      Serial.print("[MQTT] Pairing mode - Subscribed to: ");
      Serial.println(pairTopic);
    } else {
      char cmdTopic[64];
      char rfidCmdTopic[64];
      snprintf(cmdTopic, sizeof(cmdTopic), MQTT_TOPIC_COMMANDS, backendConfig.homeId);
      snprintf(rfidCmdTopic, sizeof(rfidCmdTopic), MQTT_TOPIC_RFID_COMMANDS, backendConfig.homeId);

      mqttClient.subscribe(cmdTopic, MQTT_QOS);
      mqttClient.subscribe(rfidCmdTopic, MQTT_QOS);

      Serial.print("[MQTT] Subscribed to: ");
      Serial.println(cmdTopic);
      Serial.print("[MQTT] Subscribed to: ");
      Serial.println(rfidCmdTopic);

      mqttPublishStatus("online");
    }
    return true;
  } else {
    Serial.print("[MQTT] Connection failed, rc=");
    Serial.println(mqttClient.state());
    mqttConnected = false;

    // Exponential backoff: increase delay, cap at max
    mqttRetryDelay *= MQTT_RETRY_MULTIPLIER;
    if (mqttRetryDelay > MQTT_RETRY_MAX_MS) {
      mqttRetryDelay = MQTT_RETRY_MAX_MS;
    }
    
    Serial.print("[MQTT] Next retry in ");
    Serial.print(mqttRetryDelay / 1000);
    Serial.println(" seconds");
    
    return false;
  }
}

/**
 * FIXED: MQTT Callback - Optimize string handling
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[512];
  size_t copyLen = min(length, (unsigned int)(sizeof(message) - 1));
  memcpy(message, payload, copyLen);
  message[copyLen] = '\0';

  Serial.print("[MQTT] Received on ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(message);

  // Pairing topic: smarthome/pairing/{serialNumber}
  if (strstr(topic, "smarthome/pairing/") != nullptr && strstr(topic, "/commands") == nullptr) {
    processPairingMessage(message);
    return;
  }
  if (strstr(topic, "/commands") != nullptr && strstr(topic, "/rfid") == nullptr) {
    processMqttCommand(message);
  } else if (strstr(topic, "/rfid/commands") != nullptr) {
    processMqttRFIDCommand(message);
  }
}

/**
 * Handle pairing credentials from MQTT (replaces HTTP /api/backend/pair)
 */
void processPairingMessage(const char* payload) {
  // Bỏ qua message rỗng (từ clear retained)
  if (payload == nullptr || strlen(payload) == 0 || strcmp(payload, "") == 0) {
    Serial.println("[MQTT] Pairing: Empty message (cleared retained), ignoring");
    return;
  }

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.print("[MQTT] Pairing: JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }
  const char* type = doc["type"] | "";
  if (strcmp(type, "PAIRING_CREDENTIALS") != 0) {
    Serial.print("[MQTT] Pairing: Unknown type '");
    Serial.print(type);
    Serial.println("', ignoring");
    return;
  }

  const char* apiKey = doc["apiKey"] | "";
  long mcuGatewayId = doc["mcuGatewayId"] | 0;
  long homeId = doc["homeId"] | 0;

  Serial.printf("[MQTT] Pairing: Parsed credentials - mcuId=%ld, homeId=%ld, apiKey=%s\n",
                mcuGatewayId, homeId, strlen(apiKey) > 0 ? "(present)" : "(empty)");

  if (strlen(apiKey) == 0 || mcuGatewayId <= 0 || homeId <= 0) {
    Serial.println("[MQTT] Pairing: Invalid credentials");
    return;
  }

  // Skip nếu đã paired với cùng credentials (tránh loop)
  if (backendConfig.isPaired && 
      backendConfig.mcuGatewayId == mcuGatewayId && 
      backendConfig.homeId == homeId) {
    Serial.println("[MQTT] Pairing: Already paired with same credentials, skipping");
    return;
  }

  // KHÔNG làm blocking operations trong callback!
  // Lưu vào pending struct, taskMQTT sẽ xử lý bên ngoài
  strncpy(pendingPairing.apiKey, apiKey, sizeof(pendingPairing.apiKey) - 1);
  pendingPairing.apiKey[sizeof(pendingPairing.apiKey) - 1] = '\0';
  pendingPairing.mcuGatewayId = mcuGatewayId;
  pendingPairing.homeId = homeId;
  pendingPairing.pending = true;

  Serial.println("[MQTT] Pairing credentials queued, taskMQTT will process");
}

/**
 * Check if command ID was already processed (deduplication)
 */
static bool isCommandProcessed(long commandId) {
  if (commandId <= 0) return false;
  for (uint8_t i = 0; i < processedCommandsCount; i++) {
    if (processedCommands[i].commandId == commandId) {
      return true;
    }
  }
  return false;
}

/**
 * Add command ID to processed list (circular buffer)
 */
static void addProcessedCommand(long commandId) {
  if (commandId <= 0) return;
  if (processedCommandsCount >= MQTT_MAX_PROCESSED_COMMANDS) {
    processedCommandsHead = (processedCommandsHead + 1) % MQTT_MAX_PROCESSED_COMMANDS;
  } else {
    processedCommandsCount++;
  }
  uint8_t idx = (processedCommandsHead + processedCommandsCount - 1) % MQTT_MAX_PROCESSED_COMMANDS;
  processedCommands[idx].commandId = commandId;
  processedCommands[idx].processedTime = millis();
}

/**
 * MQTT Command Processing with Validation & Deduplication
 */
void processMqttCommand(const char* payload) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print("[MQTT] JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  const char* type = doc["type"] | "";
  
  // Parse command ID - handle large timestamp values (int64_t)
  // ESP32 long is 32-bit, but timestamp is 64-bit, so we need to handle it properly
  int64_t commandId64 = 0;
  long commandId = 0;
  
  if (doc.containsKey("id")) {
    // Try to parse as int64_t first (for large timestamps)
    if (doc["id"].is<int64_t>()) {
      commandId64 = doc["id"].as<int64_t>();
      commandId = (long)(commandId64 & 0x7FFFFFFF); // Use lower 31 bits to ensure positive
    } else if (doc["id"].is<unsigned long long>()) {
      commandId64 = (int64_t)doc["id"].as<unsigned long long>();
      commandId = (long)(commandId64 & 0x7FFFFFFF);
    } else if (doc["id"].is<long>()) {
      commandId = doc["id"].as<long>();
    } else {
      // Try parsing as string (fallback)
      const char* idStr = doc["id"] | "";
      if (strlen(idStr) > 0) {
        commandId64 = atoll(idStr);
        commandId = (long)(commandId64 & 0x7FFFFFFF);
      }
    }
  }

  // Validation: require type and action for DEVICE_CONTROL
  if (strcmp(type, "DEVICE_CONTROL") == 0) {
    const char* action = doc["action"] | "";
    const char* deviceCode = doc["deviceCode"] | "";
    
    if (strlen(action) == 0 || strlen(deviceCode) == 0) {
      Serial.println("[MQTT] Invalid command: missing action or deviceCode");
      return;
    }
    
    // Generate deduplication ID from payload hash (simple hash of deviceCode + action + timestamp)
    // This avoids needing a unique ID from backend
    long idForDedup = 0;
    if (commandId64 > 0) {
      // Use provided ID if available
      idForDedup = (long)(commandId64 & 0x7FFFFFFF);
    } else if (commandId > 0) {
      // Use 32-bit ID if available
      idForDedup = commandId;
    } else {
      // Generate hash from payload for deduplication
      unsigned long hash = 5381;
      const char* str = payload;
      while (*str) {
        hash = ((hash << 5) + hash) + *str++; // hash * 33 + c
      }
      idForDedup = (long)(hash & 0x7FFFFFFF);
    }

    // Deduplication check (use the deduplication ID)
    if (isCommandProcessed(idForDedup)) {
      Serial.print("[MQTT] Command ");
      Serial.print(idForDedup);
      Serial.println(" already processed, skipping");
      return;
    }

    BackendCommand cmd;
    cmd.id = idForDedup;  // Store the deduplication ID
    // deviceCode and action already declared above (lines 865-866)
    strncpy(cmd.deviceCode, deviceCode, MAX_DEVICE_CODE_SIZE - 1);
    cmd.deviceCode[MAX_DEVICE_CODE_SIZE - 1] = '\0';
    strncpy(cmd.command, action, 31);
    cmd.command[31] = '\0';
    size_t plen = min(strlen(payload), (size_t)(MAX_PAYLOAD_SIZE - 1));
    memcpy(cmd.payload, payload, plen);
    cmd.payload[plen] = '\0';
    cmd.gpioPin = doc["gpioPin"] | -1;

    Serial.print("[MQTT] Processing command ");
    Serial.print(idForDedup);
    Serial.print(" (original: ");
    Serial.print(commandId64);
    Serial.print("): ");
    Serial.print(cmd.deviceCode);
    Serial.print(" -> ");
    Serial.println(cmd.command);

    executeBackendCommand(cmd);
    addProcessedCommand(idForDedup);
    mqttPublishCommandAck(idForDedup, true);
  } else if (strcmp(type, "REQUEST_SENSOR_DATA") == 0) {
    mqttPublishSensorData();
  } else if (strcmp(type, "REQUEST_GPIO_AVAILABLE") == 0) {
    const char* reqId = doc["requestId"] | "";
    mqttPublishGPIOAvailable(strlen(reqId) > 0 ? reqId : nullptr);
  } else if (strcmp(type, "AUTOMATION_CONTROL") == 0) {
    // Handle automation toggle from frontend
    const char* automationType = doc["automationType"] | "";
    bool enabled = doc["enabled"] | false;
    
    Serial.printf("[MQTT] AUTOMATION_CONTROL: type=%s, enabled=%d\n", automationType, enabled);
    
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      if (strcmp(automationType, "AUTO_LIGHT") == 0) {
        config.autoLightEnabled = enabled;
        if (!enabled && sensorData.relayLightStatus) {
          // Turn off light when disabling auto mode
          DeviceCommand cmd;
          cmd.type = CMD_LIGHT_OFF;
          xQueueSend(xCommandQueue, &cmd, 0);
          Serial.println("[CONFIG] Auto Light disabled via MQTT, queuing LIGHT OFF");
        }
      } else if (strcmp(automationType, "AUTO_FAN") == 0) {
        config.autoFanEnabled = enabled;
        if (!enabled && sensorData.relayFanStatus) {
          DeviceCommand cmd;
          cmd.type = CMD_FAN_OFF;
          xQueueSend(xCommandQueue, &cmd, 0);
          Serial.println("[CONFIG] Auto Fan disabled via MQTT, queuing FAN OFF");
        }
      } else if (strcmp(automationType, "AUTO_CLOSE_DOOR") == 0) {
        config.autoCloseDoor = enabled;
      }
      
      saveConfiguration();
      xSemaphoreGive(xConfigMutex);
      
      // Sync new config back to backend immediately
      triggerSyncFlag = true;
      mqttPublishSensorData();  // Send updated config in sensor data
      Serial.println("[MQTT] Automation config updated and synced");
    }
  } else if (strcmp(type, "AUTOMATION_CONFIG") == 0) {
    // Backend sends: lightThreshold, tempThreshold, gasThreshold (-1 = skip)
    Serial.println("[MQTT] AUTOMATION_CONFIG received");
    
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      int v;
      if (doc.containsKey("lightThreshold")) {
        v = doc["lightThreshold"].as<int>();
        if (v >= 0) {
          config.autoLightThreshold = v;
          Serial.printf("[CONFIG] Light threshold set to: %d\n", config.autoLightThreshold);
        }
      }
      if (doc.containsKey("tempThreshold")) {
        v = doc["tempThreshold"].as<int>();
        if (v >= 0) {
          config.autoFanThreshold = v;
          Serial.printf("[CONFIG] Fan (temp) threshold set to: %d\n", config.autoFanThreshold);
        }
      }
      if (doc.containsKey("gasThreshold")) {
        v = doc["gasThreshold"].as<int>();
        if (v >= 0) {
          config.gasAlertThreshold = v;
          Serial.printf("[CONFIG] Gas threshold set to: %d\n", config.gasAlertThreshold);
        }
      }
      
      saveConfiguration();
      xSemaphoreGive(xConfigMutex);
      
      triggerSyncFlag = true;
      mqttPublishSensorData();
      Serial.println("[MQTT] Thresholds config updated and synced");
    }
  } else if (strcmp(type, "SET_AUTOMATION_CONFIG") == 0) {
    // Alternate format: autoLightThreshold, autoFanThreshold, gasAlertThreshold
    Serial.println("[MQTT] SET_AUTOMATION_CONFIG received");
    
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      if (doc.containsKey("autoLightThreshold")) {
        config.autoLightThreshold = doc["autoLightThreshold"].as<int>();
        Serial.printf("[CONFIG] Light threshold set to: %d\n", config.autoLightThreshold);
      }
      if (doc.containsKey("autoFanThreshold")) {
        config.autoFanThreshold = doc["autoFanThreshold"].as<int>();
        Serial.printf("[CONFIG] Fan threshold set to: %d\n", config.autoFanThreshold);
      }
      if (doc.containsKey("gasAlertThreshold")) {
        config.gasAlertThreshold = doc["gasAlertThreshold"].as<int>();
        Serial.printf("[CONFIG] Gas threshold set to: %d\n", config.gasAlertThreshold);
      }
      
      saveConfiguration();
      xSemaphoreGive(xConfigMutex);
      
      triggerSyncFlag = true;
      mqttPublishSensorData();
      Serial.println("[MQTT] Thresholds config updated and synced");
    }
  } else if (strcmp(type, "FORCE_UNPAIR") == 0) {
    // Backend đã xóa MCU này → ESP32 cần xóa dữ liệu pairing và restart về pairing mode
    const char* reason = doc["reason"] | "Unknown reason";
    Serial.println("[MQTT] *** FORCE_UNPAIR received from backend! ***");
    Serial.print("[MQTT] Reason: ");
    Serial.println(reason);
    Serial.println("[MQTT] Clearing pairing data from flash...");

    // Disconnect MQTT trước
    mqttClient.disconnect();

    // Xóa toàn bộ pairing data trong flash (preferences)
    if (xSemaphoreTake(xBackendMutex, pdMS_TO_TICKS(3000)) == pdTRUE) {
      backendConfig.isPaired = false;
      backendConfig.apiKey = "";
      backendConfig.mcuGatewayId = 0;
      backendConfig.homeId = 0;

      preferences.putBool("is_paired", false);
      preferences.putString("api_key", "");
      preferences.putLong("mcu_id", 0);
      preferences.putLong("home_id", 0);

      xSemaphoreGive(xBackendMutex);
    }

    Serial.println("[MQTT] Pairing data cleared. Restarting into pairing mode in 2s...");
    delay(2000);
    ESP.restart();
  }
}

/**
 * Process RFID-specific command from MQTT
 */
void processMqttRFIDCommand(const char* payload) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.println("[MQTT] RFID JSON parse error: " + String(error.c_str()));
    return;
  }
  
  String type = doc["type"] | "";
  
  if (type == "RFID_LEARN_START") {
    // Start learning mode
    if (allowedCardsCount < MAX_ALLOWED_RFID_CARDS && !rfidLearningMode) {
      rfidLearningMode = true;
      rfidLearningComplete = false;
      rfidLearningSuccess = false;
      String defaultCardName = "Card #" + String(allowedCardsCount + 1);
      rfidLearningResult = doc["cardName"] | defaultCardName;
      xTaskCreate(taskLearnRFID, "LearnRFID", STACK_SIZE_LEARN_RFID, NULL, 1, NULL);
      Serial.println("[MQTT] RFID learning started");
    }
  } else if (type == "RFID_CLEAR_ALL") {
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      allowedCardsCount = 0;
      preferences.putUInt("card_count", 0);
      xSemaphoreGive(xConfigMutex);
    }
    Serial.println("[MQTT] All RFID cards cleared");
    mqttPublishRFIDCardsList(nullptr);
  } else if (type == "RFID_DELETE_CARD") {
    int index = doc["cardIndex"] | -1;
    if (index >= 0 && index < allowedCardsCount) {
      if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        for (int i = index; i < allowedCardsCount - 1; i++) {
          memcpy(&rfidCards[i], &rfidCards[i + 1], sizeof(RFIDCardInfo));
        }
        allowedCardsCount--;
        saveRFIDCards();
        xSemaphoreGive(xConfigMutex);
      }
      Serial.println("[MQTT] RFID card deleted at index: " + String(index));
      mqttPublishRFIDCardsList(nullptr);
    }
  } else if (type == "RFID_UPDATE_CARD") {
    int index = doc["cardIndex"] | -1;
    if (index >= 0 && index < allowedCardsCount) {
      if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        if (doc.containsKey("name")) {
          String name = doc["name"].as<String>();
          strncpy(rfidCards[index].name, name.c_str(), sizeof(rfidCards[index].name) - 1);
        }
        if (doc.containsKey("enabled")) {
          rfidCards[index].enabled = doc["enabled"].as<bool>();
        }
        saveRFIDCards();
        xSemaphoreGive(xConfigMutex);
      }
      Serial.println("[MQTT] RFID card updated at index: " + String(index));
      mqttPublishRFIDCardsList(nullptr);
    }
  } else if (type == "RFID_GET_CARDS" || type == "RFID_REQUEST_CARDS") {
    const char* reqId = doc["requestId"] | "";
    mqttPublishRFIDCardsList(strlen(reqId) > 0 ? reqId : nullptr);
  } else if (type == "RFID_REQUEST_LEARN_STATUS") {
    const char* reqId = doc["requestId"] | "";
    mqttPublishRFIDLearnStatusWithRequestId(reqId);
  }
}

/**
 * Publish sensor data to MQTT
 */
void mqttPublishSensorData() {
  if (!backendConfig.isPaired || !mqttConnected) return;

  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_SENSORS, backendConfig.homeId);

  String sensorJson = buildSensorDataJson();
  StaticJsonDocument<768> doc;
  deserializeJson(doc, sensorJson);
  doc["serialNumber"] = backendConfig.serialNumber;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  if (mqttClient.publish(topic, payload.c_str(), MQTT_RETAIN)) {
    Serial.println("[MQTT] Sensor data published");
  } else {
    Serial.println("[MQTT] Publish failed");
  }
}

/**
 * Publish device online/offline status
 */
void mqttPublishStatus(const char* status) {
  if (!backendConfig.isPaired) return;
  
  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_STATUS, backendConfig.homeId);
  
  mqttClient.publish(topic, status, true);  // Retained message
  Serial.println("[MQTT] Status published: " + String(status));
}

/**
 * Publish device status update (immediate) - called when device state changes
 * This ensures backend is updated immediately when MCU changes device state
 * (e.g., door auto-closes, sensor triggers, etc.)
 */
void mqttPublishDeviceStatus(int gpioPin, const char* deviceCode, const char* status, const char* stateValue) {
  Serial.printf("[MQTT] mqttPublishDeviceStatus called: GPIO=%d, Code=%s, Status=%s\n", 
                gpioPin, deviceCode, status);
  Serial.printf("[MQTT] Check: isPaired=%d, mqttConnected=%d, homeId=%d\n", 
                backendConfig.isPaired, mqttConnected, backendConfig.homeId);
  
  if (!backendConfig.isPaired) {
    Serial.println("[MQTT] Device status publish skipped: not paired");
    return;
  }
  
  if (!mqttConnected) {
    Serial.println("[MQTT] Device status publish skipped: MQTT not connected");
    return;
  }

  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_DEVICE_STATUS, backendConfig.homeId);
  Serial.printf("[MQTT] Publishing to topic: %s\n", topic);

  StaticJsonDocument<256> doc;
  doc["gpioPin"] = gpioPin;
  doc["deviceCode"] = deviceCode;
  doc["status"] = status;
  if (stateValue != nullptr) {
    doc["stateValue"] = stateValue;
  }
  doc["timestamp"] = millis();
  doc["serialNumber"] = backendConfig.serialNumber.c_str();

  String payload;
  serializeJson(doc, payload);
  Serial.printf("[MQTT] Payload: %s\n", payload.c_str());

  if (mqttClient.publish(topic, payload.c_str(), false)) {
    Serial.printf("[MQTT] ✅ Device status published successfully: GPIO=%d, Code=%s, Status=%s, Topic=%s\n", 
                  gpioPin, deviceCode, status, topic);
  } else {
    Serial.printf("[MQTT] ❌ Device status publish failed: GPIO=%d, Code=%s, Status=%s\n", 
                  gpioPin, deviceCode, status);
  }
}

/**
 * Publish command acknowledgment via MQTT
 */
void mqttPublishCommandAck(long commandId, bool success) {
  if (!mqttConnected || !backendConfig.isPaired || commandId <= 0) return;

  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_COMMAND_ACK, backendConfig.homeId);

  StaticJsonDocument<128> doc;
  doc["commandId"] = commandId;
  doc["success"] = success;
  doc["timestamp"] = millis();
  doc["serialNumber"] = backendConfig.serialNumber.c_str();

  char payload[256];
  size_t len = serializeJson(doc, payload, sizeof(payload));
  mqttClient.publish(topic, (uint8_t*)payload, len, false);
  Serial.print("[MQTT] Command ACK published: id=");
  Serial.print(commandId);
  Serial.print(", success=");
  Serial.println(success);
}

/**
 * Publish RFID access event (const char* for fixed-struct compatibility)
 */
void mqttPublishRFIDAccess(const char* uid, bool authorized, const char* cardName, const char* status) {
  if (!mqttConnected || !backendConfig.isPaired) return;

  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_RFID_ACCESS, backendConfig.homeId);

  StaticJsonDocument<256> doc;
  doc["serialNumber"] = backendConfig.serialNumber.c_str();
  doc["cardUid"] = uid;
  doc["authorized"] = authorized;
  doc["cardName"] = cardName;
  doc["status"] = status;
  doc["timestamp"] = millis();

  char payloadBuf[384];
  size_t len = serializeJson(doc, payloadBuf, sizeof(payloadBuf));
  mqttClient.publish(topic, (uint8_t*)payloadBuf, len, false);
  Serial.println("[MQTT] RFID access event published");
}

/**
 * Publish RFID learning status
 */
void mqttPublishRFIDLearnStatus() {
  mqttPublishRFIDLearnStatusWithRequestId(nullptr);
}

/**
 * Publish RFID learning status with optional requestId for request-response
 */
void mqttPublishRFIDLearnStatusWithRequestId(const char* requestId) {
  if (!mqttConnected || !backendConfig.isPaired) return;
  
  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_RFID_LEARN, backendConfig.homeId);
  
  StaticJsonDocument<256> doc;
  doc["learningMode"] = rfidLearningMode;
  doc["complete"] = rfidLearningComplete;
  doc["success"] = rfidLearningSuccess;
  doc["result"] = rfidLearningResult;
  doc["cardCount"] = allowedCardsCount;
  if (requestId != nullptr && strlen(requestId) > 0) {
    doc["requestId"] = requestId;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.publish(topic, payload.c_str());
  Serial.println("[MQTT] RFID learn status published");
}

/**
 * Publish RFID cards list (optional requestId for request-response)
 */
void mqttPublishRFIDCardsList(const char* requestId) {
  if (!mqttConnected || !backendConfig.isPaired) return;
  
  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_RFID_CARDS, backendConfig.homeId);
  
  StaticJsonDocument<1024> doc;
  JsonArray cards = doc.createNestedArray("cards");
  
  if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    for (uint8_t i = 0; i < allowedCardsCount; i++) {
      JsonObject card = cards.createNestedObject();
      card["index"] = i;
      
      String uid = "";
      for (int j = 0; j < 4; j++) {
        if (rfidCards[i].uid[j] < 0x10) uid += "0";
        uid += String(rfidCards[i].uid[j], HEX);
      }
      uid.toUpperCase();
      card["uid"] = uid;
      card["name"] = String(rfidCards[i].name);
      card["enabled"] = rfidCards[i].enabled;
      card["lastUsed"] = rfidCards[i].lastUsed;
    }
    xSemaphoreGive(xConfigMutex);
  }
  
  doc["count"] = allowedCardsCount;
  doc["maxCards"] = MAX_ALLOWED_RFID_CARDS;
  doc["learningMode"] = rfidLearningMode;
  if (requestId != nullptr && strlen(requestId) > 0) {
    doc["requestId"] = requestId;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.publish(topic, payload.c_str());
  Serial.println("[MQTT] RFID cards list published");
}

/**
 * Publish GPIO available pins (for MQTT request-response)
 */
void mqttPublishGPIOAvailable(const char* requestId) {
  if (!mqttConnected || !backendConfig.isPaired) return;

  char topic[64];
  snprintf(topic, sizeof(topic), MQTT_TOPIC_GPIO_AVAILABLE, backendConfig.homeId);

  StaticJsonDocument<1024> doc;
  JsonArray pins = doc.createNestedArray("pins");

  JsonObject lightRelay = pins.createNestedObject();
  lightRelay["gpio"] = PIN_RELAY_LIGHT;
  lightRelay["name"] = "Light Relay";
  lightRelay["code"] = "LIGHT_RELAY";
  lightRelay["type"] = "OUTPUT";
  lightRelay["deviceType"] = "LIGHT";
  lightRelay["currentState"] = sensorData.relayLightStatus ? "ON" : "OFF";
  lightRelay["controllable"] = true;

  JsonObject fanRelay = pins.createNestedObject();
  fanRelay["gpio"] = PIN_RELAY_FAN;
  fanRelay["name"] = "Fan Relay";
  fanRelay["code"] = "FAN_RELAY";
  fanRelay["type"] = "OUTPUT";
  fanRelay["deviceType"] = "FAN";
  fanRelay["currentState"] = sensorData.relayFanStatus ? "ON" : "OFF";
  fanRelay["controllable"] = true;

  JsonObject doorServo = pins.createNestedObject();
  doorServo["gpio"] = PIN_SERVO;
  doorServo["name"] = "Door Servo";
  doorServo["code"] = "DOOR_SERVO";
  doorServo["type"] = "OUTPUT";
  doorServo["deviceType"] = "DOOR";
  doorServo["currentState"] = sensorData.doorOpen ? "OPEN" : "CLOSED";
  doorServo["controllable"] = true;

  JsonObject gasSensor = pins.createNestedObject();
  gasSensor["gpio"] = PIN_MQ2;
  gasSensor["name"] = "Gas Sensor (MQ2)";
  gasSensor["code"] = "GAS_SENSOR";
  gasSensor["type"] = "INPUT_ANALOG";
  gasSensor["deviceType"] = "SENSOR";
  gasSensor["currentValue"] = sensorData.mq2Value;
  gasSensor["controllable"] = false;

  JsonObject lightSensor = pins.createNestedObject();
  lightSensor["gpio"] = PIN_LDR;
  lightSensor["name"] = "Light Sensor (LDR)";
  lightSensor["code"] = "LIGHT_SENSOR";
  lightSensor["type"] = "INPUT_ANALOG";
  lightSensor["deviceType"] = "SENSOR";
  lightSensor["currentValue"] = sensorData.ldrValue;
  lightSensor["controllable"] = false;

  JsonObject flameSensor = pins.createNestedObject();
  flameSensor["gpio"] = PIN_FLAME;
  flameSensor["name"] = "Flame Sensor";
  flameSensor["code"] = "FLAME_SENSOR";
  flameSensor["type"] = "INPUT_DIGITAL";
  flameSensor["deviceType"] = "SENSOR";
  flameSensor["currentValue"] = (currentEmergency & EMERGENCY_FIRE) ? true : false;
  flameSensor["controllable"] = false;

  JsonObject dhtIn = pins.createNestedObject();
  dhtIn["gpio"] = PIN_DHT_IN;
  dhtIn["name"] = "DHT Indoor (Temp & Humidity)";
  dhtIn["code"] = "TEMP_HUMIDITY_IN";
  dhtIn["type"] = "INPUT_DIGITAL";
  dhtIn["deviceType"] = "SENSOR";
  dhtIn["tempIn"] = sensorData.tempIn;
  dhtIn["humIn"] = sensorData.humIn;
  dhtIn["controllable"] = false;

  JsonObject dhtOut = pins.createNestedObject();
  dhtOut["gpio"] = PIN_DHT_OUT;
  dhtOut["name"] = "DHT Outdoor (Temp & Humidity)";
  dhtOut["code"] = "TEMP_HUMIDITY_OUT";
  dhtOut["type"] = "INPUT_DIGITAL";
  dhtOut["deviceType"] = "SENSOR";
  dhtOut["tempOut"] = sensorData.tempOut;
  dhtOut["humOut"] = sensorData.humOut;
  dhtOut["controllable"] = false;

  JsonObject motionSensor = pins.createNestedObject();
  motionSensor["gpio"] = PIN_PIR;
  motionSensor["name"] = "Motion Sensor (PIR)";
  motionSensor["code"] = "MOTION_SENSOR";
  motionSensor["type"] = "INPUT_DIGITAL";
  motionSensor["deviceType"] = "SENSOR";
  motionSensor["currentValue"] = sensorData.motionDetected;
  motionSensor["controllable"] = false;

  JsonObject rainSensor = pins.createNestedObject();
  rainSensor["gpio"] = PIN_RAIN;
  rainSensor["name"] = "Rain Sensor";
  rainSensor["code"] = "RAIN_SENSOR";
  rainSensor["type"] = "INPUT_ANALOG";
  rainSensor["deviceType"] = "SENSOR";
  rainSensor["currentValue"] = sensorData.rainValue;
  rainSensor["controllable"] = false;

  doc["totalPins"] = 10;
  doc["controllablePins"] = 3;
  doc["sensorPins"] = 7;
  doc["serialNumber"] = backendConfig.serialNumber;
  if (requestId != nullptr && strlen(requestId) > 0) {
    doc["requestId"] = requestId;
  }

  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(topic, payload.c_str());
  Serial.println("[MQTT] GPIO available published");
}

/**
 * Sync all device states to MQTT backend
 * Called after config changes to ensure frontend is synchronized
 */
void syncAllDeviceStates() {
  if (!mqttConnected || !backendConfig.isPaired) {
    Serial.println("[SYNC] Skipped - MQTT not connected");
    return;
  }
  
  Serial.println("[SYNC] Publishing all device states...");
  
  // Sync Light status
  mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", 
                          sensorData.relayLightStatus ? "ON" : "OFF",
                          sensorData.relayLightStatus ? "{\"power\":\"ON\"}" : "{\"power\":\"OFF\"}");
  
  // Sync Fan status
  mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY",
                          sensorData.relayFanStatus ? "ON" : "OFF", 
                          sensorData.relayFanStatus ? "{\"power\":\"ON\"}" : "{\"power\":\"OFF\"}");
  
  // Sync Door status
  mqttPublishDeviceStatus(PIN_SERVO, "DOOR_SERVO",
                          sensorData.doorOpen ? "OPEN" : "CLOSED",
                          sensorData.doorOpen ? "{\"position\":\"OPEN\"}" : "{\"position\":\"CLOSED\"}");
  
  // Also send full sensor data for complete sync
  mqttPublishSensorData();
  
  Serial.println("[SYNC] All device states published");
}

// ============ FREERTOS TASK: MQTT ============
// ============ FREERTOS TASK: MQTT (with Buffer Management) ============
void taskMQTT(void *pvParameters) {
  // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  (void)pvParameters;
  bool wasConnected = false;

  while (WiFi.status() != WL_CONNECTED) {
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
  setupMQTT();
  unsigned long lastSensorPublish = 0;
  const unsigned long sensorPublishInterval = 30000;

  while(1) {
    if (WiFi.status() != WL_CONNECTED) {
      mqttConnected = false;
      wasConnected = false;
      // esp_task_wdt_reset()  // WATCHDOG DISABLED;
      vTaskDelay(pdMS_TO_TICKS(5000));
      continue;
    }

    // NOTE: Không skip khi chưa paired!
    // mqttConnect() đã xử lý pairing mode: subscribe smarthome/pairing/{serialNumber}
    // để nhận API key credentials từ backend.
    
    bool currentlyConnected = mqttClient.connected();
    
    if (!currentlyConnected) {
      mqttConnected = false;
      
      if (wasConnected) {
        Serial.println("[MQTT] Connection lost");
        wasConnected = false;
      }
      
      unsigned long now = millis();
      if (now - lastMqttReconnectAttempt >= mqttRetryDelay) {
        lastMqttReconnectAttempt = now;
        if (mqttConnect()) {
          lastMqttReconnectAttempt = 0;
          wasConnected = true;
          mqttConnected = true;
          Serial.println("[MQTT] Reconnected");
        }
      }
    } else {
      mqttConnected = true;
      
      if (!wasConnected) {
        Serial.println("[MQTT] Connection restored");
        wasConnected = true;
      }
      
      mqttClient.loop();

      // Xử lý pending pairing credentials (từ callback)
      if (pendingPairing.pending) {
        pendingPairing.pending = false;
        Serial.println("[MQTT] Processing pending pairing credentials...");

        if (xSemaphoreTake(xBackendMutex, pdMS_TO_TICKS(3000)) == pdTRUE) {
          backendConfig.apiKey = String(pendingPairing.apiKey);
          backendConfig.mcuGatewayId = pendingPairing.mcuGatewayId;
          backendConfig.homeId = pendingPairing.homeId;
          backendConfig.isPaired = true;

          // Ghi trực tiếp vào preferences (KHÔNG gọi saveBackendConfig vì nó cũng lấy mutex → deadlock!)
          preferences.putString("api_key", backendConfig.apiKey);
          preferences.putBool("is_paired", true);
          preferences.putLong("mcu_id", backendConfig.mcuGatewayId);
          preferences.putLong("home_id", backendConfig.homeId);

          xSemaphoreGive(xBackendMutex);

          Serial.println("[MQTT] Pairing successful!");
          Serial.printf("  MCU ID: %ld\n", pendingPairing.mcuGatewayId);
          Serial.printf("  Home ID: %ld\n", pendingPairing.homeId);

          // Reconnect để subscribe home topics
          mqttNeedsReconnect = true;
        } else {
          Serial.println("[MQTT] ERROR: Could not acquire mutex for pairing!");
          pendingPairing.pending = true; // Retry next loop
        }
      }

      // Reconnect sau khi pairing (flag được set từ callback)
      if (mqttNeedsReconnect) {
        mqttNeedsReconnect = false;
        Serial.println("[MQTT] Reconnecting to switch from pairing to home topics...");
        mqttClient.disconnect();
        delay(500);
        mqttConnect();
        continue; // Bắt đầu loop lại từ đầu
      }
      
      // Chỉ publish sensor data và sync khi đã paired
      if (backendConfig.isPaired) {
        // Check for sync flag (triggered by config changes)
        if (triggerSyncFlag) {
          triggerSyncFlag = false;
          syncAllDeviceStates();
          Serial.println("[MQTT] Sync triggered by config change");
        }
        
        unsigned long now = millis();
        if (now - lastSensorPublish >= sensorPublishInterval) {
          mqttPublishSensorData();
          lastSensorPublish = now;
        }
      }
    }
    // esp_task_wdt_reset()  // WATCHDOG DISABLED;
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ============ BOOT BUTTON MONITOR (Manual Unpair) ============
/**
 * Monitors BOOT button (GPIO 0). Hold 5 seconds to clear pairing data & restart.
 * LED rapid blink during hold as visual feedback.
 */
void taskBootButtonMonitor(void *pvParameters) {
  (void)pvParameters;
  pinMode(PIN_BOOT, INPUT_PULLUP); // BOOT button is active LOW

  while (1) {
    if (digitalRead(PIN_BOOT) == LOW) {
      // Button pressed - start counting
      unsigned long pressStart = millis();
      bool held = true;

      while (digitalRead(PIN_BOOT) == LOW) {
        unsigned long elapsed = millis() - pressStart;

        // LED rapid blink as feedback during hold
        digitalWrite(PIN_LED, (elapsed / 200) % 2 ? HIGH : LOW);

        // Show progress on LCD
        if (elapsed > 1000 && (elapsed % 1000 < 150)) {
          if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            lcd.setCursor(0, 1);
            char buf[17];
            snprintf(buf, sizeof(buf), "Reset: %ds/5s   ", (int)(elapsed / 1000));
            lcd.print(buf);
            xSemaphoreGive(xLCDMutex);
          }
        }

        if (elapsed >= BOOT_HOLD_UNPAIR_MS) {
          // 5s reached! Clear pairing data
          Serial.println("[BOOT] *** BOOT held 5s → Clearing pairing data! ***");

          // Show on LCD
          if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(200)) == pdTRUE) {
            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("Factory Reset!");
            lcd.setCursor(0, 1);
            lcd.print("Restarting...");
            xSemaphoreGive(xLCDMutex);
          }

          // Disconnect MQTT
          mqttClient.disconnect();

          // Clear pairing data
          if (xSemaphoreTake(xBackendMutex, pdMS_TO_TICKS(3000)) == pdTRUE) {
            backendConfig.isPaired = false;
            backendConfig.apiKey = "";
            backendConfig.mcuGatewayId = 0;
            backendConfig.homeId = 0;

            preferences.putBool("is_paired", false);
            preferences.putString("api_key", "");
            preferences.putLong("mcu_id", 0);
            preferences.putLong("home_id", 0);

            xSemaphoreGive(xBackendMutex);
          }

          Serial.println("[BOOT] Pairing data cleared. Restarting in 2s...");
          digitalWrite(PIN_LED, HIGH); // LED steady = confirmed
          delay(2000);
          ESP.restart();
          // Never reaches here
        }

        vTaskDelay(pdMS_TO_TICKS(50));
      }

      // Button released before 5s
      digitalWrite(PIN_LED, LOW);
    }

    vTaskDelay(pdMS_TO_TICKS(100)); // Check every 100ms
  }
}

// ============ MULTI-FUNCTION BUTTON (GPIO 15) ============
/**
 * Multi-function button on PIN_DOOR_BTN (GPIO 15).
 * 1 click  → Toggle door (open/close)
 * 2 clicks → Toggle fan (on/off)
 * 3 clicks → Toggle light (on/off)
 * 
 * Click counting with 500ms window. Anti-spam: 1.5s cooldown after action.
 */
void taskDoorButton(void *pvParameters) {
  (void)pvParameters;

  const unsigned long CLICK_WINDOW_MS = 500;     // Thời gian chờ giữa các click
  const unsigned long ACTION_COOLDOWN_MS = 1500;  // Cooldown sau mỗi action
  const unsigned long DEBOUNCE_MS = 80;           // Debounce cho mỗi nhấn/thả

  int clickCount = 0;
  unsigned long lastClickTime = 0;
  unsigned long lastActionTime = 0;
  bool lastBtnState = HIGH;
  unsigned long lastStateChangeTime = 0;

  pinMode(PIN_DOOR_BTN, INPUT_PULLUP);
  Serial.println("[BTN] Multi-function button started on GPIO 15");
  Serial.println("[BTN] 1 click=Door, 2 clicks=Fan, 3 clicks=Light");

  while (1) {
    bool rawState = digitalRead(PIN_DOOR_BTN);
    unsigned long now = millis();

    // Debounce: chỉ chấp nhận thay đổi trạng thái sau DEBOUNCE_MS
    if (rawState != lastBtnState) {
      if (now - lastStateChangeTime >= DEBOUNCE_MS) {
        lastStateChangeTime = now;

        if (rawState == LOW && lastBtnState == HIGH) {
          // Falling edge: button pressed
          // Cooldown check
          if (now - lastActionTime >= ACTION_COOLDOWN_MS) {
            clickCount++;
            lastClickTime = now;
            Serial.printf("[BTN] Click #%d detected\n", clickCount);
          }
        }

        lastBtnState = rawState;
      }
    }

    // Khi đã có click và hết click window → thực thi action
    if (clickCount > 0 && (now - lastClickTime >= CLICK_WINDOW_MS)) {
      int action = clickCount;
      clickCount = 0; // Reset counter

      // Block during emergency
      if (currentEmergency != EMERGENCY_NONE) {
        Serial.println("[BTN] Blocked during emergency");
        lastActionTime = now;
        vTaskDelay(pdMS_TO_TICKS(30));
        continue;
      }

      switch (action) {
        case 1: {
          // === 1 CLICK: Toggle Door ===
          // Chờ servo đến vị trí
          if (currentServoAngle != targetServoAngle) {
            Serial.println("[BTN] Door: Servo still moving, skipped");
            break;
          }
          if (sensorData.doorOpen) {
            ServoCommand cmd = {0, true};
            xQueueSend(xDoorQueue, &cmd, 0);
            lastUserDoorAction = millis();
            Serial.println("[BTN] 1 click → Door CLOSE");
          } else {
            ServoCommand cmd = {180, true};
            xQueueSend(xDoorQueue, &cmd, 0);
            lastUserDoorAction = millis();
            Serial.println("[BTN] 1 click → Door OPEN");
          }
          break;
        }

        case 2: {
          // === 2 CLICKS: Toggle Fan ===
          if (sensorData.relayFanStatus) {
            digitalWrite(PIN_RELAY_FAN, LOW);
            sensorData.relayFanStatus = false;
            lastManualFanAction = millis();
            mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "OFF", "{\"power\":\"OFF\"}");
            Serial.println("[BTN] 2 clicks → Fan OFF");
          } else {
            digitalWrite(PIN_RELAY_FAN, HIGH);
            sensorData.relayFanStatus = true;
            lastManualFanAction = millis();
            mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "ON", "{\"power\":\"ON\"}");
            Serial.println("[BTN] 2 clicks → Fan ON");
          }
          break;
        }

        case 3: {
          // === 3 CLICKS: Toggle Light ===
          if (sensorData.relayLightStatus) {
            digitalWrite(PIN_RELAY_LIGHT, LOW);
            sensorData.relayLightStatus = false;
            lastManualLightAction = millis();
            mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "OFF", "{\"power\":\"OFF\"}");
            Serial.println("[BTN] 3 clicks → Light OFF");
          } else {
            digitalWrite(PIN_RELAY_LIGHT, HIGH);
            sensorData.relayLightStatus = true;
            lastManualLightAction = millis();
            mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "ON", "{\"power\":\"ON\"}");
            Serial.println("[BTN] 3 clicks → Light ON");
          }
          break;
        }

        default:
          Serial.printf("[BTN] %d clicks → ignored (max 3)\n", action);
          break;
      }

      lastActionTime = now;
    }

    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// ============ MEMORY MONITORING ============
void printMemoryStats() {
  Serial.println("=== Memory Stats ===");
  size_t freeHeap = ESP.getFreeHeap();
  Serial.print("Free Heap: ");
  Serial.println(freeHeap);
  Serial.print("Largest Free Block: ");
  Serial.println(ESP.getMaxAllocHeap());
  Serial.print("Heap Fragmentation: ");
  if (freeHeap > 0) {
    Serial.print(100 - (ESP.getMaxAllocHeap() * 100) / freeHeap);
  } else {
    Serial.print("N/A");
  }
  Serial.println("%");
}

void taskMemoryMonitor(void *pvParameters) {
  for (;;) {
    printMemoryStats();
    vTaskDelay(pdMS_TO_TICKS(30000));  // Every 30 seconds
  }
}

// ============ FREERTOS TASK: BACKEND COMMUNICATION (MQTT-Only Mode) ============
void taskBackendComm(void *pvParameters) {
  // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  (void)pvParameters;
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xHeartbeatFrequency = pdMS_TO_TICKS(HEARTBEAT_INTERVAL_MS);
  const TickType_t xPairingCheckFrequency = pdMS_TO_TICKS(PAIRING_CHECK_INTERVAL_MS);

  while (WiFi.status() != WL_CONNECTED) {
    // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset watchdog while waiting for WiFi
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
  Serial.println("[BACKEND] Task started (MQTT-only mode)");

  while(1) {
    // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset watchdog at start of loop
    
    if (WiFi.status() != WL_CONNECTED) {
      backendConnected = false;
      // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset before long delay
      vTaskDelay(pdMS_TO_TICKS(5000));
      continue;
    }
    
    if (!backendConfig.isPaired) {
      // Display pairing mode on LCD
      if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Pairing Mode");
        lcd.setCursor(0, 1);
        lcd.print("SN:" + backendConfig.serialNumber.substring(0, 10));
        xSemaphoreGive(xLCDMutex);
      }
      
      // LED blink to indicate pairing mode
      digitalWrite(PIN_LED, HIGH);
      vTaskDelay(pdMS_TO_TICKS(500));
      digitalWrite(PIN_LED, LOW);
      
      // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset before long delay
      vTaskDelay(xPairingCheckFrequency);
    } else {
      unsigned long currentTime = millis();
      
      if (triggerHeartbeatFlag) {
        triggerHeartbeatFlag = false;
        Serial.println("[BACKEND] Triggered heartbeat (manual)");
        // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset before potentially blocking call
        sendHeartbeat();
        // esp_task_wdt_reset()  // WATCHDOG DISABLED;
        vTaskDelay(pdMS_TO_TICKS(1000));
        continue;
      }
      
      if (lastHeartbeat == 0 || (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL_MS)) {
        Serial.print("[BACKEND] Sending heartbeat (MQTT-only mode)...");
        // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset before potentially blocking call
        sendHeartbeat();
        // esp_task_wdt_reset()  // WATCHDOG DISABLED;  // Reset after potentially blocking call
      }
      
      // esp_task_wdt_reset()  // WATCHDOG DISABLED;
      vTaskDelayUntil(&xLastWakeTime, xHeartbeatFrequency);
    }
  }
}

// ============ FREERTOS TASK: COMMAND EXECUTOR ============
void taskCommandExecutor(void *pvParameters) {
  // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  (void)pvParameters;
  DeviceCommand cmd;

  while(1) {
    if (xQueueReceive(xCommandQueue, &cmd, pdMS_TO_TICKS(5000)) == pdTRUE) {
      Serial.println("[CMD] Executing: " + String(cmd.type));
      
      switch(cmd.type) {
        case CMD_LIGHT_ON:
          if (currentEmergency == EMERGENCY_NONE) {
            digitalWrite(PIN_RELAY_LIGHT, HIGH);
            sensorData.relayLightStatus = true;
            lastManualLightAction = millis();  // Manual override
            Serial.println("[CMD] Light ON (manual override set)");
            // Gửi status update ngay lập tức
            mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "ON", "{\"power\":\"ON\"}");
          }
          break;
          
        case CMD_LIGHT_OFF:
          digitalWrite(PIN_RELAY_LIGHT, LOW);
          sensorData.relayLightStatus = false;
          lastManualLightAction = millis();  // Manual override
          Serial.println("[CMD] Light OFF (manual override set)");
          // Gửi status update ngay lập tức
          mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "OFF", "{\"power\":\"OFF\"}");
          break;
          
        case CMD_FAN_ON:
          if (currentEmergency == EMERGENCY_NONE) {
            digitalWrite(PIN_RELAY_FAN, HIGH);
            sensorData.relayFanStatus = true;
            lastManualFanAction = millis();  // Manual override
            Serial.println("[CMD] Fan ON (manual override set)");
            // Gửi status update ngay lập tức
            mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "ON", "{\"power\":\"ON\"}");
          }
          break;
          
        case CMD_FAN_OFF:
          if (currentEmergency == EMERGENCY_NONE) {
            digitalWrite(PIN_RELAY_FAN, LOW);
            sensorData.relayFanStatus = false;
            lastManualFanAction = millis();  // Manual override
            Serial.println("[CMD] Fan OFF (manual override set)");
            // Gửi status update ngay lập tức
            mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "OFF", "{\"power\":\"OFF\"}");
          }
          break;
          
        case CMD_DOOR_OPEN:
          {
            ServoCommand servoCmd = {180, true};
            xQueueSend(xDoorQueue, &servoCmd, 0);
            lastUserDoorAction = millis();  // User door action priority
            Serial.println("[CMD] Door OPEN (user action priority set)");
          }
          break;
          
        case CMD_DOOR_CLOSE:
          if (currentEmergency == EMERGENCY_NONE) {
            ServoCommand servoCmd = {0, true};
            xQueueSend(xDoorQueue, &servoCmd, 0);
            Serial.println("[CMD] Door CLOSE");
          }
          break;

        default:
          break;
      }
    }
    // esp_task_wdt_reset()  // WATCHDOG DISABLED;
  }
}

// ============ HTML TEMPLATES IN PROGMEM ============
const char HTML_HEADER[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html><head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>%DEVICE_NAME%</title>
<link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'>
<style>
body{font-family:'Segoe UI',sans-serif;margin:0;background:linear-gradient(135deg,#667eea,#764ba2);color:#333}
.container{max-width:900px;margin:20px auto;padding:20px}
.header{background:rgba(255,255,255,0.95);border-radius:15px;padding:20px;margin-bottom:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.card{background:rgba(255,255,255,0.95);border-radius:15px;padding:20px;box-shadow:0 5px 15px rgba(0,0,0,0.1);transition:transform 0.3s}
.card:hover{transform:translateY(-5px)}
.sensor-value{font-size:24px;font-weight:bold;color:#2c3e50;margin:10px 0}
.status-indicator{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px}
.status-safe{background:#2ecc71}
.status-warning{background:#f39c12}
.status-danger{background:#e74c3c;animation:pulse 1s infinite}
.status-connected{background:#2ecc71}
.status-disconnected{background:#e74c3c}
.btn{padding:10px 20px;border:none;border-radius:50px;font-weight:bold;cursor:pointer;transition:all 0.3s;margin:5px}
.btn-primary{background:linear-gradient(45deg,#667eea,#764ba2);color:white}
.btn-success{background:#2ecc71;color:white}
.btn-danger{background:#e74c3c;color:white}
.alert-danger{background:#e74c3c;color:white;padding:15px;border-radius:10px;margin-bottom:20px;animation:pulse 1s infinite}
.alert-info{background:#3498db;color:white;padding:15px;border-radius:10px;margin-bottom:20px}
.pairing-box{background:#fff;border:3px dashed #667eea;padding:30px;text-align:center;border-radius:15px;margin-bottom:20px}
.serial-number{font-family:monospace;font-size:24px;background:#f8f9fa;padding:15px;border-radius:10px;margin:10px 0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
h3{margin-top:0;color:#2c3e50}
.sensor-item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
.sensor-item:last-child{border-bottom:none}
.emergency-mode{background:#e74c3c!important;color:white}
</style>
<meta http-equiv='refresh' content='5'>
</head><body>
)rawliteral";

const char HTML_FOOTER[] PROGMEM = R"rawliteral(
</body></html>
)rawliteral";

// ============ INTERRUPT HANDLERS ============
void IRAM_ATTR flameISR() {
  EmergencyEvent evt;
  evt.type = EMERGENCY_FIRE;
  evt.active = (digitalRead(PIN_FLAME) == LOW);
  BaseType_t xHigherPriorityTaskWoken = pdFALSE;
  xQueueSendFromISR(xEmergencyQueue, &evt, &xHigherPriorityTaskWoken);
  portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}

void IRAM_ATTR motionISR() {
  if (xSemaphoreTakeFromISR(xSensorMutex, NULL) == pdTRUE) {
    sensorData.motionDetected = (digitalRead(PIN_PIR) == HIGH);
    sensorData.lastMotionTime = millis();
    xSemaphoreGiveFromISR(xSensorMutex, NULL);
  }
}

// ============ FREERTOS TASK: SENSOR READING ============
void taskSensorRead(void *pvParameters) {
  // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  (void)pvParameters;
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(500);
  static uint8_t dhtCounter = 0;

  while(1) {
    // Read analog sensors every 500ms
    int mq2 = analogRead(PIN_MQ2);
    int ldr = analogRead(PIN_LDR);
    int rain = analogRead(PIN_RAIN);
    
    // Read DHT sensors every 3 seconds (6 cycles)
    if (dhtCounter >= 6) {
      dhtCounter = 0;
      
      // Read DHT In
      float t1 = dhtIn.readTemperature();
      float h1 = dhtIn.readHumidity();
      
      // Yield to allow other tasks/interrupts (prevent WDT timeout)
      vTaskDelay(pdMS_TO_TICKS(50));
      
      // Read DHT Out
      float t2 = dhtOut.readTemperature();
      float h2 = dhtOut.readHumidity();
      
      if (xSemaphoreTake(xSensorMutex, portMAX_DELAY) == pdTRUE) {
        if (!isnan(t1) && !isnan(h1)) {
          sensorData.tempIn = t1;
          sensorData.humIn = h1;
        }
        if (!isnan(t2) && !isnan(h2)) {
          sensorData.tempOut = t2;
          sensorData.humOut = h2;
        }
        xSemaphoreGive(xSensorMutex);
      }
    }
    dhtCounter++;
    
    // Update sensor data with mutex protection
    if (xSemaphoreTake(xSensorMutex, portMAX_DELAY) == pdTRUE) {
      sensorData.mq2Value = mq2;
      sensorData.ldrValue = ldr;
      sensorData.rainValue = rain;
      
      // FIXED: Polling Flame Sensor
      // Digital Sensor: LOW = Fire detected, HIGH = No fire
      bool flameDetected = (digitalRead(PIN_FLAME) == LOW);
      static bool lastFlameDetection = false;
      
      if (flameDetected != lastFlameDetection) {
        lastFlameDetection = flameDetected;
        EmergencyEvent evt;
        evt.type = EMERGENCY_FIRE;
        evt.active = flameDetected;
        xQueueSend(xEmergencyQueue, &evt, 0);
        Serial.println(flameDetected ? "[SENSOR] Flame detected (Polling)" : "[SENSOR] Flame cleared (Polling)");
      }
      
      // Check gas threshold with persistent detection (prevent false positives)
      static unsigned long gasHighStartTime = 0;
      bool gasHigh = mq2 > config.gasAlertThreshold;
      
      if (gasHigh) {
        // Gas is high - start or continue timer
        if (gasHighStartTime == 0) {
          gasHighStartTime = millis();
          Serial.printf("[SENSOR] Gas high detected: %d > %d, starting persistent check...\n", 
                        mq2, config.gasAlertThreshold);
        }
        
        // Check if gas has been high for persistent duration
        bool gasPersistent = (millis() - gasHighStartTime >= GAS_PERSISTENT_DURATION_MS);
        
        if (gasPersistent && !sensorData.gasAlert) {
          sensorData.gasAlert = true;
          EmergencyEvent evt = {EMERGENCY_GAS, true};
          xQueueSend(xEmergencyQueue, &evt, 0);
          Serial.printf("[SENSOR] GAS EMERGENCY: Persistent high for %lums\n", 
                        millis() - gasHighStartTime);
        }
      } else {
        // Gas is normal - reset timer and clear alert if needed
        if (gasHighStartTime != 0) {
          Serial.printf("[SENSOR] Gas returned to normal after %lums\n", 
                        millis() - gasHighStartTime);
          gasHighStartTime = 0;
        }
        
        if (sensorData.gasAlert) {
          sensorData.gasAlert = false;
          EmergencyEvent evt = {EMERGENCY_GAS, false};
          xQueueSend(xEmergencyQueue, &evt, 0);
          Serial.println("[SENSOR] Gas alert cleared");
        }
      }

      xSemaphoreGive(xSensorMutex);
    }
    
    // DEBUG: PIR State Change
    static bool lastMotionState = false;
    if (sensorData.motionDetected != lastMotionState) {
      lastMotionState = sensorData.motionDetected;
      Serial.printf("[SENSOR] Motion State Changed: %s\n", lastMotionState ? "DETECTED" : "CLEARED");
    }

    // esp_task_wdt_reset()  // WATCHDOG DISABLED;
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// ============ FREERTOS TASK: LCD DISPLAY ============
// FIXED: Thêm delay sau các thao tác LCD để tránh ký tự lạ
void taskLCDUpdate(void *pvParameters) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(2500);  // Tăng interval lên 2.5s
  uint8_t page = 0;
  
  // FIXED: Delay ban đầu để LCD ổn định
  vTaskDelay(pdMS_TO_TICKS(1000));
  
  while(1) {
    // Skip if in pairing mode (handled by backend task)
    if (!backendConfig.isPaired) {
      vTaskDelayUntil(&xLastWakeTime, xFrequency);
      continue;
    }
    
    if (currentEmergency != EMERGENCY_NONE) {
      // Emergency display handled by emergency task
      vTaskDelayUntil(&xLastWakeTime, xFrequency);
      continue;
    }
    
    if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(500)) == pdTRUE) {
      lcd.clear();
      delay(5);  // FIXED: Delay nhỏ sau clear để LCD xử lý
      
      switch(page) {
        case 0:
          lcd.setCursor(0, 0);
          lcd.print("In:");
          lcd.print(sensorData.tempIn, 1);
          lcd.print("C ");
          lcd.print((int)sensorData.humIn);
          lcd.print("%");
          lcd.setCursor(0, 1);
          lcd.print("Out:");
          lcd.print(sensorData.tempOut, 1);
          lcd.print("C");
          break;
        case 1:
          lcd.setCursor(0, 0);
          lcd.print("Gas:");
          lcd.print(sensorData.mq2Value);
          lcd.setCursor(0, 1);
          lcd.print("Light:");
          lcd.print(sensorData.ldrValue);
          break;
        case 2:
          lcd.setCursor(0, 0);
          lcd.print("Motion:");
          lcd.print(sensorData.motionDetected ? "YES" : "NO");
          lcd.setCursor(0, 1);
          lcd.print("Rain:");
          lcd.print(sensorData.rainValue);
          break;
        case 3:
          lcd.setCursor(0, 0);
          lcd.print(backendConnected ? "Backend: OK" : "Backend: OFF");
          lcd.setCursor(0, 1);
          {
            String ip = WiFi.localIP().toString();
            lcd.print(ip.substring(0, min(16, (int)ip.length())));
          }
          break;
      }
      
      delay(2);  // FIXED: Delay nhỏ trước khi release mutex
      xSemaphoreGive(xLCDMutex);
      
      // Page rotation: skip page 3 (backend status) when backend is online
      if (backendConnected) {
        // Backend online: cycle through pages 0, 1, 2 only
        page = (page + 1) % 3;
      } else {
        // Backend offline: show all pages including page 3 (backend status)
        page = (page + 1) % 4;
      }
    }
    
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// ============ FREERTOS TASK: RFID READER ============
// FIXED: Thêm logic reset và recovery cho MFRC522
void taskRFIDCheck(void *pvParameters) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(200);  // Tăng interval lên 200ms
  
  // FIXED: Khởi tạo lastRfidReset = millis() để tránh reset ngay từ đầu
  static unsigned long lastRfidReset = 0;
  static uint8_t commErrorCount = 0;  // Chỉ đếm lỗi communication, không phải "không thấy thẻ"
  const uint8_t MAX_COMM_ERRORS = 10;  // Reset sau 10 lỗi communication liên tiếp
  const unsigned long RFID_RESET_INTERVAL = 600000;  // Reset định kỳ mỗi 10 phút
  
  // FIXED: Delay ban đầu để RFID module ổn định sau setup()
  vTaskDelay(pdMS_TO_TICKS(2000));
  lastRfidReset = millis();  // Khởi tạo timestamp sau delay
  
  Serial.println("[RFID] Task started, waiting for cards...");
  
  while(1) {
    // Skip RFID check if in learning mode
    if (rfidLearningMode) {
      vTaskDelayUntil(&xLastWakeTime, xFrequency);
      continue;
    }
    
    // FIXED: Chỉ reset định kỳ hoặc khi có nhiều lỗi communication thực sự
    unsigned long currentTime = millis();
    bool shouldReset = (currentTime - lastRfidReset > RFID_RESET_INTERVAL) || 
                       (commErrorCount >= MAX_COMM_ERRORS);
    
    if (shouldReset) {
      Serial.printf("[RFID] Performing reset (errors=%d)...\n", commErrorCount);
      
      // Soft reset trước
      rfid.PCD_SoftPowerDown();
      delay(50);
      rfid.PCD_SoftPowerUp();
      delay(50);
      rfid.PCD_Init();
      delay(100);
      rfid.PCD_SetAntennaGain(rfid.RxGain_max);
      
      lastRfidReset = currentTime;
      commErrorCount = 0;
      
      // Verify reset worked
      byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
      if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] WARNING: Module not responding, check wiring!");
        // Không tiếp tục retry liên tục - đợi lâu hơn
        vTaskDelay(pdMS_TO_TICKS(5000));
      } else {
        Serial.printf("[RFID] Reset OK, version: 0x%02X\n", version);
      }
      continue;
    }
    
    // Kiểm tra thẻ - không có thẻ là BÌNH THƯỜNG, không phải lỗi
    if (!rfid.PICC_IsNewCardPresent()) {
      // Không tăng error count - đây là trạng thái bình thường
      vTaskDelayUntil(&xLastWakeTime, xFrequency);
      continue;
    }
    
    if (!rfid.PICC_ReadCardSerial()) {
      // Đọc serial thất bại - có thể do thẻ bị lấy ra nhanh hoặc lỗi communication
      Serial.println("[RFID] ReadCardSerial failed");
      commErrorCount++;  // Chỉ tăng error count khi thực sự có lỗi
      rfid.PICC_HaltA();
      vTaskDelayUntil(&xLastWakeTime, xFrequency);
      continue;
    }
    
    // Đọc thành công - reset fail counter
    commErrorCount = 0;
    
    bool authorized = false;
    int matchedIndex = -1;
    String cardName = "";
    
    for (uint8_t i = 0; i < allowedCardsCount; i++) {
      bool match = true;
      for (byte j = 0; j < 4; j++) {
        if (rfid.uid.uidByte[j] != rfidCards[i].uid[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        matchedIndex = i;
        // Check if card is enabled
        if (rfidCards[i].enabled) {
          authorized = true;
          cardName = String(rfidCards[i].name);
          
          // Update last used timestamp
          if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            rfidCards[i].lastUsed = millis();
            // Save periodically (not every scan to save flash writes)
            static unsigned long lastSaveTime = 0;
            if (millis() - lastSaveTime > 60000) { // Save every 1 minute max
              saveRFIDCards();
              lastSaveTime = millis();
            }
            xSemaphoreGive(xConfigMutex);
          }
        }
        break;
      }
    }
    
    // Build RFID UID string
    String uidString = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      uidString += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
      uidString += String(rfid.uid.uidByte[i], HEX);
    }
    uidString.toUpperCase();
    
    // Log access event
    if (matchedIndex >= 0) {
      Serial.print("[RFID] UID: " + uidString + " (" + cardName + ")");
      Serial.println(authorized ? " - GRANTED" : " - DISABLED");
    } else {
      Serial.print("[RFID] UID: " + uidString);
      Serial.println(" - DENIED (Unknown)");
    }
    
    if (backendConfig.isPaired) {
      reportRFIDAccess(uidString.c_str(), authorized, cardName.c_str(),
                       matchedIndex >= 0 ? "KNOWN" : "UNKNOWN");
    }
    
    // FIXED: Thêm delay nhỏ trước khi access LCD
    vTaskDelay(pdMS_TO_TICKS(10));
    
    if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(500)) == pdTRUE) {
      lcd.clear();
      delay(5);  // FIXED: Delay nhỏ sau clear
      if (authorized) {
        lcd.print("Access Granted");
        lcd.setCursor(0, 1);
        lcd.print(cardName.substring(0, 16));
      } else if (matchedIndex >= 0) {
        lcd.print("Card Disabled");
        lcd.setCursor(0, 1);
        lcd.print(String(rfidCards[matchedIndex].name).substring(0, 16));
      } else {
        lcd.print("Access Denied");
        lcd.setCursor(0, 1);
        lcd.print("Unknown Card!");
      }
      xSemaphoreGive(xLCDMutex);
    }
    
    // Visual & Audio feedback
    if (authorized) {
      // 1 long beep for success
      digitalWrite(PIN_LED, HIGH);
      tone(PIN_BUZZER, 2000); // Buzzer ON
      vTaskDelay(pdMS_TO_TICKS(500));  // Long beep (500ms)
      digitalWrite(PIN_LED, LOW);
      noTone(PIN_BUZZER); // Buzzer OFF
      
      ServoCommand cmd = {180, true};
      xQueueSend(xDoorQueue, &cmd, 0);
      lastUserDoorAction = millis();  // User action priority for rain auto-close
      Serial.println("[RFID] User door action priority set");
    } else {
      // 3 short beeps for failure (denied or disabled)
      for (int i = 0; i < 3; i++) {
        digitalWrite(PIN_LED, HIGH);
        tone(PIN_BUZZER, 2000); // Buzzer ON
        vTaskDelay(pdMS_TO_TICKS(100)); // Short beep (100ms)
        digitalWrite(PIN_LED, LOW);
        noTone(PIN_BUZZER); // Buzzer OFF
        vTaskDelay(pdMS_TO_TICKS(100));
      }
    }
    
    // FIXED: Đảm bảo halt và stop crypto đúng cách
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    
    // FIXED: Thêm delay lớn hơn để tránh đọc lại cùng thẻ
    vTaskDelay(pdMS_TO_TICKS(1500));
  }
}

// ============ FREERTOS TASK: WEB SERVER ============
void taskWebServer(void *pvParameters) {
  while(1) {
    server.handleClient();
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// ============ FREERTOS TASK: AUTOMATION ============
void taskAutomation(void *pvParameters) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(1000);
  
  while(1) {
    if (currentEmergency != EMERGENCY_NONE) {
      vTaskDelayUntil(&xLastWakeTime, xFrequency);
      continue;
    }
    
    unsigned long currentTime = millis();
    
    if (xSemaphoreTake(xSensorMutex, portMAX_DELAY) == pdTRUE) {
      // ============ AUTO LIGHT CONTROL ============
      if (config.autoLightEnabled) {
        // Check manual override - skip if user recently controlled light
        bool manualOverrideActive = (currentTime - lastManualLightAction < MANUAL_OVERRIDE_DURATION_MS);
        
        if (manualOverrideActive) {
          // Skip auto control, user has priority
          static unsigned long lastOverrideLog = 0;
          if (currentTime - lastOverrideLog > 5000) {
            lastOverrideLog = currentTime;
            Serial.printf("[AUTO] Light: Manual override active (%lus remaining)\n", 
                          (MANUAL_OVERRIDE_DURATION_MS - (currentTime - lastManualLightAction)) / 1000);
          }
        } else {
          // High LDR value = dark room, turn light ON when dark AND motion detected
          bool shouldBeOn = sensorData.motionDetected && 
                           (sensorData.ldrValue > config.autoLightThreshold);
          
          if (shouldBeOn && !sensorData.relayLightStatus) {
            digitalWrite(PIN_RELAY_LIGHT, HIGH);
            sensorData.relayLightStatus = true;
            Serial.printf("[AUTO] Light ON: Motion=%d, LDR=%d > Thresh=%d (dark)\n",
                          sensorData.motionDetected, sensorData.ldrValue, config.autoLightThreshold);
            mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "ON", "{\"power\":\"ON\",\"auto\":true}");
          } else if (!shouldBeOn && sensorData.relayLightStatus && 
                     (currentTime - sensorData.lastMotionTime > 30000)) {
            digitalWrite(PIN_RELAY_LIGHT, LOW);
            sensorData.relayLightStatus = false;
            Serial.println("[AUTO] Light OFF: No motion for 30s or bright room");
            mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "OFF", "{\"power\":\"OFF\",\"auto\":true}");
          } else {
            // Debug reason for NO Action
            static unsigned long lastDebugLight = 0;
            if (currentTime - lastDebugLight > 5000) {
              lastDebugLight = currentTime;
              Serial.printf("[AUTO] Check Light: Motion=%d, LDR=%d (Thresh=%d), Status=%d -> NO ACTION\n", 
                            sensorData.motionDetected, sensorData.ldrValue, config.autoLightThreshold, sensorData.relayLightStatus);
            }
          }
        }
      }
      
      // ============ AUTO FAN CONTROL ============
      if (config.autoFanEnabled) {
        // Check manual override
        bool manualOverrideActive = (currentTime - lastManualFanAction < MANUAL_OVERRIDE_DURATION_MS);
        
        if (manualOverrideActive) {
          static unsigned long lastOverrideLog = 0;
          if (currentTime - lastOverrideLog > 5000) {
            lastOverrideLog = currentTime;
            Serial.printf("[AUTO] Fan: Manual override active (%lus remaining)\n",
                          (MANUAL_OVERRIDE_DURATION_MS - (currentTime - lastManualFanAction)) / 1000);
          }
        } else {
          if (sensorData.tempIn > config.autoFanThreshold && !sensorData.relayFanStatus) {
            digitalWrite(PIN_RELAY_FAN, HIGH);
            sensorData.relayFanStatus = true;
            Serial.printf("[AUTO] Fan ON: Temp=%.1f > Thresh=%d\n", sensorData.tempIn, config.autoFanThreshold);
            mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "ON", "{\"power\":\"ON\",\"auto\":true}");
          } else if (sensorData.tempIn < (config.autoFanThreshold - 2) && sensorData.relayFanStatus) {
            digitalWrite(PIN_RELAY_FAN, LOW);
            sensorData.relayFanStatus = false;
            Serial.printf("[AUTO] Fan OFF: Temp=%.1f < Thresh=%d\n", sensorData.tempIn, config.autoFanThreshold - 2);
            mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "OFF", "{\"power\":\"OFF\",\"auto\":true}");
          } else {
            static unsigned long lastDebugFan = 0;
            if (currentTime - lastDebugFan > 5000) {
              lastDebugFan = currentTime;
              Serial.printf("[AUTO] Check Fan: TempIn=%.1f (Thresh=%d), Status=%d -> NO ACTION\n", 
                            sensorData.tempIn, config.autoFanThreshold, sensorData.relayFanStatus);
            }
          }
        }
      }
      
      // ============ AUTO CLOSE DOOR WHEN RAINING ============
      bool isRaining = (sensorData.rainValue < RAIN_THRESHOLD);
      
      if (isRaining) {
        // Start or continue rain timer
        if (rainStartTime == 0) {
          rainStartTime = currentTime;
          Serial.println("[AUTO] Rain detected, starting persistent check...");
        }
        
        // Check if rain is persistent
        bool rainPersistent = (currentTime - rainStartTime >= RAIN_PERSISTENT_DURATION_MS);
        
        // Check user action priority
        bool userActionPriority = (currentTime - lastUserDoorAction < DOOR_USER_ACTION_DELAY_MS);
        
        if (rainPersistent && sensorData.doorOpen && !userActionPriority) {
          ServoCommand cmd = {0, true};
          xQueueSend(xDoorQueue, &cmd, 0);
          Serial.printf("[AUTO] Door CLOSE: Rain persistent for %lus\n", 
                        (currentTime - rainStartTime) / 1000);
        } else if (sensorData.doorOpen && userActionPriority) {
          static unsigned long lastDoorLog = 0;
          if (currentTime - lastDoorLog > 5000) {
            lastDoorLog = currentTime;
            Serial.printf("[AUTO] Door: User action priority (%lus remaining)\n",
                          (DOOR_USER_ACTION_DELAY_MS - (currentTime - lastUserDoorAction)) / 1000);
          }
        }
      } else {
        // Reset rain timer when no rain
        if (rainStartTime != 0) {
          Serial.println("[AUTO] Rain cleared, resetting timer");
          rainStartTime = 0;
        }
      }
      
      xSemaphoreGive(xSensorMutex);
    }
    
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// ============ FREERTOS TASK: EMERGENCY HANDLER ============
void taskEmergencyHandler(void *pvParameters) {
  // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  (void)pvParameters;
  EmergencyEvent evt;
  unsigned long emergencyStartTime = 0;
  bool buzzerState = false;

  while(1) {
    if (xQueueReceive(xEmergencyQueue, &evt, pdMS_TO_TICKS(200)) == pdTRUE) {
      if (evt.active) {
        if (currentEmergency == EMERGENCY_NONE) {
          emergencyStartTime = millis();
        }
        currentEmergency = (EmergencyType)((int)currentEmergency | (int)evt.type);
        
        Serial.println("[EMERGENCY] Triggered: " + String(evt.type == EMERGENCY_FIRE ? "FIRE" : "GAS"));
        
        // Emergency actions
        digitalWrite(PIN_RELAY_LIGHT, LOW);
        digitalWrite(PIN_RELAY_FAN, HIGH);
        
        if (evt.type == EMERGENCY_FIRE) {
          ServoCommand cmd = {180, true};
          xQueueSend(xDoorQueue, &cmd, 0);
        }
        
        sensorData.relayLightStatus = false;
        sensorData.relayFanStatus = true;
        
        // Send emergency notification to backend immediately
        if (backendConfig.isPaired) {
          // FIXED: Gửi full sensor data thay vì chỉ heartbeat
          // Để frontend nhận được cờ emergency ngay lập tức
          mqttPublishSensorData();
          sendHeartbeat(); // Gửi cả heartbeat để update status
        }
        
      } else {
        currentEmergency = (EmergencyType)((int)currentEmergency & ~(int)evt.type);
        if (currentEmergency == EMERGENCY_NONE) {
          Serial.println("[EMERGENCY] Cleared");
          noTone(PIN_BUZZER); // Buzzer OFF
          digitalWrite(PIN_LED, LOW);

          // Khôi phục trạng thái: tắt quạt + đèn + đóng cửa
          digitalWrite(PIN_RELAY_FAN, LOW);
          digitalWrite(PIN_RELAY_LIGHT, LOW);
          sensorData.relayFanStatus = false;
          sensorData.relayLightStatus = false;
          Serial.println("[EMERGENCY] Fan & Light turned OFF after emergency");

          // Đóng cửa sau emergency
          ServoCommand closeCmd = {0, true};
          xQueueSend(xDoorQueue, &closeCmd, 0);
          Serial.println("[EMERGENCY] Door close command sent");
          
          // Gửi update khi hết emergency
          if (backendConfig.isPaired) {
             mqttPublishSensorData();
             // Gửi status update cho từng device
             mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "OFF", "{\"power\":\"OFF\"}");
             mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "OFF", "{\"power\":\"OFF\"}");
          }
        }
      }
    }
    
    // Update emergency display and alerts
    if (currentEmergency != EMERGENCY_NONE) {
      buzzerState = !buzzerState;
      if (buzzerState) tone(PIN_BUZZER, 3000); else noTone(PIN_BUZZER); // Toggle tone
      digitalWrite(PIN_LED, buzzerState ? HIGH : LOW);
      
      if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print(buzzerState ? "!!! WARNING !!!" : "EVACUATE NOW!");
        lcd.setCursor(0, 1);
        
        if ((currentEmergency & EMERGENCY_FIRE) && (currentEmergency & EMERGENCY_GAS)) {
          lcd.print("FIRE + GAS!");
        } else if (currentEmergency & EMERGENCY_FIRE) {
          lcd.print("FIRE DETECTED!");
        } else {
          lcd.print("GAS LEAK!");
        }
        
        xSemaphoreGive(xLCDMutex);
      }
    }
    // esp_task_wdt_reset()  // WATCHDOG DISABLED;
  }
}

// ============ FREERTOS TASK: SERVO CONTROL ============
void taskServoControl(void *pvParameters) {
  // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  (void)pvParameters;
  ServoCommand cmd;
  unsigned long doorOpenTime = 0;

  while(1) {
    // Check for new servo commands
    if (xQueueReceive(xDoorQueue, &cmd, 0) == pdTRUE) {
      if (cmd.execute) {
        targetServoAngle = cmd.targetAngle;
        if (cmd.targetAngle > 0) {
          doorOpenTime = millis();
          sensorData.doorOpen = true;
          Serial.println("[DOOR] Opening");
          // Gửi status update khi mở cửa
          mqttPublishDeviceStatus(PIN_SERVO, "DOOR_SERVO", "ON", "{\"power\":\"ON\"}");
        } else {
          sensorData.doorOpen = false;
          Serial.println("[DOOR] Closing");
          // Gửi status update khi đóng cửa
          mqttPublishDeviceStatus(PIN_SERVO, "DOOR_SERVO", "OFF", "{\"power\":\"OFF\"}");
        }
      }
    }
    
    // Smooth servo movement (3° per step for faster rotation)
    if (currentServoAngle != targetServoAngle) {
      int step = 3; // Degrees per tick (higher = faster)
      if (currentServoAngle < targetServoAngle) {
        currentServoAngle = min(currentServoAngle + step, targetServoAngle);
      } else {
        currentServoAngle = max(currentServoAngle - step, targetServoAngle);
      }
      doorServo.write(currentServoAngle);
      sensorData.servoAngle = currentServoAngle;
      // esp_task_wdt_reset()  // WATCHDOG DISABLED;
      vTaskDelay(pdMS_TO_TICKS(15)); // 15ms per step (faster than 20ms)
    } else {
      if (sensorData.doorOpen && config.autoCloseDoor &&
          currentEmergency == EMERGENCY_NONE &&
          (millis() - doorOpenTime > DOOR_AUTO_CLOSE_MS)) {
        targetServoAngle = 0;
        // Door tự đóng - gửi status update ngay lập tức
        sensorData.doorOpen = false;
        mqttPublishDeviceStatus(PIN_SERVO, "DOOR_SERVO", "OFF", "{\"power\":\"OFF\"}");
        Serial.println("[DOOR] Auto-closed, status update sent");
      }
      // esp_task_wdt_reset()  // WATCHDOG DISABLED;
      vTaskDelay(pdMS_TO_TICKS(100));
    }
  }
}

// ============ RFID LEARN TASK ============
void taskLearnRFID(void *pvParameters) {
  if (allowedCardsCount >= MAX_ALLOWED_RFID_CARDS) {
    Serial.println("[RFID] Card storage full!");
    rfidLearningMode = false;
    rfidLearningComplete = true;
    rfidLearningSuccess = false;
    rfidLearningResult = "Card storage full";
    // Publish status before exiting
    mqttPublishRFIDLearnStatus();
    vTaskDelete(NULL);
    return;
  }
  
  Serial.println("[RFID] Learning mode started");
  
  if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    lcd.clear();
    lcd.print("Learning Mode");
    lcd.setCursor(0, 1);
    lcd.print("Place card...");
    xSemaphoreGive(xLCDMutex);
  }
  
  // Get card name from rfidLearningResult (set by API call)
  String cardName = rfidLearningResult.length() > 0 ? rfidLearningResult : ("Card #" + String(allowedCardsCount + 1));
  
  unsigned long timeout = millis() + 10000;
  bool learned = false;
  String learnedUid = "";
  
  while (millis() < timeout && !learned) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      // Build UID string
      learnedUid = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) learnedUid += "0";
        learnedUid += String(rfid.uid.uidByte[i], HEX);
      }
      learnedUid.toUpperCase();
      
      // Check if card already exists
      bool exists = false;
      for (uint8_t i = 0; i < allowedCardsCount; i++) {
        bool match = true;
        for (byte j = 0; j < 4; j++) {
          if (rfid.uid.uidByte[j] != rfidCards[i].uid[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          exists = true;
          rfidLearningResult = "Card already exists";
          break;
        }
      }
      
      if (!exists && allowedCardsCount < MAX_ALLOWED_RFID_CARDS) {
        if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
          // Save new card to RFIDCardInfo structure
          for (byte i = 0; i < 4; i++) {
            rfidCards[allowedCardsCount].uid[i] = rfid.uid.uidByte[i];
            allowedCards[allowedCardsCount][i] = rfid.uid.uidByte[i]; // Legacy support
          }
          
          // Set card name and metadata
          strncpy(rfidCards[allowedCardsCount].name, cardName.c_str(), sizeof(rfidCards[allowedCardsCount].name) - 1);
          rfidCards[allowedCardsCount].name[sizeof(rfidCards[allowedCardsCount].name) - 1] = '\0';
          rfidCards[allowedCardsCount].enabled = true;
          rfidCards[allowedCardsCount].lastUsed = 0;
          
          allowedCardsCount++;
          
          // Save to preferences
          saveRFIDCards();
          xSemaphoreGive(xConfigMutex);
        }
        
        Serial.println("[RFID] Card learned #" + String(allowedCardsCount) + ": " + learnedUid + " - " + cardName);
        
        // Visual feedback
        for (int i = 0; i < 3; i++) {
          tone(PIN_BUZZER, 2000);
          vTaskDelay(pdMS_TO_TICKS(100));
          noTone(PIN_BUZZER);
          vTaskDelay(pdMS_TO_TICKS(100));
        }
        
        learned = true;
        rfidLearningResult = learnedUid;
      }
      
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  
  // Update learning state
  rfidLearningMode = false;
  rfidLearningComplete = true;
  rfidLearningSuccess = learned;
  
  if (learned) {
    if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      lcd.clear();
      lcd.print("Card Learned!");
      lcd.setCursor(0, 1);
      lcd.print(cardName.substring(0, 16));
      xSemaphoreGive(xLCDMutex);
    }
  } else {
    if (rfidLearningResult != "Card already exists") {
      rfidLearningResult = "Timeout - no card detected";
    }
    if (xSemaphoreTake(xLCDMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      lcd.clear();
      lcd.print("Learn Failed");
      lcd.setCursor(0, 1);
      lcd.print(rfidLearningResult.substring(0, 16));
      xSemaphoreGive(xLCDMutex);
    }
  }
  
  // Publish learning status to MQTT so backend and frontend know it's complete
  mqttPublishRFIDLearnStatus();
  
  // If card was learned successfully, also publish updated cards list
  if (learned) {
    mqttPublishRFIDCardsList(nullptr);
  }
  
  vTaskDelay(pdMS_TO_TICKS(2000));
  vTaskDelete(NULL);
}

// ============ WEB SERVER HANDLERS ============
String getHTML() {
  String html;
  html.reserve(6144);
  
  html += String(HTML_HEADER);
  html.replace("%DEVICE_NAME%", config.deviceName);
  
  html += "<div class='container'>";
  
  // Header with connection status
  html += "<div class='header" + String(currentEmergency != EMERGENCY_NONE ? " emergency-mode" : "") + "'>";
  html += "<h1><i class='fas fa-home'></i> " + config.deviceName + "</h1>";
  html += "<p>IP: " + WiFi.localIP().toString() + " | RSSI: " + WiFi.RSSI() + " dBm</p>";
  html += "<p><span class='status-indicator " + String(backendConnected ? "status-connected" : "status-disconnected") + "'></span>";
  html += "Backend: " + String(backendConnected ? "Connected" : "Disconnected") + "</p>";
  html += "<p>Serial: " + backendConfig.serialNumber + "</p>";
  
  if (!backendConfig.isPaired) {
    html += "<div class='pairing-box'>";
    html += "<h3><i class='fas fa-link'></i> Pairing Required</h3>";
    html += "<p>Open Smart Home App and scan this Serial Number:</p>";
    html += "<div class='serial-number'>" + backendConfig.serialNumber + "</div>";
    html += "<p>Firmware: " + String(FIRMWARE_VERSION) + "</p>";
    html += "</div>";
  }
  
  html += "</div>";
  
  // Emergency alerts
  if (currentEmergency & EMERGENCY_FIRE) {
    html += "<div class='alert-danger'><i class='fas fa-fire'></i> FIRE DETECTED! EVACUATE!</div>";
  }
  if (currentEmergency & EMERGENCY_GAS) {
    html += "<div class='alert-danger'><i class='fas fa-skull-crossbones'></i> GAS LEAK! VENTILATE AREA!</div>";
  }
  
  html += "<div class='grid'>";
  
  // Sensor Data Card
  html += "<div class='card'><h3><i class='fas fa-thermometer'></i> Sensor Data</h3>";
  html += "<div class='sensor-item'><span>Temp Indoor</span><span class='sensor-value'>" + String(sensorData.tempIn, 1) + "°C</span></div>";
  html += "<div class='sensor-item'><span>Humidity Indoor</span><span>" + String(sensorData.humIn, 0) + "%</span></div>";
  html += "<div class='sensor-item'><span>Temp Outdoor</span><span>" + String(sensorData.tempOut, 1) + "°C</span></div>";
  html += "<div class='sensor-item'><span>Humidity Outdoor</span><span>" + String(sensorData.humOut, 0) + "%</span></div>";
  html += "<div class='sensor-item'><span>Gas Level</span><span><span class='status-indicator " + String(sensorData.gasAlert ? "status-danger" : "status-safe") + "'></span>" + String(sensorData.mq2Value) + "</span></div>";
  html += "<div class='sensor-item'><span>Light Level</span><span>" + String(sensorData.ldrValue) + "</span></div>";
  html += "<div class='sensor-item'><span>Rain Sensor</span><span>" + String(sensorData.rainValue) + "</span></div>";
  html += "<div class='sensor-item'><span>Motion</span><span><span class='status-indicator " + String(sensorData.motionDetected ? "status-warning" : "status-safe") + "'></span>" + String(sensorData.motionDetected ? "DETECTED" : "None") + "</span></div>";
  html += "<div class='sensor-item'><span>Flame Sensor</span><span><span class='status-indicator " + String((currentEmergency & EMERGENCY_FIRE) ? "status-danger" : "status-safe") + "'></span>" + String((currentEmergency & EMERGENCY_FIRE) ? "FIRE!" : "Safe") + "</span></div>";
  html += "</div>";
  
  // Controls Card
  html += "<div class='card'><h3><i class='fas fa-sliders-h'></i> Controls</h3>";
  html += "<div class='sensor-item'><span><i class='fas fa-lightbulb'></i> Light</span><span>" + String(sensorData.relayLightStatus ? "ON" : "OFF") + "</span></div>";
  html += (sensorData.relayLightStatus ? 
    "<button onclick=\"fetch('/api/light/off').then(()=>location.reload())\" class='btn btn-danger'><i class='fas fa-power-off'></i> OFF</button>" :
    "<button onclick=\"fetch('/api/light/on').then(()=>location.reload())\" class='btn btn-success'><i class='fas fa-power-off'></i> ON</button>");
  
  html += "<div class='sensor-item'><span><i class='fas fa-wind'></i> Fan</span><span>" + String(sensorData.relayFanStatus ? "ON" : "OFF") + "</span></div>";
  html += (sensorData.relayFanStatus ? 
    "<button onclick=\"fetch('/api/fan/off').then(()=>location.reload())\" class='btn btn-danger'><i class='fas fa-power-off'></i> OFF</button>" :
    "<button onclick=\"fetch('/api/fan/on').then(()=>location.reload())\" class='btn btn-success'><i class='fas fa-power-off'></i> ON</button>");
  
  html += "<div class='sensor-item'><span><i class='fas fa-door-open'></i> Door</span><span>" + String(sensorData.doorOpen ? "OPEN" : "CLOSED") + "</span></div>";
  html += (sensorData.doorOpen ?
    "<button onclick=\"fetch('/api/door/close').then(()=>location.reload())\" class='btn btn-danger'><i class='fas fa-door-closed'></i> Close</button>" :
    "<button onclick=\"fetch('/api/door/open').then(()=>location.reload())\" class='btn btn-success'><i class='fas fa-door-open'></i> Open</button>");
  html += "</div>";
  
  // Configuration Card
  html += "<div class='card'><h3><i class='fas fa-cog'></i> Configuration</h3>";
  html += "<div class='sensor-item'><span>Auto Light: " + String(config.autoLightEnabled ? "ON" : "OFF") + "</span>";
  html += "<button onclick=\"fetch('/api/config/auto_light/toggle').then(()=>location.reload())\" class='btn btn-primary'>Toggle</button></div>";
  
  html += "<div class='sensor-item'><span>Auto Fan: " + String(config.autoFanEnabled ? "ON" : "OFF") + "</span>";
  html += "<button onclick=\"fetch('/api/config/auto_fan/toggle').then(()=>location.reload())\" class='btn btn-primary'>Toggle</button></div>";
  
  html += "<div class='sensor-item'><span>RFID Cards: " + String(allowedCardsCount) + "/" + String(MAX_ALLOWED_RFID_CARDS) + "</span>";
  html += "<button onclick=\"if(confirm('Learn new card?'))fetch('/api/rfid/learn').then(()=>alert('Place card now!'))\" class='btn btn-primary'>Learn</button></div>";
  
  html += "<div class='sensor-item'><span>Clear All Cards</span>";
  html += "<button onclick=\"if(confirm('Delete all cards?'))fetch('/api/cards/clear').then(()=>location.reload())\" class='btn btn-danger'>Clear</button></div>";
  
  // Backend pairing
  if (backendConfig.isPaired) {
    html += "<div class='sensor-item'><span>Unpair from Backend</span>";
    html += "<button onclick=\"if(confirm('Unpair from backend?'))fetch('/api/backend/unpair').then(()=>location.reload())\" class='btn btn-danger'>Unpair</button></div>";
  }
  
  html += "</div>";
  
  // Backend Info Card
  html += "<div class='card'><h3><i class='fas fa-server'></i> Backend Connection</h3>";
  html += "<div class='sensor-item'><span>Status</span><span><span class='status-indicator " + String(backendConnected ? "status-connected" : "status-disconnected") + "'></span>" + String(backendConnected ? "Online" : "Offline") + "</span></div>";
  html += "<div class='sensor-item'><span>Paired</span><span>" + String(backendConfig.isPaired ? "Yes" : "No") + "</span></div>";
  html += "<div class='sensor-item'><span>Serial Number</span><span style='font-family:monospace;font-size:12px'>" + backendConfig.serialNumber + "</span></div>";
  html += "<div class='sensor-item'><span>Server IP</span><span style='font-family:monospace;font-size:12px'>" + backendConfig.serverIP + ":" + String(MQTT_BROKER_PORT) + "</span></div>";
  html += "<div class='sensor-item'><span>Firmware</span><span>" + String(FIRMWARE_VERSION) + "</span></div>";
  if (backendConfig.isPaired) {
    html += "<div class='sensor-item'><span>Home ID</span><span>" + String(backendConfig.homeId) + "</span></div>";
  }
  html += "</div>";
  
  html += "</div></div>";
  html += String(HTML_FOOTER);
  
  return html;
}

void handleRoot() { 
  server.send(200, "text/html", getHTML()); 
}

void handleData() {
  StaticJsonDocument<1024> doc;
  
  if (xSemaphoreTake(xSensorMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    doc["tempIn"] = sensorData.tempIn;
    doc["humIn"] = sensorData.humIn;
    doc["tempOut"] = sensorData.tempOut;
    doc["humOut"] = sensorData.humOut;
    doc["gas"] = sensorData.mq2Value;
    doc["light"] = sensorData.ldrValue;
    doc["rain"] = sensorData.rainValue;
    doc["flame"] = (currentEmergency & EMERGENCY_FIRE);
    doc["motion"] = sensorData.motionDetected;
    doc["door"] = sensorData.doorOpen;
    doc["lightStatus"] = sensorData.relayLightStatus;
    doc["fanStatus"] = sensorData.relayFanStatus;
    doc["gasAlert"] = sensorData.gasAlert;
    xSemaphoreGive(xSensorMutex);
  }
  
  doc["emergency"] = (currentEmergency != EMERGENCY_NONE);
  doc["emergencyFire"] = (currentEmergency & EMERGENCY_FIRE);
  doc["emergencyGas"] = (currentEmergency & EMERGENCY_GAS);
  
  // Backend connection info
  doc["backendConnected"] = backendConnected;
  doc["isPaired"] = backendConfig.isPaired;
  doc["serialNumber"] = backendConfig.serialNumber;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  
  if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    doc["autoLight"] = config.autoLightEnabled;
    doc["autoFan"] = config.autoFanEnabled;
    doc["autoClose"] = config.autoCloseDoor;
    doc["cardsCount"] = allowedCardsCount;
    xSemaphoreGive(xConfigMutex);
  }
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// ============ SETUP ============
void setup() {
  Serial.begin(DEBUG_BAUD_RATE);
  Serial.println("\n\n=== SMART HOME FREERTOS v" + String(FIRMWARE_VERSION) + " ===");
  
  // Create mutexes
  xSensorMutex = xSemaphoreCreateMutex();
  xConfigMutex = xSemaphoreCreateMutex();
  xLCDMutex = xSemaphoreCreateMutex();
  xBackendMutex = xSemaphoreCreateMutex();
  
  // Create queues
  xEmergencyQueue = xQueueCreate(QUEUE_SIZE_EMERGENCY, sizeof(EmergencyEvent));
  xDoorQueue = xQueueCreate(QUEUE_SIZE_DOOR, sizeof(ServoCommand));
  xCommandQueue = xQueueCreate(QUEUE_SIZE_COMMAND, sizeof(DeviceCommand));

  // Initialize MQTT-only mode structures
  memset(processedCommands, 0, sizeof(processedCommands));
  processedCommandsHead = 0;
  processedCommandsCount = 0;
  mqttRetryDelay = MQTT_RETRY_MIN_MS;
  mqttDisconnectStartTime = 0;

  // Watchdog - DISABLED for simplicity
  // esp_err_t wdt_err = esp_task_wdt_deinit();
  // if (wdt_err == ESP_OK) {
  //   Serial.println("[WDT] Default TWDT deinitialized");
  // } else if (wdt_err == ESP_ERR_INVALID_STATE) {
  //   Serial.println("[WDT] TWDT not initialized, proceeding...");
  // }
  // 
  // // Initialize with custom config
  // esp_task_wdt_config_t wdt_config = {
  //   .timeout_ms = WDT_TIMEOUT_SECONDS * 1000,
  //   .idle_core_mask = 0,
  //   .trigger_panic = true
  // };
  // esp_err_t init_err = esp_task_wdt_init(&wdt_config);
  // if (init_err == ESP_OK) {
  //   Serial.println("[WDT] Custom TWDT initialized (30s timeout)");
  //   // esp_task_wdt_add(NULL)  // WATCHDOG DISABLED;
  // } else {
  //   Serial.print("[WDT] Failed to initialize: ");
  //   Serial.println(init_err);
  // }
  Serial.println("[WDT] Watchdog disabled");

  // Preferences
  preferences.begin("smart-home", false);
  loadConfiguration();
  loadRFIDCards();
  loadBackendConfig();
  
  // Pin setup
  pinMode(PIN_RELAY_LIGHT, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_RAIN, INPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_FLAME, INPUT_PULLUP);
  pinMode(PIN_MQ2, INPUT);
  pinMode(PIN_LDR, INPUT);
  
  digitalWrite(PIN_RELAY_LIGHT, LOW);
    digitalWrite(PIN_RELAY_FAN, LOW);
  digitalWrite(PIN_LED, LOW);
  noTone(PIN_BUZZER); // Init buzzer LOW
  
  // I2C & LCD - FIXED: Giảm tốc độ I2C và thêm delay sau init
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(50000);  // Giảm từ 100kHz xuống 50kHz để ổn định hơn
  delay(100);  // Cho I2C bus ổn định
  
  lcd.init();
  delay(200);  // CRITICAL: LCD cần thời gian khởi tạo
  lcd.backlight();
  delay(50);
  lcd.clear();
  delay(50);
  lcd.setCursor(0, 0);
  lcd.print(config.deviceName);
  lcd.setCursor(0, 1);
  lcd.print("FreeRTOS Init...");
  
  // Servo
  ESP32PWM::allocateTimer(0);
  doorServo.setPeriodHertz(50);
  doorServo.attach(PIN_SERVO, 500, 2400);
  doorServo.write(0);
  
  // RFID - FIXED: Set RST pin HIGH trước khi init
  pinMode(PIN_RST_RFID, OUTPUT);
  digitalWrite(PIN_RST_RFID, HIGH);  // RST phải HIGH để module hoạt động
  delay(50);
  
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SS_RFID);
  delay(50);  // SPI bus stabilize
  
  rfid.PCD_Init();
  delay(100);  // MFRC522 cần thời gian khởi tạo
  
  // FIXED: Tăng antenna gain lên MAX thay vì avg
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);
  
  // Kiểm tra RFID module hoạt động
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print("[RFID] MFRC522 Version: 0x");
  Serial.println(version, HEX);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("[RFID] WARNING: Cannot communicate with MFRC522!");
  }
  
  // DHT
  dhtIn.begin();
  dhtOut.begin();
  
  // Interrupts
  // FIXED: Chuyển Flame Sensor sang polling trong SensorTask để ổn định hơn
  // attachInterrupt(digitalPinToInterrupt(PIN_FLAME), flameISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_PIR), motionISR, CHANGE);
  
  // WiFi
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Setup...");
  lcd.setCursor(0, 1);
  lcd.print("SN:" + backendConfig.serialNumber.substring(0, 10));
  
  // Check Boot Button for WiFi Config Mode
  pinMode(PIN_BOOT, INPUT_PULLUP);
  delay(100); // Short delay for debounce
  
  WiFiManager wm;
  String apName = "SmartHome-" + backendConfig.serialNumber.substring(0, 6);
  
  // ============ Custom WiFiManager Parameter: Server IP ============
  // Thêm input field cho Backend/MQTT Server IP vào WiFi Config Portal
  // Giá trị mặc định lấy từ Preferences (hoặc config.h nếu chưa cấu hình)
  WiFiManagerParameter custom_server_ip(
    "server_ip",                              // ID
    "Backend/MQTT Server IP",                 // Label hiển thị
    backendConfig.serverIP.c_str(),            // Giá trị mặc định
    40                                        // Max length
  );
  wm.addParameter(&custom_server_ip);
  
  // Callback khi lưu cấu hình WiFi - cũng lưu server IP
  wm.setSaveParamsCallback([&custom_server_ip]() {
    String newIP = String(custom_server_ip.getValue());
    newIP.trim();
    if (newIP.length() > 0) {
      backendConfig.serverIP = newIP;
      // Lưu trực tiếp vào Preferences (không dùng saveBackendConfig để tránh mutex issue trong callback)
      Preferences prefs;
      prefs.begin("smart-home", false);
      prefs.putString("server_ip", backendConfig.serverIP);
      prefs.end();
      Serial.println("[WIFI] Server IP saved: " + backendConfig.serverIP);
    }
  });
  
  // If Boot button is pressed (LOW), enter Config Portal immediately
  if (digitalRead(PIN_BOOT) == LOW) {
    Serial.println("[WIFI] Boot button pressed - Forcing WiFi Config Mode");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Config Mode");
    lcd.setCursor(0, 1);
    lcd.print("AP:" + apName);
    
    // Start config portal without auto-connect (blocking) - NO PASSWORD
    if (!wm.startConfigPortal(apName.c_str())) {
      Serial.println("[WIFI] Config portal failed/timeout");
      delay(3000);
      ESP.restart();
    }
    Serial.println("[WIFI] Config portal finished");
  } else {
    // Normal startup - auto connect - NO PASSWORD for fallback AP
    Serial.println("WiFi AP: " + apName + " (Open)");
    wm.setConfigPortalTimeout(180);
    
    if (!wm.autoConnect(apName.c_str())) {
      ESP.restart();
    }
  }
  
  // Log server IP đang sử dụng sau khi WiFi connected
  Serial.println("[WIFI] Server IP in use: " + backendConfig.serverIP);
  
  Serial.println("[WIFI] IP: " + WiFi.localIP().toString());
  
  // Web Server Routes
  server.on("/", handleRoot);
  server.on("/api/data", handleData);
  
  server.on("/api/light/on", []() {
    if (currentEmergency == EMERGENCY_NONE) {
      digitalWrite(PIN_RELAY_LIGHT, HIGH);
      sensorData.relayLightStatus = true;
      // Gửi status update ngay lập tức
      mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "ON", "{\"power\":\"ON\"}");
      server.send(200, "application/json", "{\"status\":\"ok\"}");
    } else {
      server.send(200, "application/json", "{\"status\":\"error\",\"msg\":\"Emergency\"}");
    }
  });
  
  server.on("/api/light/off", []() {
    digitalWrite(PIN_RELAY_LIGHT, LOW);
    sensorData.relayLightStatus = false;
    // Gửi status update ngay lập tức
    mqttPublishDeviceStatus(PIN_RELAY_LIGHT, "LIGHT_RELAY", "OFF", "{\"power\":\"OFF\"}");
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  });
  
  server.on("/api/door/open", []() {
    ServoCommand cmd = {180, true};
    xQueueSend(xDoorQueue, &cmd, 0);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  });
  
  server.on("/api/door/close", []() {
    if (currentEmergency == EMERGENCY_NONE) {
      ServoCommand cmd = {0, true};
      xQueueSend(xDoorQueue, &cmd, 0);
      server.send(200, "application/json", "{\"status\":\"ok\"}");
    } else {
      server.send(200, "application/json", "{\"status\":\"error\",\"msg\":\"Door locked\"}");
    }
  });

  server.on("/api/fan/on", []() {
    if (currentEmergency == EMERGENCY_NONE) {
      digitalWrite(PIN_RELAY_FAN, HIGH);
      if (xSemaphoreTake(xSensorMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        sensorData.relayFanStatus = true;
        xSemaphoreGive(xSensorMutex);
      }
      // Gửi status update ngay lập tức
      mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "ON", "{\"power\":\"ON\"}");
      server.send(200, "application/json", "{\"status\":\"ok\"}");
    } else {
      server.send(200, "application/json", "{\"status\":\"error\",\"msg\":\"Fan locked in emergency\"}");
    }
  });

  server.on("/api/fan/off", []() {
    if (currentEmergency == EMERGENCY_NONE) {
      digitalWrite(PIN_RELAY_FAN, LOW);
      if (xSemaphoreTake(xSensorMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        sensorData.relayFanStatus = false;
        xSemaphoreGive(xSensorMutex);
      }
      // Gửi status update ngay lập tức
      mqttPublishDeviceStatus(PIN_RELAY_FAN, "FAN_RELAY", "OFF", "{\"power\":\"OFF\"}");
      server.send(200, "application/json", "{\"status\":\"ok\"}");
    } else {
      server.send(200, "application/json", "{\"status\":\"error\",\"msg\":\"Emergency mode\"}");
    }
  });

  server.on("/api/config/auto_light/toggle", []() {
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      config.autoLightEnabled = !config.autoLightEnabled;
      
      // If disabling auto mode, turn off the device
      if (!config.autoLightEnabled && sensorData.relayLightStatus) {
        DeviceCommand cmd;
        cmd.type = CMD_LIGHT_OFF;
        xQueueSend(xCommandQueue, &cmd, 0);
        Serial.println("[CONFIG] Auto Light disabled, queuing LIGHT OFF");
      }
      
      saveConfiguration();
      triggerSyncFlag = true;  // Sync all states to backend
      xSemaphoreGive(xConfigMutex);
    }
    server.send(200, "application/json", "{\"status\":\"ok\",\"autoLightEnabled\":" + String(config.autoLightEnabled ? "true" : "false") + "}");
  });

  server.on("/api/config/auto_fan/toggle", []() {
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      config.autoFanEnabled = !config.autoFanEnabled;
      
      // If disabling auto mode, turn off the device
      if (!config.autoFanEnabled && sensorData.relayFanStatus) {
        DeviceCommand cmd;
        cmd.type = CMD_FAN_OFF;
        xQueueSend(xCommandQueue, &cmd, 0);
        Serial.println("[CONFIG] Auto Fan disabled, queuing FAN OFF");
      }
      
      saveConfiguration();
      triggerSyncFlag = true;  // Sync all states to backend
      xSemaphoreGive(xConfigMutex);
    }
    server.send(200, "application/json", "{\"status\":\"ok\",\"autoFanEnabled\":" + String(config.autoFanEnabled ? "true" : "false") + "}");
  });

  // ============ RFID MANAGEMENT API ENDPOINTS ============
  
  // GET /api/rfid/list - Liệt kê tất cả thẻ RFID
  server.on("/api/rfid/list", HTTP_GET, []() {
    StaticJsonDocument<1024> doc;
    JsonArray cards = doc.createNestedArray("cards");
    
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      for (uint8_t i = 0; i < allowedCardsCount; i++) {
        JsonObject card = cards.createNestedObject();
        card["index"] = i;
        
        // Build UID string
        String uid = "";
        for (int j = 0; j < 4; j++) {
          if (rfidCards[i].uid[j] < 0x10) uid += "0";
          uid += String(rfidCards[i].uid[j], HEX);
        }
        uid.toUpperCase();
        card["uid"] = uid;
        card["name"] = String(rfidCards[i].name);
        card["enabled"] = rfidCards[i].enabled;
        card["lastUsed"] = rfidCards[i].lastUsed;
      }
      xSemaphoreGive(xConfigMutex);
    }
    
    doc["count"] = allowedCardsCount;
    doc["maxCards"] = MAX_ALLOWED_RFID_CARDS;
    doc["learningMode"] = rfidLearningMode;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // POST /api/rfid/learn - Bắt đầu chế độ học thẻ mới
  server.on("/api/rfid/learn", HTTP_POST, []() {
    if (allowedCardsCount >= MAX_ALLOWED_RFID_CARDS) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Card storage full\",\"maxCards\":" + String(MAX_ALLOWED_RFID_CARDS) + "}");
      return;
    }
    
    if (rfidLearningMode) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Already in learning mode\"}");
      return;
    }
    
    // Reset learning state
    rfidLearningMode = true;
    rfidLearningComplete = false;
    rfidLearningSuccess = false;
    rfidLearningResult = "";
    
    // Get optional card name from request body
    String cardName = "Card #" + String(allowedCardsCount + 1);
    if (server.hasArg("plain")) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, server.arg("plain")) == DeserializationError::Ok) {
        if (doc.containsKey("name")) {
          cardName = doc["name"].as<String>();
        }
      }
    }
    
    // Store card name in result for later use
    rfidLearningResult = cardName;
    
    server.send(200, "application/json", "{\"status\":\"learning\",\"msg\":\"Place card on reader within 10 seconds\",\"timeout\":10}");
    xTaskCreate(taskLearnRFID, "LearnRFID", STACK_SIZE_LEARN_RFID, NULL, 1, NULL);
  });
  
  // GET /api/rfid/learn/status - Kiểm tra trạng thái learning mode
  server.on("/api/rfid/learn/status", HTTP_GET, []() {
    StaticJsonDocument<256> doc;
    doc["learningMode"] = rfidLearningMode;
    doc["complete"] = rfidLearningComplete;
    doc["success"] = rfidLearningSuccess;
    doc["result"] = rfidLearningResult;
    doc["cardCount"] = allowedCardsCount;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // DELETE /api/rfid/card/{index} - Xóa thẻ theo index
  server.on("/api/rfid/card", HTTP_DELETE, []() {
    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Missing index parameter\"}");
      return;
    }
    
    StaticJsonDocument<64> doc;
    if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid JSON\"}");
      return;
    }
    
    int index = doc["index"] | -1;
    
    if (index < 0 || index >= allowedCardsCount) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid card index\"}");
      return;
    }
    
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      // Shift remaining cards
      for (int i = index; i < allowedCardsCount - 1; i++) {
        memcpy(&rfidCards[i], &rfidCards[i + 1], sizeof(RFIDCardInfo));
        memcpy(allowedCards[i], allowedCards[i + 1], 4);
      }
      allowedCardsCount--;
      
      // Save to preferences
      saveRFIDCards();
      xSemaphoreGive(xConfigMutex);
    }
    
    Serial.println("[RFID] Card deleted at index: " + String(index));
    server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"Card deleted\",\"cardCount\":" + String(allowedCardsCount) + "}");
  });
  
  // PUT /api/rfid/card - Cập nhật thông tin thẻ (tên, enabled)
  server.on("/api/rfid/card", HTTP_PUT, []() {
    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Missing request body\"}");
      return;
    }
    
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid JSON\"}");
      return;
    }
    
    int index = doc["index"] | -1;
    
    if (index < 0 || index >= allowedCardsCount) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid card index\"}");
      return;
    }
    
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      if (doc.containsKey("name")) {
        String name = doc["name"].as<String>();
        strncpy(rfidCards[index].name, name.c_str(), sizeof(rfidCards[index].name) - 1);
        rfidCards[index].name[sizeof(rfidCards[index].name) - 1] = '\0';
      }
      
      if (doc.containsKey("enabled")) {
        rfidCards[index].enabled = doc["enabled"].as<bool>();
      }
      
      // Save to preferences
      saveRFIDCards();
      xSemaphoreGive(xConfigMutex);
    }
    
    Serial.println("[RFID] Card updated at index: " + String(index));
    server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"Card updated\"}");
  });
  
  // POST /api/rfid/clear - Xóa tất cả thẻ
  server.on("/api/rfid/clear", HTTP_POST, []() {
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      allowedCardsCount = 0;
      preferences.putUInt("card_count", 0);
      xSemaphoreGive(xConfigMutex);
    }
    Serial.println("[RFID] All cards cleared");
    server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"All cards cleared\"}");
  });
  
  // Legacy endpoint for backward compatibility
  server.on("/api/cards/clear", []() {
    if (xSemaphoreTake(xConfigMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      allowedCardsCount = 0;
      preferences.putUInt("card_count", 0);
      xSemaphoreGive(xConfigMutex);
    }
    server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"All cards cleared\"}");
  });
  
  // Backend pairing endpoint - called by frontend to set API key
  server.on("/api/backend/pair", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, server.arg("plain"));
      
      if (!error) {
        String apiKey = doc["apiKey"] | "";
        long mcuGatewayId = doc["mcuGatewayId"] | 0;
        long homeId = doc["homeId"] | 0;
        
        if (!apiKey.isEmpty() && mcuGatewayId > 0 && homeId > 0) {
          backendConfig.apiKey = apiKey;
          backendConfig.mcuGatewayId = mcuGatewayId;
          backendConfig.homeId = homeId;
          backendConfig.isPaired = true;
          saveBackendConfig();
          
          Serial.println("[BACKEND] Paired successfully!");
          Serial.println("  MCU ID: " + String(mcuGatewayId));
          Serial.println("  Home ID: " + String(homeId));
          
          server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"Paired successfully\"}");
          return;
        }
      }
    }
    server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid request\"}");
  });
  
  // Unpair from backend
  server.on("/api/backend/unpair", []() {
    backendConfig.apiKey = "";
    backendConfig.isPaired = false;
    backendConfig.mcuGatewayId = 0;
    backendConfig.homeId = 0;
    saveBackendConfig();
    backendConnected = false;
    server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"Unpaired from backend\"}");
  });
  
  // Trigger heartbeat immediately - called by backend to request immediate data update
  server.on("/api/backend/trigger-heartbeat", HTTP_POST, []() {
    if (!backendConfig.isPaired) {
      server.send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Not paired\"}");
      return;
    }
    
    Serial.println("[BACKEND] Trigger heartbeat requested - sending immediately");
    
    // Send heartbeat immediately (blocking but fast, usually < 500ms)
    bool success = sendHeartbeat();
    
    if (success) {
      server.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"Heartbeat sent successfully\"}");
    } else {
      server.send(500, "application/json", "{\"status\":\"error\",\"msg\":\"Failed to send heartbeat\"}");
    }
  });
  
  // Get device info for pairing
  server.on("/api/device/info", []() {
    StaticJsonDocument<256> doc;
    doc["serialNumber"] = backendConfig.serialNumber;
    doc["deviceName"] = backendConfig.deviceName;
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["deviceType"] = DEVICE_TYPE;
    doc["ipAddress"] = WiFi.localIP().toString();
    doc["isPaired"] = backendConfig.isPaired;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // ============ GPIO PINS ENDPOINT (Similar to Blynk Virtual Pins) ============
  // Trả về danh sách các GPIO pins có sẵn để điều khiển thiết bị
  server.on("/api/gpio/available", HTTP_GET, []() {
    StaticJsonDocument<1024> doc;
    JsonArray pins = doc.createNestedArray("pins");
    
    // Output pins (Actuators - có thể điều khiển)
    JsonObject lightRelay = pins.createNestedObject();
    lightRelay["gpio"] = PIN_RELAY_LIGHT;
    lightRelay["name"] = "Light Relay";
    lightRelay["code"] = "LIGHT_RELAY";
    lightRelay["type"] = "OUTPUT";
    lightRelay["deviceType"] = "LIGHT";
    lightRelay["currentState"] = sensorData.relayLightStatus ? "ON" : "OFF";
    lightRelay["controllable"] = true;
    
    JsonObject fanRelay = pins.createNestedObject();
    fanRelay["gpio"] = PIN_RELAY_FAN;
    fanRelay["name"] = "Fan Relay";
    fanRelay["code"] = "FAN_RELAY";
    fanRelay["type"] = "OUTPUT";
    fanRelay["deviceType"] = "FAN";
    fanRelay["currentState"] = sensorData.relayFanStatus ? "ON" : "OFF";
    fanRelay["controllable"] = true;
    
    JsonObject doorServo = pins.createNestedObject();
    doorServo["gpio"] = PIN_SERVO;
    doorServo["name"] = "Door Servo";
    doorServo["code"] = "DOOR_SERVO";
    doorServo["type"] = "OUTPUT";
    doorServo["deviceType"] = "DOOR";
    doorServo["currentState"] = sensorData.doorOpen ? "OPEN" : "CLOSED";
    doorServo["controllable"] = true;
    
    // Input pins (Sensors - chỉ đọc)
    JsonObject gasSensor = pins.createNestedObject();
    gasSensor["gpio"] = PIN_MQ2;
    gasSensor["name"] = "Gas Sensor (MQ2)";
    gasSensor["code"] = "GAS_SENSOR";
    gasSensor["type"] = "INPUT_ANALOG";
    gasSensor["deviceType"] = "SENSOR";
    gasSensor["currentValue"] = sensorData.mq2Value;
    gasSensor["controllable"] = false;
    
    JsonObject lightSensor = pins.createNestedObject();
    lightSensor["gpio"] = PIN_LDR;
    lightSensor["name"] = "Light Sensor (LDR)";
    lightSensor["code"] = "LIGHT_SENSOR";
    lightSensor["type"] = "INPUT_ANALOG";
    lightSensor["deviceType"] = "SENSOR";
    lightSensor["currentValue"] = sensorData.ldrValue;
    lightSensor["controllable"] = false;
    
    JsonObject flameSensor = pins.createNestedObject();
    flameSensor["gpio"] = PIN_FLAME;
    flameSensor["name"] = "Flame Sensor";
    flameSensor["code"] = "FLAME_SENSOR";
    flameSensor["type"] = "INPUT_DIGITAL";
    flameSensor["deviceType"] = "SENSOR";
    flameSensor["currentValue"] = (currentEmergency & EMERGENCY_FIRE) ? true : false;
    flameSensor["controllable"] = false;
    
    JsonObject dhtIn = pins.createNestedObject();
    dhtIn["gpio"] = PIN_DHT_IN;
    dhtIn["name"] = "DHT Indoor (Temp & Humidity)";
    dhtIn["code"] = "TEMP_HUMIDITY_IN";
    dhtIn["type"] = "INPUT_DIGITAL";
    dhtIn["deviceType"] = "SENSOR";
    dhtIn["tempIn"] = sensorData.tempIn;
    dhtIn["humIn"] = sensorData.humIn;
    dhtIn["controllable"] = false;
    
    JsonObject dhtOut = pins.createNestedObject();
    dhtOut["gpio"] = PIN_DHT_OUT;
    dhtOut["name"] = "DHT Outdoor (Temp & Humidity)";
    dhtOut["code"] = "TEMP_HUMIDITY_OUT";
    dhtOut["type"] = "INPUT_DIGITAL";
    dhtOut["deviceType"] = "SENSOR";
    dhtOut["tempOut"] = sensorData.tempOut;
    dhtOut["humOut"] = sensorData.humOut;
    dhtOut["controllable"] = false;
    
    JsonObject motionSensor = pins.createNestedObject();
    motionSensor["gpio"] = PIN_PIR;
    motionSensor["name"] = "Motion Sensor (PIR)";
    motionSensor["code"] = "MOTION_SENSOR";
    motionSensor["type"] = "INPUT_DIGITAL";
    motionSensor["deviceType"] = "SENSOR";
    motionSensor["currentValue"] = sensorData.motionDetected;
    motionSensor["controllable"] = false;
    
    JsonObject rainSensor = pins.createNestedObject();
    rainSensor["gpio"] = PIN_RAIN;
    rainSensor["name"] = "Rain Sensor";
    rainSensor["code"] = "RAIN_SENSOR";
    rainSensor["type"] = "INPUT_ANALOG";
    rainSensor["deviceType"] = "SENSOR";
    rainSensor["currentValue"] = sensorData.rainValue;
    rainSensor["controllable"] = false;
    
    // Metadata
    doc["totalPins"] = 10;
    doc["controllablePins"] = 3;
    doc["sensorPins"] = 7;
    doc["serialNumber"] = backendConfig.serialNumber;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // Control GPIO pin directly by pin number
  server.on("/api/gpio/control", HTTP_POST, []() {
    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"error\":\"No body\"}");
      return;
    }
    
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (error) {
      server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }
    
    int gpio = doc["gpio"] | -1;
    String command = doc["command"] | "";
    
    if (gpio < 0 || command.isEmpty()) {
      server.send(400, "application/json", "{\"error\":\"Missing gpio or command\"}");
      return;
    }
    
    // Emergency check
    if (currentEmergency != EMERGENCY_NONE && command != "TURN_OFF") {
      server.send(403, "application/json", "{\"error\":\"Emergency mode active\"}");
      return;
    }
    
    DeviceCommand cmd;
    bool validPin = true;
    
    // Map GPIO to command type
    if (gpio == PIN_RELAY_LIGHT) {
      cmd.type = (command == "TURN_ON") ? CMD_LIGHT_ON : CMD_LIGHT_OFF;
    } else if (gpio == PIN_RELAY_FAN) {
      cmd.type = (command == "TURN_ON") ? CMD_FAN_ON : CMD_FAN_OFF;
    } else if (gpio == PIN_SERVO) {
      cmd.type = (command == "TURN_ON" || command == "OPEN") ? CMD_DOOR_OPEN : CMD_DOOR_CLOSE;
    } else {
      validPin = false;
    }
    
    if (!validPin) {
      server.send(400, "application/json", "{\"error\":\"Invalid controllable GPIO pin\"}");
      return;
    }
    
    // Queue command
    xQueueSend(xCommandQueue, &cmd, 0);
    
    // Trigger heartbeat để đồng bộ state ngay lập tức
    triggerHeartbeatFlag = true;
    
    StaticJsonDocument<128> responseDoc;
    responseDoc["status"] = "ok";
    responseDoc["gpio"] = gpio;
    responseDoc["command"] = command;
    responseDoc["message"] = "Command queued successfully";
    
    String response;
    serializeJson(responseDoc, response);
    server.send(200, "application/json", response);
  });
  
  server.begin();
  Serial.println("[HTTP] Server started");
  
  // Display IP
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("IP:");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());
  delay(3000);
  
  // Create FreeRTOS Tasks
  Serial.println("[RTOS] Creating tasks...");
  
  xTaskCreatePinnedToCore(
    taskSensorRead,
    "SensorTask",
    STACK_SIZE_SENSOR,
    NULL,
    PRIORITY_SENSOR,
    &taskHandleSensors,
    1
  );
  
  xTaskCreatePinnedToCore(
    taskLCDUpdate,
    "LCDTask",
    STACK_SIZE_LCD,
    NULL,
    PRIORITY_LCD,
    &taskHandleLCD,
    0
  );
  
  xTaskCreatePinnedToCore(
    taskRFIDCheck,
    "RFIDTask",
    STACK_SIZE_RFID,
    NULL,
    PRIORITY_RFID,
    &taskHandleRFID,
    0
  );
  
  xTaskCreatePinnedToCore(
    taskWebServer,
    "WebTask",
    STACK_SIZE_WEB,
    NULL,
    PRIORITY_WEB,
    &taskHandleWeb,
    1
  );
  
  xTaskCreatePinnedToCore(
    taskAutomation,
    "AutoTask",
    STACK_SIZE_AUTOMATION,
    NULL,
    PRIORITY_AUTOMATION,
    &taskHandleAutomation,
    1
  );
  
  xTaskCreatePinnedToCore(
    taskEmergencyHandler,
    "EmergencyTask",
    STACK_SIZE_EMERGENCY,
    NULL,
    PRIORITY_EMERGENCY,
    &taskHandleEmergency,
    0
  );
  
  xTaskCreatePinnedToCore(
    taskServoControl,
    "ServoTask",
    STACK_SIZE_SERVO,
    NULL,
    PRIORITY_SERVO,
    &taskHandleServo,
    0
  );
  
  // Backend communication task (HTTP fallback for pairing)
  xTaskCreatePinnedToCore(
    taskBackendComm,
    "BackendTask",
    STACK_SIZE_BACKEND,
    NULL,
    PRIORITY_BACKEND,
    &taskHandleBackend,
    1
  );
  
  // MQTT communication task (primary communication method)
  xTaskCreatePinnedToCore(
    taskMQTT,
    "MQTTTask",
    10240,  // 8KB stack for MQTT
    NULL,
    PRIORITY_BACKEND,
    &taskHandleMQTT,
    1
  );
  
  // Command executor task
  xTaskCreatePinnedToCore(
    taskCommandExecutor,
    "CmdExecTask",
    STACK_SIZE_COMMAND,
    NULL,
    PRIORITY_COMMAND,
    NULL,
    1
  );

  // Memory monitor task (optional – logs heap stats every 30s)
  xTaskCreate(taskMemoryMonitor, "MemMon", 2048, NULL, 0, NULL);

  // Boot button monitor task - hold BOOT 5s to clear pairing & restart
  xTaskCreate(taskBootButtonMonitor, "BootBtn", 4096, NULL, 1, NULL);

  // Door toggle button task (shared pin with buzzer)
  xTaskCreate(taskDoorButton, "DoorBtn", 4096, NULL, 1, NULL);

  // Command ack retry task


  Serial.println("[RTOS] All tasks created (including MQTT)!");
  Serial.println("[SYSTEM] Ready!");
  Serial.println("Serial Number: " + backendConfig.serialNumber);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(config.deviceName);
  lcd.setCursor(0, 1);
  lcd.print("Ready!");
}

void loop() {
  // esp_task_wdt_reset()  // WATCHDOG DISABLED;
  vTaskDelay(pdMS_TO_TICKS(1000));
}

// ============ HELPER FUNCTIONS ============
void loadConfiguration() {
  config.autoLightThreshold = preferences.getInt("light_th", 500);
  config.autoFanThreshold = preferences.getInt("fan_th", 30);
  config.gasAlertThreshold = preferences.getInt("gas_th", 1500);
  config.autoLightEnabled = preferences.getBool("auto_light", true);
  config.autoFanEnabled = preferences.getBool("auto_fan", true);
  config.autoCloseDoor = preferences.getBool("auto_close", true);
  
  String name = preferences.getString("dev_name", "");
  if (name.length() > 0) {
    config.deviceName = name;
  }
  
  Serial.println("[CONFIG] Loaded");
}

void saveConfiguration() {
  preferences.putInt("light_th", config.autoLightThreshold);
  preferences.putInt("fan_th", config.autoFanThreshold);
  preferences.putInt("gas_th", config.gasAlertThreshold);
  preferences.putBool("auto_light", config.autoLightEnabled);
  preferences.putBool("auto_fan", config.autoFanEnabled);
  preferences.putBool("auto_close", config.autoCloseDoor);
  
  Serial.println("[CONFIG] Saved to preferences");
}

void loadRFIDCards() {
  allowedCardsCount = preferences.getUInt("card_count", 0);
  if (allowedCardsCount > MAX_ALLOWED_RFID_CARDS) {
    allowedCardsCount = MAX_ALLOWED_RFID_CARDS;
  }
  
  for (uint8_t i = 0; i < allowedCardsCount; i++) {
    // Load UID
    String keyUid = "card_uid_" + String(i);
    String keyName = "card_name_" + String(i);
    String keyEnabled = "card_en_" + String(i);
    String keyLastUsed = "card_lu_" + String(i);
    
    // Try new format first
    if (preferences.isKey(keyUid.c_str())) {
      preferences.getBytes(keyUid.c_str(), rfidCards[i].uid, 4);
      String name = preferences.getString(keyName.c_str(), "Card #" + String(i + 1));
      strncpy(rfidCards[i].name, name.c_str(), sizeof(rfidCards[i].name) - 1);
      rfidCards[i].name[sizeof(rfidCards[i].name) - 1] = '\0';
      rfidCards[i].enabled = preferences.getBool(keyEnabled.c_str(), true);
      rfidCards[i].lastUsed = preferences.getULong(keyLastUsed.c_str(), 0);
    } else {
      // Fallback to legacy format
      String legacyKey = "card" + String(i);
      preferences.getBytes(legacyKey.c_str(), rfidCards[i].uid, 4);
      String defaultName = "Card #" + String(i + 1);
      strncpy(rfidCards[i].name, defaultName.c_str(), sizeof(rfidCards[i].name) - 1);
      rfidCards[i].name[sizeof(rfidCards[i].name) - 1] = '\0';
      rfidCards[i].enabled = true;
      rfidCards[i].lastUsed = 0;
    }
    
    // Copy to legacy array for backward compatibility
    memcpy(allowedCards[i], rfidCards[i].uid, 4);
  }
  
  Serial.println("[RFID] Loaded " + String(allowedCardsCount) + " cards");
}

void saveRFIDCards() {
  preferences.putUInt("card_count", allowedCardsCount);
  
  for (uint8_t i = 0; i < allowedCardsCount; i++) {
    String keyUid = "card_uid_" + String(i);
    String keyName = "card_name_" + String(i);
    String keyEnabled = "card_en_" + String(i);
    String keyLastUsed = "card_lu_" + String(i);
    
    preferences.putBytes(keyUid.c_str(), rfidCards[i].uid, 4);
    preferences.putString(keyName.c_str(), String(rfidCards[i].name));
    preferences.putBool(keyEnabled.c_str(), rfidCards[i].enabled);
    preferences.putULong(keyLastUsed.c_str(), rfidCards[i].lastUsed);
    
    // Also update legacy format for backward compatibility
    String legacyKey = "card" + String(i);
    preferences.putBytes(legacyKey.c_str(), rfidCards[i].uid, 4);
  }
  
  Serial.println("[RFID] Saved " + String(allowedCardsCount) + " cards to preferences");
}
