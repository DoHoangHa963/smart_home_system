package com.example.smart_home_system.security.service;

import com.example.smart_home_system.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Security component for home/room access verification in SpEL expressions.
 * 
 * <p>This component provides security methods that can be used in
 * {@code @PreAuthorize} annotations to verify user access to rooms and homes.
 * 
 * <p><b>Usage in Controllers:</b>
 * <pre>
 * {@code @PreAuthorize("@houseSecurity.isMemberByRoomId(#roomId, authentication)")}
 * public ResponseEntity<?> getRoomDetails(@PathVariable Long roomId) {
 *     // ...
 * }
 * </pre>
 * 
 * <p><b>Access Rules:</b>
 * <ul>
 *   <li>System ADMIN has access to all rooms</li>
 *   <li>Anonymous users are denied access</li>
 *   <li>Members of the home containing the room have access</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see RoomRepository
 */
@Component("houseSecurity")
@RequiredArgsConstructor
public class HouseSecurity {

    private final RoomRepository roomRepository;

    /**
     * Checks if the current user has access to a room.
     * 
     * <p>Access is granted if:
     * <ul>
     *   <li>User has ROLE_ADMIN authority</li>
     *   <li>User is a member of the home containing the room</li>
     * </ul>
     * 
     * @param roomId The ID of the room to check access for
     * @param authentication The current authentication context
     * @return true if user has access, false otherwise
     */
    public boolean isMemberByRoomId(Long roomId, Authentication authentication) {

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) {
            return true;
        }

        // 2. Lấy username từ Security Context (User đang đăng nhập)
        String currentUsername = authentication.getName();

        // Nếu user chưa đăng nhập (Anonymous) -> từ chối luôn
        if (currentUsername == null || currentUsername.equals("anonymousUser")) {
            return false;
        }

        // 3. Gọi Repository để check tận gốc trong DB
        return roomRepository.isUserMemberOfHouseByRoomId(roomId, currentUsername);
    }
}
