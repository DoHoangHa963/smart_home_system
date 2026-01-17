package com.example.smart_home_system.security.service;

import com.example.smart_home_system.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("houseSecurity")
@RequiredArgsConstructor
public class HouseSecurity {

    private final RoomRepository roomRepository;

    /**
     * Kiểm tra xem User hiện tại có quyền truy cập vào Room này không.
     * Logic: User phải là Owner của Home hoặc là Member (Status ACTIVE) của Home chứa Room đó.
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
