package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.RoomRequest;
import com.example.smart_home_system.dto.response.RoomResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

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