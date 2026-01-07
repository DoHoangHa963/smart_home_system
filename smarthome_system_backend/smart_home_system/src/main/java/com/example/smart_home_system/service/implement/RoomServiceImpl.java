package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.RoomRequest;
import com.example.smart_home_system.dto.response.RoomResponse;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.mapper.RoomMapper;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.service.RoomService;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service("roomService")
@RequiredArgsConstructor
@Transactional
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final HomeRepository homeRepository;
    private final HomeMemberRepository homeMemberRepository;
    private final RoomMapper roomMapper;

    @Override
    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // 1. Check Home exists
        Home home = homeRepository.findById(request.getHomeId())
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));

        // 2. Check Permission (Only Owner or Manager/Admin can create room)
        validateWritePermission(request.getHomeId(), currentUserId);

        // 3. Check duplicate room name
        if (roomRepository.existsByNameAndHomeId(request.getName(), request.getHomeId())) {
            throw new AppException(ErrorCode.ROOM_NAME_EXISTS);
        }

        Room room = roomMapper.toEntity(request);
        room.setHome(home);

        return roomMapper.toResponse(roomRepository.save(room));
    }

    @Override
    @Transactional
    public RoomResponse updateRoom(Long roomId, RoomRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        validateWritePermission(room.getHome().getId(), currentUserId);

        // Check duplicate name if name changed
        if (!room.getName().equals(request.getName()) &&
                roomRepository.existsByNameAndHomeId(request.getName(), room.getHome().getId())) {
            throw new AppException(ErrorCode.ROOM_NAME_EXISTS);
        }

        roomMapper.updateRoomFromRequest(room, request);
        return roomMapper.toResponse(roomRepository.save(room));
    }

    @Override
    @Transactional
    public void deleteRoom(Long roomId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        validateWritePermission(room.getHome().getId(), currentUserId);

        // Check if room has devices
        if (!room.getDevices().isEmpty()) {
            throw new AppException(ErrorCode.ROOM_HAS_DEVICES);
        }

        roomRepository.delete(room);
    }

    @Override
    @Transactional(readOnly = true)
    public RoomResponse getRoomById(Long roomId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        // Check read permission (Any member can view)
        if (homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId).isEmpty()) {
            throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
        }

        return roomMapper.toResponse(room);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByHomeId(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Check read permission
        if (homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId).isEmpty()) {
            throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
        }

        return roomRepository.findByHomeId(homeId).stream()
                .map(roomMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasRoomAccess(Long roomId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        return homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId).isPresent();
    }

    @Override
    public boolean hasRoomWritePermission(Long roomId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        return member.getRole() == HomeMemberRole.OWNER || member.getRole() == HomeMemberRole.ADMIN;
    }

    @Override
    public void moveDeviceToRoom(Long roomId, Long deviceId) {

    }

    @Override
    public RoomResponse getRoomWithStatistics(Long roomId) {
        return null;
    }

    // Helper method to check write permission
    private void validateWritePermission(Long homeId, String userId) {
        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        // Chỉ cho phép OWNER hoặc ADMIN tạo/sửa phòng
        if (member.getRole() != HomeMemberRole.OWNER && member.getRole() != HomeMemberRole.ADMIN) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
    }
}