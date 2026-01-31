package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.RoomRequest;
import com.example.smart_home_system.dto.response.RoomResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for managing Room entities within homes.
 * 
 * <p>This service provides room management operations including:
 * <ul>
 *   <li>CRUD operations for rooms within a home</li>
 *   <li>Room search and filtering capabilities</li>
 *   <li>Device-to-room association management</li>
 *   <li>Room statistics and information retrieval</li>
 * </ul>
 * 
 * <p><b>Business Rules:</b>
 * <ul>
 *   <li>Room names must be unique within a home</li>
 *   <li>Rooms with devices cannot be deleted</li>
 *   <li>Only OWNER, ADMIN, or members with ROOM_* permissions can modify rooms</li>
 *   <li>All home members can view rooms</li>
 * </ul>
 * 
 * <p><b>Permission Model:</b>
 * <ul>
 *   <li>ROOM_VIEW - View room details</li>
 *   <li>ROOM_CREATE - Create new rooms</li>
 *   <li>ROOM_UPDATE - Modify existing rooms</li>
 *   <li>ROOM_DELETE - Delete rooms</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see RoomServiceImpl
 * @see HomeService
 */
public interface RoomService {
    RoomResponse createRoom(RoomRequest request);
    RoomResponse updateRoom(Long roomId, RoomRequest request);
    void deleteRoom(Long roomId);
    RoomResponse getRoomById(Long roomId);
    List<RoomResponse> getRoomsByHomeId(Long homeId);

    // Pageable methods
    Page<RoomResponse> getRoomsByHomeId(Long homeId, Pageable pageable);
    Page<RoomResponse> searchRooms(Long homeId, String name, Pageable pageable);

    // For security expressions
    boolean hasRoomAccess(Long roomId);
    boolean hasRoomWritePermission(Long roomId);

    // Permission checking methods
    boolean hasRoomPermission(Long roomId, String permission);
    boolean isHomeAdmin(Long homeId);
    boolean isHomeOwner(Long homeId);

    // New methods for controller
    void moveDeviceToRoom(Long roomId, Long deviceId);
    RoomResponse getRoomWithStatistics(Long roomId);
}