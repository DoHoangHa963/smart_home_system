package com.example.smart_home_system.util;

import com.example.smart_home_system.enums.DeviceType;
import lombok.Getter;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * GPIO Pin Mapping cho ESP32-S3 Smart Home System
 * 
 * Mapping giữa GPIO pins và device codes/types để đảm bảo
 * khi tạo device phải match với GPIO có sẵn trên ESP32
 * 
 * @author Smart Home System Team
 */
public class GPIOMapping {
    
    /**
     * GPIO Pin Definitions từ config.h
     */
    public static final int PIN_MQ2 = 4;          // Gas sensor (analog)
    public static final int PIN_LDR = 5;          // Light sensor (analog)
    public static final int PIN_FLAME = 6;        // Flame sensor (digital)
    public static final int PIN_DHT_IN = 7;       // Indoor DHT11
    public static final int PIN_DHT_OUT = 16;    // Outdoor DHT11
    public static final int PIN_PIR = 41;         // Motion sensor
    public static final int PIN_RAIN = 3;         // Rain sensor (analog)
    public static final int PIN_RELAY_LIGHT = 42; // Light relay
    public static final int PIN_RELAY_FAN = 21;   // Fan relay
    public static final int PIN_SERVO = 18;       // Door servo
    
    /**
     * Device Code Prefixes mapping với GPIO pins
     * Format: DEVICE_TYPE_GPIO_PIN
     */
    @Getter
    private static final Map<String, Integer> deviceCodeToGPIO = new HashMap<>();
    
    /**
     * GPIO to Device Type mapping
     */
    @Getter
    private static final Map<Integer, DeviceType> gpioToDeviceType = new HashMap<>();
    
    /**
     * GPIO to Sensor Name mapping (cho sensor data từ ESP32)
     */
    @Getter
    private static final Map<Integer, String> gpioToSensorName = new HashMap<>();
    
    static {
        // Sensor mappings
        deviceCodeToGPIO.put("GAS_SENSOR", PIN_MQ2);
        deviceCodeToGPIO.put("LIGHT_SENSOR", PIN_LDR);
        deviceCodeToGPIO.put("FLAME_SENSOR", PIN_FLAME);
        deviceCodeToGPIO.put("TEMP_HUMIDITY_IN", PIN_DHT_IN);
        deviceCodeToGPIO.put("TEMP_HUMIDITY_OUT", PIN_DHT_OUT);
        deviceCodeToGPIO.put("MOTION_SENSOR", PIN_PIR);
        deviceCodeToGPIO.put("RAIN_SENSOR", PIN_RAIN);
        
        // Actuator mappings
        deviceCodeToGPIO.put("LIGHT_RELAY", PIN_RELAY_LIGHT);
        deviceCodeToGPIO.put("FAN_RELAY", PIN_RELAY_FAN);
        deviceCodeToGPIO.put("DOOR_SERVO", PIN_SERVO);
        
        // GPIO to Device Type
        gpioToDeviceType.put(PIN_MQ2, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_LDR, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_FLAME, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_DHT_IN, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_DHT_OUT, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_PIR, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_RAIN, DeviceType.SENSOR);
        gpioToDeviceType.put(PIN_RELAY_LIGHT, DeviceType.LIGHT);
        gpioToDeviceType.put(PIN_RELAY_FAN, DeviceType.FAN);
        gpioToDeviceType.put(PIN_SERVO, DeviceType.DOOR);
        
        // GPIO to Sensor Name (cho parsing sensor data từ ESP32)
        gpioToSensorName.put(PIN_MQ2, "gas");
        gpioToSensorName.put(PIN_LDR, "light");
        gpioToSensorName.put(PIN_FLAME, "flame");
        gpioToSensorName.put(PIN_DHT_IN, "tempIn");
        gpioToSensorName.put(PIN_DHT_IN, "humIn"); // DHT_IN có cả temp và hum
        gpioToSensorName.put(PIN_DHT_OUT, "tempOut");
        gpioToSensorName.put(PIN_DHT_OUT, "humOut"); // DHT_OUT có cả temp và hum
        gpioToSensorName.put(PIN_PIR, "motion");
        gpioToSensorName.put(PIN_RAIN, "rain");
        gpioToSensorName.put(PIN_RELAY_LIGHT, "lightStatus");
        gpioToSensorName.put(PIN_RELAY_FAN, "fanStatus");
        gpioToSensorName.put(PIN_SERVO, "door");
    }
    
    /**
     * Lấy GPIO pin từ device code
     * @param deviceCode Device code (ví dụ: "LIGHT_RELAY", "GAS_SENSOR")
     * @return GPIO pin number hoặc null nếu không tìm thấy
     */
    public static Integer getGPIOFromDeviceCode(String deviceCode) {
        // Try exact match first
        if (deviceCodeToGPIO.containsKey(deviceCode)) {
            return deviceCodeToGPIO.get(deviceCode);
        }
        
        // Try prefix match (ví dụ: "LIGHT_RELAY_001" -> "LIGHT_RELAY")
        for (String prefix : deviceCodeToGPIO.keySet()) {
            if (deviceCode.startsWith(prefix)) {
                return deviceCodeToGPIO.get(prefix);
            }
        }
        
        return null;
    }
    
    /**
     * Validate device code có match với GPIO pin không
     * @param deviceCode Device code
     * @param expectedGPIO GPIO pin mong đợi
     * @return true nếu match
     */
    public static boolean validateDeviceCodeGPIO(String deviceCode, Integer expectedGPIO) {
        Integer actualGPIO = getGPIOFromDeviceCode(deviceCode);
        return actualGPIO != null && actualGPIO.equals(expectedGPIO);
    }
    
    /**
     * Lấy tất cả available GPIO pins
     * @return Set of GPIO pins
     */
    public static Set<Integer> getAvailableGPIOs() {
        return gpioToDeviceType.keySet();
    }
    
    /**
     * Lấy device type từ GPIO pin
     * @param gpio GPIO pin number
     * @return DeviceType hoặc null
     */
    public static DeviceType getDeviceTypeFromGPIO(Integer gpio) {
        return gpioToDeviceType.get(gpio);
    }
    
    /**
     * Lấy sensor name từ GPIO pin (để parse sensor data từ ESP32)
     * @param gpio GPIO pin number
     * @return Sensor name trong JSON từ ESP32
     */
    public static String getSensorNameFromGPIO(Integer gpio) {
        return gpioToSensorName.get(gpio);
    }
    
    /**
     * Validate device code có hợp lệ không (có trong mapping)
     * @param deviceCode Device code
     * @return true nếu hợp lệ
     */
    public static boolean isValidDeviceCode(String deviceCode) {
        return getGPIOFromDeviceCode(deviceCode) != null;
    }
}
