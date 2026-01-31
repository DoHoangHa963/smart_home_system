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
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.service.EventLogService;
import com.example.smart_home_system.service.RoomService;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link RoomService} for managing Room entities within homes.
 * 
 * <p>This service provides the core business logic for room management including:
 * <ul>
 *   <li>Creating rooms with home membership verification</li>
 *   <li>Updating and deleting rooms with permission checks</li>
 *   <li>Room search and pagination</li>
 *   <li>Device count aggregation per room</li>
 * </ul>
 * 
 * <p><b>Permission Model:</b>
 * <ul>
 *   <li>System ADMIN bypasses all permission checks</li>
 *   <li>Home OWNER and ADMIN have full room access</li>
 *   <li>Members need specific ROOM_* permissions</li>
 *   <li>All home members can view rooms (read permission)</li>
 * </ul>
 * 
 * <p><b>Deletion Rules:</b>
 * Rooms containing devices cannot be deleted. Devices must be removed
 * or moved to another room first.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see RoomService
 */
@Service("roomService")
@RequiredArgsConstructor
@Transactional
@Slf4j
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final HomeRepository homeRepository;
    private final HomeMemberRepository homeMemberRepository;
    private final DeviceRepository deviceRepository;
    private final RoomMapper roomMapper;
    private final EventLogService eventLogService;

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

        Room savedRoom = roomRepository.save(room);
        
        // Ghi log tạo room
        eventLogService.logRoomEvent(home.getId(), savedRoom.getId(), "ROOM_CREATE", 
                String.format("{\"roomName\":\"%s\"}", savedRoom.getName()), "WEB");

        return roomMapper.toResponse(savedRoom);
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
        Room updatedRoom = roomRepository.save(room);
        
        // Ghi log cập nhật room
        eventLogService.logRoomEvent(updatedRoom.getHome().getId(), updatedRoom.getId(), "ROOM_UPDATE",
                String.format("{\"roomName\":\"%s\"}", updatedRoom.getName()), "WEB");
        
        return roomMapper.toResponse(updatedRoom);
    }

    @Override
    @Transactional
    public void deleteRoom(Long roomId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        validateWritePermission(room.getHome().getId(), currentUserId);

        // Check if room has active devices (chưa bị xóa mềm)
        long deviceCount = deviceRepository.countByRoomId(roomId);
        if (deviceCount > 0) {
            throw new AppException(ErrorCode.ROOM_HAS_DEVICES);
        }

        // Bỏ liên kết phòng khỏi mọi thiết bị (kể cả đã xóa mềm) trước khi xóa phòng,
        // tránh cascade xóa device và lỗi FK từ event_logs.device_id.
        deviceRepository.unlinkDevicesByRoomId(roomId);

        // Ghi log trước khi xóa
        eventLogService.logRoomEvent(room.getHome().getId(), room.getId(), "ROOM_DELETE",
                String.format("{\"roomName\":\"%s\"}", room.getName()), "WEB");

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
        // Đếm chỉ các device chưa bị xóa mềm
        response.setDeviceCount((int) deviceRepository.countByRoomId(roomId));

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
                    // Đếm chỉ các device chưa bị xóa mềm
                    response.setDeviceCount((int) deviceRepository.countByRoomId(room.getId()));
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
                    // Đếm chỉ các device chưa bị xóa mềm
                    response.setDeviceCount((int) deviceRepository.countByRoomId(room.getId()));
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
            // Đếm chỉ các device chưa bị xóa mềm
            response.setDeviceCount((int) deviceRepository.countByRoomId(room.getId()));
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
                    .orElse(null);
            
            if (room == null) {
                return false;
            }

            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId)
                    .orElse(null);
            
            if (member == null) {
                return false;
            }

            // OWNER và ADMIN luôn có quyền
            if (member.getRole() == HomeMemberRole.OWNER || member.getRole() == HomeMemberRole.ADMIN) {
                return true;
            }

            // Check permission riêng lẻ (ROOM_UPDATE hoặc ROOM_DELETE tùy context)
            return member.hasPermission("ROOM_UPDATE") || member.hasPermission("ROOM_DELETE");
        } catch (Exception e) {
            log.warn("Error checking room write permission: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean hasRoomPermission(Long roomId, String permission) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            if (currentUserId == null) {
                return false;
            }

            Room room = roomRepository.findById(roomId)
                    .orElse(null);
            
            if (room == null) {
                return false;
            }

            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(room.getHome().getId(), currentUserId)
                    .orElse(null);
            
            if (member == null) {
                return false;
            }

            // OWNER luôn có tất cả permissions
            if (member.getRole() == HomeMemberRole.OWNER) {
                return true;
            }

            // Check permission riêng lẻ (bao gồm cả custom permissions)
            return member.hasPermission(permission);
        } catch (Exception e) {
            log.warn("Error checking room permission {} for room {}: {}", permission, roomId, e.getMessage());
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
        // Đếm chỉ các device chưa bị xóa mềm
        response.setDeviceCount((int) deviceRepository.countByRoomId(roomId));

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

    // Helper method to check write permission (OWNER, ADMIN, or có ROOM_CREATE/ROOM_UPDATE permission)
    private void validateWritePermission(Long homeId, String userId) {
        // 1. Nếu là System Admin -> Cho phép luôn
        if (isSystemAdmin()) {
            return;
        }

        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        // OWNER và ADMIN luôn có quyền
        if (member.getRole() == HomeMemberRole.OWNER || member.getRole() == HomeMemberRole.ADMIN) {
            return;
        }

        // Check permission riêng lẻ
        if (!member.hasPermission("ROOM_CREATE") && !member.hasPermission("ROOM_UPDATE")) {
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