package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.response.EventLogResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

/**
 * Service for logging events and activities in the system.
 * 
 * <p>This service provides methods to log various events including:
 * <ul>
 *   <li>Device operations (create, update, delete, control)</li>
 *   <li>Home operations (create, update, delete)</li>
 *   <li>Room operations (create, update, delete)</li>
 *   <li>Member operations (add, remove, update role)</li>
 *   <li>System events</li>
 * </ul>
 * 
 * <p><b>Event Log Structure:</b>
 * Each event log contains:
 * <ul>
 *   <li>home_id - Home where the event occurred</li>
 *   <li>device_id - Device involved (if applicable)</li>
 *   <li>user_id - User who performed the action</li>
 *   <li>source - Source of the event (e.g., "WEB", "MOBILE", "MCU", "SYSTEM")</li>
 *   <li>eventType - Type of event (e.g., "DEVICE_CREATE", "DEVICE_TURN_ON", "ROOM_DELETE")</li>
 *   <li>eventValue - Additional data in JSON format</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-25
 */
public interface EventLogService {
    
    /**
     * Get event logs for a home with pagination and optional filters
     * 
     * @param homeId Home ID
     * @param eventType Event type filter (optional)
     * @param startDate Start date filter (optional)
     * @param endDate End date filter (optional)
     * @param pageable Pagination parameters
     * @return Page of event log responses
     */
    Page<EventLogResponse> getLogsByHome(Long homeId, String eventType, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    /**
     * Log a device-related event
     * 
     * @param device Device involved in the event
     * @param eventType Type of event (e.g., "DEVICE_CREATE", "DEVICE_TURN_ON", "DEVICE_DELETE")
     * @param eventValue Additional data in JSON format (optional)
     * @param source Source of the event (e.g., "WEB", "MOBILE", "MCU")
     */
    void logDeviceEvent(Device device, String eventType, String eventValue, String source);
    
    /**
     * Log a device control event (turn on/off/toggle)
     * 
     * @param device Device being controlled
     * @param action Action performed (TURN_ON, TURN_OFF, TOGGLE)
     * @param source Source of the event
     */
    void logDeviceControl(Device device, String action, String source);
    
    /**
     * Log a home-related event
     * 
     * @param home Home involved in the event
     * @param eventType Type of event (e.g., "HOME_CREATE", "HOME_UPDATE", "HOME_DELETE")
     * @param eventValue Additional data in JSON format (optional)
     * @param source Source of the event
     */
    void logHomeEvent(Home home, String eventType, String eventValue, String source);
    
    /**
     * Log a room-related event
     * 
     * @param homeId Home ID where the room belongs
     * @param roomId Room ID (optional, can be null for room list operations)
     * @param eventType Type of event (e.g., "ROOM_CREATE", "ROOM_UPDATE", "ROOM_DELETE")
     * @param eventValue Additional data in JSON format (optional)
     * @param source Source of the event
     */
    void logRoomEvent(Long homeId, Long roomId, String eventType, String eventValue, String source);
    
    /**
     * Log a member-related event
     * 
     * @param homeId Home ID
     * @param targetUserId User ID of the member being added/removed/updated
     * @param eventType Type of event (e.g., "MEMBER_ADD", "MEMBER_REMOVE", "MEMBER_UPDATE_ROLE")
     * @param eventValue Additional data in JSON format (optional)
     * @param source Source of the event
     */
    void logMemberEvent(Long homeId, String targetUserId, String eventType, String eventValue, String source);
    
    /**
     * Log a generic event with all parameters
     * 
     * @param homeId Home ID (can be null for system events)
     * @param deviceId Device ID (optional)
     * @param userId User ID (optional, defaults to current user)
     * @param eventType Type of event
     * @param eventValue Additional data in JSON format (optional)
     * @param source Source of the event
     */
    void logEvent(Long homeId, Long deviceId, String userId, String eventType, String eventValue, String source);
}
