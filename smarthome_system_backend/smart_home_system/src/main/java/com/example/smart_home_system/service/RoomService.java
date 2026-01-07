package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.RoomRequest;
import com.example.smart_home_system.dto.response.RoomResponse;

import java.util.List;

public interface RoomService {
    RoomResponse createRoom(RoomRequest request);
    RoomResponse updateRoom(Long roomId, RoomRequest request);
    void deleteRoom(Long roomId);
    RoomResponse getRoomById(Long roomId);
    List<RoomResponse> getRoomsByHomeId(Long homeId);

    // For security expressions
    boolean hasRoomAccess(Long roomId);
    boolean hasRoomWritePermission(Long roomId);

    // New methods for controller
    void moveDeviceToRoom(Long roomId, Long deviceId);
    RoomResponse getRoomWithStatistics(Long roomId);
}