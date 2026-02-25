/**
 * ESP32-S3 Smart Home System - Configuration File
 * 
 * Cấu hình các thông số kết nối với Backend
 * 
 * HƯỚNG DẪN:
 * 1. Sao chép file này thành config.local.h
 * 2. Chỉnh sửa các thông số trong config.local.h theo môi trường của bạn
 * 3. Include config.local.h trong main sketch
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============ BACKEND SERVER CONFIGURATION ============
// Chọn một trong các môi trường sau:

// Development - Local Backend
// ⚠️ LƯU Ý: IP backend được cấu hình động qua WiFi Config Portal (WiFiManager)
// Giá trị BACKEND_HOST chỉ là giá trị MẶC ĐỊNH khi chưa có cấu hình từ WiFiManager
// Khi ESP32 vào chế độ Access Point (nhấn BOOT), form WiFi sẽ có thêm ô nhập "Backend/MQTT Server IP"
// IP đã nhập được lưu vào NVS (Preferences) và sử dụng cho cả Backend HTTP và MQTT Broker
// Kiểm tra IP bằng lệnh: ipconfig (Windows) hoặc ifconfig (Linux/Mac)
#define BACKEND_HOST "10.146.210.23"  // Giá trị mặc định (thay đổi qua WiFi Config Portal)
#define BACKEND_PORT 8080
#define BACKEND_USE_SSL false

// Production - Cloud Backend
// #define BACKEND_HOST "api.smarthome.example.com"
// #define BACKEND_PORT 443
// #define BACKEND_USE_SSL true

// Construct full URL
#if BACKEND_USE_SSL
  #define BACKEND_PROTOCOL "https://"
#else
  #define BACKEND_PROTOCOL "http://"
#endif

// Backend có context-path: /api
#define BACKEND_URL BACKEND_PROTOCOL BACKEND_HOST ":" STRINGIFY(BACKEND_PORT) "/api"

// Helper macro
#define STRINGIFY(x) STRINGIFY2(x)
#define STRINGIFY2(x) #x

// ============ API ENDPOINTS ============
#define API_VERSION "/v1"
#define API_MCU_BASE API_VERSION "/mcu"

// MCU Gateway Endpoints - DEPRECATED (MQTT-Only Mode)
// #define API_INIT_PAIRING API_MCU_BASE "/init-pairing"
// #define API_PAIR API_MCU_BASE "/pair"
// #define API_CONFIRM_PAIRING API_MCU_BASE "/confirm"
// #define API_HEARTBEAT API_MCU_BASE "/heartbeat"
// #define API_UNPAIR API_MCU_BASE
// #define API_COMMANDS API_MCU_BASE "/commands"
// #define API_COMMAND_ACK API_MCU_BASE "/commands"

// ============ DEVICE CONFIGURATION ============
#define FIRMWARE_VERSION "2.1.0"  // Updated with MQTT support
#define DEVICE_TYPE "ESP32-S3-SMART-HOME"
#define DEVICE_NAME_DEFAULT "Smart Home ESP32"

// ============ MQTT CONFIGURATION ============
// MQTT Broker settings
// ⚠️ LƯU Ý: MQTT Broker IP tự động sử dụng cùng IP với Backend Host
// Giá trị MQTT_BROKER_HOST này chỉ là giá trị mặc định khi chưa có cấu hình qua WiFi Portal
// Khi cấu hình "Backend/MQTT Server IP" qua WiFiManager, MQTT Broker sẽ tự động dùng IP đó
// IP được lưu trong Preferences (NVS) với key "server_ip"
#define MQTT_BROKER_HOST "10.146.210.23"  // Giá trị mặc định (sẽ bị ghi đè bởi WiFiManager config)
#define MQTT_BROKER_PORT 1883
#define MQTT_USERNAME ""     // Leave empty if no auth
#define MQTT_PASSWORD ""     // Leave empty if no auth

// MQTT Topics (homeId will be replaced at runtime)
// Subscribe topics (ESP32 receives)
#define MQTT_TOPIC_COMMANDS "smarthome/%d/commands"       // Device control commands
#define MQTT_TOPIC_RFID_COMMANDS "smarthome/%d/rfid/commands"  // RFID commands

// Pairing topic (ESP32 subscribes when not paired)
#define MQTT_TOPIC_PAIRING "smarthome/pairing/%s"         // Pairing credentials (serialNumber)

// Publish topics (ESP32 sends)
#define MQTT_TOPIC_SENSORS "smarthome/%d/sensors"         // Sensor d
#define MQTT_RETAIN false                 // Whether to retain messages

// MQTT Retry Configuration (Exponential Backoff)
#define MQTT_RETRY_MIN_MS 5000            // Minimum retry delay: 5 seconds
#define MQTT_RETRY_MAX_MS 300000          // Maximum retry delay: 5 minutes
#define MQTT_RETRY_MULTIPLIER 2           // Exponential multiplier
#define MQTT_RESET_DELAY_AFTER_MS 1800000 // Reset delay to min after 30 minutes of disconnectionata
#define MQTT_TOPIC_GPIO_AVAILABLE "smarthome/%d/gpio/available"  // GPIO pins list response
#define MQTT_TOPIC_STATUS "smarthome/%d/status"           // Online/offline status
#define MQTT_TOPIC_DEVICE_STATUS "smarthome/%d/device-status" // Device status updates (immediate)
#define MQTT_TOPIC_RFID_ACCESS "smarthome/%d/rfid/access" // RFID access logs
#define MQTT_TOPIC_RFID_LEARN "smarthome/%d/rfid/learn/status" // RFID learning status
#define MQTT_TOPIC_RFID_CARDS "smarthome/%d/rfid/cards"   // RFID cards list
#define MQTT_TOPIC_COMMAND_ACK "smarthome/%d/commands/ack" // Command acknowledgment

// MQTT Settings
#define MQTT_RECONNECT_INTERVAL_MS 5000   // 5 seconds between reconnect attempts
#define MQTT_KEEPALIVE_SECONDS 10         // Keep-alive: broker phát hiện mất kết nối ~15–20s, gửi LWT "offline"
#define MQTT_QOS 1                        // Quality of Service level (0, 1, or 2)

// MQTT Configuration
#define MQTT_MAX_PROCESSED_COMMANDS 50    // Max commands to track for deduplication

// ============ TIMING CONFIGURATION ============
// Heartbeat interval (milliseconds)
#define HEARTBEAT_INTERVAL_MS 300000     // 5 minutes (MQTT-only mode)

// Pairing check interval (milliseconds)
#define PAIRING_CHECK_INTERVAL_MS 5000   // 5 seconds

// WiFi reconnect interval (milliseconds)
#define WIFI_RECONNECT_INTERVAL_MS 30000 // 30 seconds

// Backend connection timeout (milliseconds)
#define HTTP_TIMEOUT_MS 10000            // 10 seconds

// Command polling interval (milliseconds) - DEPRECATED: MQTT-only mode
// #define COMMAND_POLL_INTERVAL_MS 3000    // 3 seconds

// Sensor read interval (milliseconds)
#define SENSOR_READ_INTERVAL_MS 500      // 500ms

// LCD update interval (milliseconds)
#define LCD_UPDATE_INTERVAL_MS 2000      // 2 seconds

// Door auto close timeout (milliseconds)
#define DOOR_AUTO_CLOSE_MS 10000         // 10 seconds

// ============ MANUAL OVERRIDE CONFIGURATION ============
// Manual override duration - auto mode won't control device for this duration after manual action
#define MANUAL_OVERRIDE_DURATION_MS 30000   // 30 seconds (ms)

// Door user action protection - auto rain close is delayed after RFID/manual door open
#define DOOR_USER_ACTION_DELAY_MS 60000     // 1 minute (ms)

// Rain persistent detection - door only closes if rain is detected for this duration
#define RAIN_PERSISTENT_DURATION_MS 10000   // 10 seconds (ms)

// Motion debounce - avoid rapid DETECTED/CLEARED glitches
#define DEBOUNCE_MOTION_MS 2000             // 2 seconds (ms)

// Gas sensor persistent detection - only trigger emergency if gas is high for this duration
#define GAS_PERSISTENT_DURATION_MS 3000     // 3 seconds (ms)

// ============ THRESHOLD CONFIGURATION ============
// Light sensor threshold for auto-light
#define DEFAULT_LIGHT_THRESHOLD 500

// Temperature threshold for auto-fan (Celsius)
#define DEFAULT_TEMP_THRESHOLD 30

// Gas sensor threshold for alert
#define DEFAULT_GAS_THRESHOLD 1500

// Rain sensor threshold for auto-close door
#define RAIN_THRESHOLD 2000

// ============ HARDWARE LIMITS ============
#define MAX_ALLOWED_RFID_CARDS 5

// ============ PIN CONFIGURATION (ESP32-S3) ============
// Analog Sensors
#define PIN_MQ2         4   // Gas sensor (analog)
#define PIN_LDR         5   // Light sensor (analog)
#define PIN_FLAME       6   // Flame sensor (digital with interrupt)
#define PIN_DHT_IN      7   // Indoor DHT11
#define PIN_DHT_OUT     16  // Outdoor DHT11

// Output Controls
#define PIN_LED         17  // Status LED
#define PIN_SERVO       18  // Door servo
#define PIN_RELAY_LIGHT 42  // Light relay
#define PIN_RELAY_FAN   21  // Fan relay
#define PIN_BUZZER      2   // Alarm buzzer
#define PIN_DOOR_BTN    15  // Door toggle button (dedicated pin)
#define DOOR_BTN_DEBOUNCE_MS 300    // Button debounce time

// Digital Inputs
#define PIN_PIR         41  // Motion sensor
#define PIN_RAIN        3   // Rain sensor (analog)

// I2C (LCD)
#define PIN_SDA         8
#define PIN_SCL         9
#define LCD_ADDRESS     0x27
#define LCD_COLS        16
#define LCD_ROWS        2

// SPI (RFID)
#define PIN_SS_RFID     10
#define PIN_MOSI        11
#define PIN_SCK         12
#define PIN_MISO        13
#define PIN_RST_RFID    14
#define PIN_BOOT        0   // Boot button for WiFi Config Mode
#define BOOT_HOLD_UNPAIR_MS 5000  // Hold BOOT 5s to clear pairing data & restart

// ============ FREERTOS CONFIGURATION ============
// Task stack sizes (bytes)
#define STACK_SIZE_SENSOR     4096
#define STACK_SIZE_LCD        2048
#define STACK_SIZE_RFID       6144
#define STACK_SIZE_WEB        8192
#define STACK_SIZE_AUTOMATION 4096
#define STACK_SIZE_EMERGENCY  3072
#define STACK_SIZE_SERVO      4096
#define STACK_SIZE_BACKEND    10240
#define STACK_SIZE_COMMAND    3072
#define STACK_SIZE_LEARN_RFID 6144  // Tăng từ 2048 để tránh tràn stack

// Task priorities
#define PRIORITY_EMERGENCY    3
#define PRIORITY_SENSOR       2
#define PRIORITY_RFID         2
#define PRIORITY_BACKEND      2
#define PRIORITY_SERVO        2
#define PRIORITY_COMMAND      2
#define PRIORITY_WEB          1
#define PRIORITY_LCD          1
#define PRIORITY_AUTOMATION   1

// Queue sizes
#define QUEUE_SIZE_EMERGENCY  10
#define QUEUE_SIZE_DOOR       5
#define QUEUE_SIZE_COMMAND    10

// ============ DEBUG CONFIGURATION ============
#define DEBUG_SERIAL true
#define DEBUG_BAUD_RATE 115200

#if DEBUG_SERIAL
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(fmt, ...) Serial.printf(fmt, ##__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(fmt, ...)
#endif

#endif // CONFIG_H
