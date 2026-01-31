package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.response.EventLogResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.EventLog;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.EventLogRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.EventLogService;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Implementation of {@link EventLogService} for logging system events.
 * 
 * <p>This service automatically captures:
 * <ul>
 *   <li>Current user from security context</li>
 *   <li>Home and device relationships</li>
 *   <li>Event metadata in JSON format</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-25
 */
@Service("eventLogService")
@RequiredArgsConstructor
@Slf4j
public class EventLogServiceImpl implements EventLogService {

    private final EventLogRepository eventLogRepository;
    private final UserRepository userRepository;
    private final HomeRepository homeRepository;
    private final DeviceRepository deviceRepository;
    private final RoomRepository roomRepository;

    @Override
    @Transactional
    public void logDeviceEvent(Device device, String eventType, String eventValue, String source) {
        if (device == null) {
            log.warn("Cannot log device event: device is null");
            return;
        }

        try {
            Long homeId = device.getHomeId();
            Home home = homeId != null ? homeRepository.findById(homeId).orElse(null) : null;
            String currentUserId = SecurityUtils.getCurrentUserId();

            EventLog eventLog = EventLog.builder()
                    .device(device)
                    .home(home)
                    .user(currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null)
                    .source(source != null ? source : "WEB")
                    .eventType(eventType)
                    .eventValue(eventValue)
                    .build();

            eventLogRepository.save(eventLog);
            log.debug("Logged device event: {} for device {}", eventType, device.getId());
        } catch (Exception e) {
            log.error("Failed to log device event: {}", e.getMessage(), e);
            // Don't throw exception - logging failure shouldn't break main flow
        }
    }

    @Override
    @Transactional
    public void logDeviceControl(Device device, String action, String source) {
        if (device == null) {
            log.warn("Cannot log device control: device is null");
            return;
        }

        try {
            Long homeId = device.getHomeId();
            Home home = homeId != null ? homeRepository.findById(homeId).orElse(null) : null;
            String currentUserId = SecurityUtils.getCurrentUserId();

            // Create event value with action details
            Map<String, Object> eventValueMap = new HashMap<>();
            eventValueMap.put("action", action);
            eventValueMap.put("deviceCode", device.getDeviceCode());
            eventValueMap.put("deviceName", device.getName());
            eventValueMap.put("deviceType", device.getType() != null ? device.getType().name() : null);
            eventValueMap.put("status", device.getStatus() != null ? device.getStatus().name() : null);
            String eventValue = convertToJson(eventValueMap);

            String eventType = "DEVICE_" + action;
            EventLog eventLog = EventLog.builder()
                    .device(device)
                    .home(home)
                    .user(currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null)
                    .source(source != null ? source : "WEB")
                    .eventType(eventType)
                    .eventValue(eventValue)
                    .build();

            eventLogRepository.save(eventLog);
            log.debug("Logged device control: {} for device {}", action, device.getId());
        } catch (Exception e) {
            log.error("Failed to log device control: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void logHomeEvent(Home home, String eventType, String eventValue, String source) {
        if (home == null) {
            log.warn("Cannot log home event: home is null");
            return;
        }

        try {
            String currentUserId = SecurityUtils.getCurrentUserId();

            EventLog eventLog = EventLog.builder()
                    .home(home)
                    .user(currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null)
                    .source(source != null ? source : "WEB")
                    .eventType(eventType)
                    .eventValue(eventValue)
                    .build();

            eventLogRepository.save(eventLog);
            log.debug("Logged home event: {} for home {}", eventType, home.getId());
        } catch (Exception e) {
            log.error("Failed to log home event: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void logRoomEvent(Long homeId, Long roomId, String eventType, String eventValue, String source) {
        if (homeId == null) {
            log.warn("Cannot log room event: homeId is null");
            return;
        }

        try {
            Home home = homeRepository.findById(homeId).orElse(null);
            if (home == null) {
                log.warn("Cannot log room event: home not found with id {}", homeId);
                return;
            }

            String currentUserId = SecurityUtils.getCurrentUserId();

            // Add room info to event value if roomId is provided
            String finalEventValue = eventValue;
            if (roomId != null && finalEventValue == null) {
                final String[] tempEventValue = {null};
                roomRepository.findById(roomId).ifPresent(room -> {
                    Map<String, Object> eventValueMap = new HashMap<>();
                    eventValueMap.put("roomId", roomId);
                    eventValueMap.put("roomName", room.getName());
                    tempEventValue[0] = convertToJson(eventValueMap);
                });
                finalEventValue = tempEventValue[0];
            }

            EventLog eventLog = EventLog.builder()
                    .home(home)
                    .user(currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null)
                    .source(source != null ? source : "WEB")
                    .eventType(eventType)
                    .eventValue(finalEventValue)
                    .build();

            eventLogRepository.save(eventLog);
            log.debug("Logged room event: {} for home {}", eventType, homeId);
        } catch (Exception e) {
            log.error("Failed to log room event: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void logMemberEvent(Long homeId, String targetUserId, String eventType, String eventValue, String source) {
        if (homeId == null) {
            log.warn("Cannot log member event: homeId is null");
            return;
        }

        try {
            Home home = homeRepository.findById(homeId).orElse(null);
            if (home == null) {
                log.warn("Cannot log member event: home not found with id {}", homeId);
                return;
            }

            String currentUserId = SecurityUtils.getCurrentUserId();

            // Add target user info to event value
            String finalEventValue = eventValue;
            if (targetUserId != null && finalEventValue == null) {
                final String[] tempEventValue = {null};
                userRepository.findById(targetUserId).ifPresent(targetUser -> {
                    Map<String, Object> eventValueMap = new HashMap<>();
                    eventValueMap.put("targetUserId", targetUserId);
                    eventValueMap.put("targetUsername", targetUser.getUsername());
                    tempEventValue[0] = convertToJson(eventValueMap);
                });
                finalEventValue = tempEventValue[0];
            }

            EventLog eventLog = EventLog.builder()
                    .home(home)
                    .user(currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null)
                    .source(source != null ? source : "WEB")
                    .eventType(eventType)
                    .eventValue(finalEventValue)
                    .build();

            eventLogRepository.save(eventLog);
            log.debug("Logged member event: {} for home {}", eventType, homeId);
        } catch (Exception e) {
            log.error("Failed to log member event: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void logEvent(Long homeId, Long deviceId, String userId, String eventType, String eventValue, String source) {
        try {
            Home home = homeId != null ? homeRepository.findById(homeId).orElse(null) : null;
            Device device = deviceId != null ? deviceRepository.findById(deviceId).orElse(null) : null;
            
            // Use provided userId or current user
            String currentUserId = userId != null ? userId : SecurityUtils.getCurrentUserId();
            User user = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;

            EventLog eventLog = EventLog.builder()
                    .home(home)
                    .device(device)
                    .user(user)
                    .source(source != null ? source : "WEB")
                    .eventType(eventType)
                    .eventValue(eventValue)
                    .build();

            eventLogRepository.save(eventLog);
            log.debug("Logged event: {} for home {}, device {}", eventType, homeId, deviceId);
        } catch (Exception e) {
            log.error("Failed to log event: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventLogResponse> getLogsByHome(Long homeId, String eventType, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        log.debug("Getting logs for home {} with filters: eventType={}, startDate={}, endDate={}", 
                  homeId, eventType, startDate, endDate);
        
        Page<EventLog> eventLogs = eventLogRepository.findByHomeIdWithFilters(
            homeId, eventType, startDate, endDate, pageable
        );
        
        return eventLogs.map(this::mapToResponse);
    }

    /**
     * Map EventLog entity to EventLogResponse DTO
     */
    private EventLogResponse mapToResponse(EventLog eventLog) {
        return EventLogResponse.builder()
                .id(eventLog.getId())
                .homeId(eventLog.getHome() != null ? eventLog.getHome().getId() : null)
                .homeName(eventLog.getHome() != null ? eventLog.getHome().getName() : null)
                .deviceId(eventLog.getDevice() != null ? eventLog.getDevice().getId() : null)
                .deviceName(eventLog.getDevice() != null ? eventLog.getDevice().getName() : null)
                .deviceCode(eventLog.getDevice() != null ? eventLog.getDevice().getDeviceCode() : null)
                .userId(eventLog.getUser() != null ? eventLog.getUser().getId() : null)
                .username(eventLog.getUser() != null ? eventLog.getUser().getUsername() : "System")
                .source(eventLog.getSource())
                .eventType(eventLog.getEventType())
                .eventValue(eventLog.getEventValue())
                .createdAt(eventLog.getCreatedAt())
                .build();
    }

    /**
     * Convert Map to JSON string
     */
    private String convertToJson(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }

        StringBuilder json = new StringBuilder("{");
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            json.append("\"").append(entry.getKey()).append("\":");
            if (entry.getValue() instanceof String) {
                json.append("\"").append(entry.getValue()).append("\"");
            } else {
                json.append(entry.getValue());
            }
            json.append(",");
        }
        if (json.length() > 1) {
            json.deleteCharAt(json.length() - 1);
        }
        json.append("}");
        return json.toString();
    }
}
