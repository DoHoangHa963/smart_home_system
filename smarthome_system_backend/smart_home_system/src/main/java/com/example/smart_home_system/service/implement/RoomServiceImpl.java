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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

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

        // 2. Check Permission (Only Owner or Admin can create room)
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
        validateReadPermission(room.getHome().getId(), currentUserId);

        RoomResponse response = roomMapper.toResponse(room);
        response.setDeviceCount(room.getDevices().size());

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByHomeId(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Check read permission
        validateReadPermission(homeId, currentUserId);

        return roomRepository.findByHomeId(homeId).stream()
                .map(room -> {
                    RoomResponse response = roomMapper.toResponse(room);
                    response.setDeviceCount(room.getDevices().size());
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RoomResponse> getRoomsByHomeId(Long homeId, Pageable pageable) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Check read permission
        validateReadPermission(homeId, currentUserId);

        return roomRepository.findByHomeId(homeId, pageable)
                .map(room -> {
                    RoomResponse response = roomMapper.toResponse(room);
                    response.setDeviceCount(room.getDevices().size());
                    return response;
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RoomResponse> searchRooms(Long homeId, String name, Pageable pageable) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Check read permission
        validateReadPermission(homeId, currentUserId);

        Page<Room> roomsPage;
        if (name == null || name.trim().isEmpty()) {
            roomsPage = roomRepository.findByHomeId(homeId, pageable);
        } else {
            roomsPage = roomRepository.findByHomeIdAndNameContainingIgnoreCase(homeId, name.trim(), pageable);
        }

        return roomsPage.map(room -> {
            RoomResponse response = roomMapper.toResponse(room);
            response.setDeviceCount(room.getDevices().size());
            return response;
        });
    }

    @Override
    public boolean hasRoomAccess(Long roomId) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            return homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId)
                    .isPresent();
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean hasRoomWritePermission(Long roomId) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

            return member.getRole() == HomeMemberRole.OWNER || member.getRole() == HomeMemberRole.ADMIN;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean hasRoomPermission(Long roomId, String permission) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

            return member.hasPermission(permission);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean isHomeAdmin(Long homeId) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

            return member.getRole() == HomeMemberRole.OWNER || member.getRole() == HomeMemberRole.ADMIN;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean isHomeOwner(Long homeId) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

            return member.getRole() == HomeMemberRole.OWNER;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void moveDeviceToRoom(Long roomId, Long deviceId) {
        // Implementation for moving device to room
        // This would involve DeviceService and DeviceRepository
        throw new UnsupportedOperationException("Method not implemented");
    }

    @Override
    public RoomResponse getRoomWithStatistics(Long roomId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        // Check read permission
        validateReadPermission(room.getHome().getId(), currentUserId);

        RoomResponse response = roomMapper.toResponse(room);
        response.setDeviceCount(room.getDevices().size());

        // Additional statistics can be added here
        // Example: device count by type, etc.

        return response;
    }

    // ================= HELPER METHODS =================

    /**
     * Kiểm tra xem user hiện tại có phải là System Admin không
     */
    private boolean isSystemAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    // Helper method to check write permission (OWNER or ADMIN only)
    private void validateWritePermission(Long homeId, String userId) {
        // 1. Nếu là System Admin -> Cho phép luôn
        if (isSystemAdmin()) {
            return;
        }

        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        // Only OWNER or ADMIN (Home Level) can create/modify rooms
        if (member.getRole() != HomeMemberRole.OWNER && member.getRole() != HomeMemberRole.ADMIN) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
    }

    // Helper method to check read permission (any member can view)
    private void validateReadPermission(Long homeId, String userId) {
        // 1. Nếu là System Admin -> Cho phép luôn
        if (isSystemAdmin()) {
            return;
        }

        if (homeMemberRepository.findByHomeIdAndUserId(homeId, userId).isEmpty()) {
            throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
        }
    }
}