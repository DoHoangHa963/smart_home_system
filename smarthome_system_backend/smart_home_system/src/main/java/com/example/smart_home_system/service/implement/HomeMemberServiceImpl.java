package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.AddMemberRequest;
import com.example.smart_home_system.dto.request.UpdateRoleRequest;
import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomeMemberStatus;
import com.example.smart_home_system.exception.*;
import com.example.smart_home_system.mapper.HomeMemberMapper;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.HomeMemberService;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HomeMemberServiceImpl implements HomeMemberService {

    private final HomeMemberRepository homeMemberRepository;
    private final HomeRepository homeRepository;
    private final UserRepository userRepository;
    private final HomeMemberMapper homeMemberMapper;

    @Override
    @Transactional
    public HomeMemberResponse addMember(Long homeId, AddMemberRequest request) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        // 1. Lấy người mời
        HomeMember requester = getMemberOrThrow(homeId, currentUsername);

        // 2. CHECK QUYỀN MỀM (Flexible Permission) thay vì Role cứng
        if (!requester.hasPermission("MEMBER_INVITE")) {
            // Fallback: Nếu không có quyền mềm, check Role cứng (tương thích ngược)
            validatePrivilege(requester, HomeMemberRole.ADMIN);
        }

        // 3. Tìm user
        User targetUser = userRepository.findByUsername(request.getIdentifier())
                .or(() -> userRepository.findByEmail(request.getIdentifier()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // 4. Validate Duplicate
        if (homeMemberRepository.existsByHomeIdAndUserId(homeId, targetUser.getId())) {
            throw new DuplicateResourceException("User is already a member of this home");
        }

        // 5. Build Member mới
        HomeMember newMember = HomeMember.builder()
                .home(requester.getHome())
                .user(targetUser)
                .role(HomeMemberRole.MEMBER)
                .status(HomeMemberStatus.ACTIVE.name())
                .invitedBy(currentUsername)
                .invitedAt(LocalDateTime.now())
                .permissions("[]") // <--- QUAN TRỌNG: Khởi tạo permissions rỗng để tránh NULL
                .joinedAt(LocalDateTime.now())
                .build();

        return homeMemberMapper.toResponse(homeMemberRepository.save(newMember));
    }

    @Override
    @Transactional
    public void removeMember(Long homeId, String targetUserId) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        // 1. Lấy thông tin người thực hiện và người bị xóa
        HomeMember requester = getMemberOrThrow(homeId, currentUsername);
        HomeMember targetMember = homeMemberRepository.findByHomeIdAndUserId(homeId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in this home"));

        // 2. Logic phân quyền xóa
        HomeMemberRole requesterRole = requester.getRole();
        HomeMemberRole targetRole = targetMember.getRole();

        // Không ai được xóa OWNER
        if (targetRole == HomeMemberRole.OWNER) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        // Member thường không được xóa ai
        if (requesterRole == HomeMemberRole.MEMBER || requesterRole == HomeMemberRole.GUEST) {
            throw new UnauthorizedException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // ADMIN không được xóa ADMIN khác hoặc OWNER (chỉ OWNER được xóa ADMIN)
        if (requesterRole == HomeMemberRole.ADMIN && targetRole == HomeMemberRole.ADMIN) {
            throw new UnauthorizedException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // 3. Xóa (Soft Delete hoặc Hard Delete tùy cấu hình BaseEntity)
        homeMemberRepository.delete(targetMember);
    }

    @Override
    @Transactional
    public HomeMemberResponse updateMemberRole(Long homeId, String targetUserId, UpdateRoleRequest request) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        HomeMember requester = getMemberOrThrow(homeId, currentUsername);
        HomeMember targetMember = homeMemberRepository.findByHomeIdAndUserId(homeId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        // Chỉ OWNER mới được thăng cấp/giáng cấp người khác thành ADMIN/MEMBER
        // ADMIN chỉ được quản lý GUEST/MEMBER (tùy nghiệp vụ, ở đây set cứng chỉ OWNER được chỉnh role)
        if (requester.getRole() != HomeMemberRole.OWNER) {
            throw new UnauthorizedException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // Không được đổi role của chính mình (chuyển quyền Owner là API khác)
        if (requester.getId().equals(targetMember.getId())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        targetMember.setRole(request.getNewRole());
        return homeMemberMapper.toResponse(homeMemberRepository.save(targetMember));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HomeMemberResponse> getHomeMembers(Long homeId) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        if (!isSystemAdmin()) {
            homeMemberRepository
                    .findByHomeIdAndUsernameWithUser(homeId, currentUsername)
                    .orElseThrow(() -> new UnauthorizedException(ErrorCode.HOME_ACCESS_DENIED));
        }

        List<HomeMember> members = homeMemberRepository.findAllByHomeIdWithUser(homeId);

        return members.stream()
                .map(homeMemberMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void leaveHome(Long homeId) {
        String currentUsername = SecurityUtils.getCurrentUsername();
        HomeMember member = getMemberOrThrow(homeId, currentUsername);

        // Owner không được rời nhà (phải chuyển quyền hoặc xóa nhà)
        if (member.getRole() == HomeMemberRole.OWNER) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        homeMemberRepository.delete(member);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void transferOwnership(Long homeId, String newOwnerId) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        HomeMember currentOwner = homeMemberRepository
                .findByHomeIdAndUsernameWithUser(homeId, currentUsername)
                .orElseThrow(() -> new UnauthorizedException(ErrorCode.HOME_ACCESS_DENIED));

        if (currentOwner.getRole() != HomeMemberRole.OWNER) {
            throw new UnauthorizedException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        HomeMember newOwnerMember = homeMemberRepository
                .findByHomeIdAndUserIdWithUser(homeId, newOwnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in this home"));

        if (currentOwner.getId().equals(newOwnerMember.getId())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        if (!"ACTIVE".equals(newOwnerMember.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        currentOwner.setRole(HomeMemberRole.ADMIN);
        currentOwner.setUpdatedAt(LocalDateTime.now());

        newOwnerMember.setRole(HomeMemberRole.OWNER);
        newOwnerMember.setUpdatedAt(LocalDateTime.now());

        homeMemberRepository.saveAll(List.of(currentOwner, newOwnerMember));

        log.info("Ownership transferred for home {}: {} -> {}",
                homeId, currentUsername, newOwnerMember.getUser().getUsername());
    }

    private boolean isSystemAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @Override
    public boolean isMember(Long homeId, String userId) {
        return homeMemberRepository.findByHomeIdAndUserId(homeId, userId).isPresent();
    }

    // Helper: Lấy Member hiện tại hoặc ném lỗi nếu không thuộc nhà
    private HomeMember getMemberOrThrow(Long homeId, String username) {
        return homeMemberRepository.findByHomeIdAndUsernameWithUser(homeId, username)
                .orElseThrow(() -> new UnauthorizedException(ErrorCode.HOME_ACCESS_DENIED));
    }

    // Helper: Validate quyền hạn tối thiểu
    private void validatePrivilege(HomeMember member, HomeMemberRole minRole) {
        HomeMemberRole currentRole = member.getRole();

        // Logic so sánh: OWNER > ADMIN > MEMBER > GUEST
        // Ở đây so sánh đơn giản: Nếu cần role ADMIN thì chỉ OWNER và ADMIN được phép
        if (minRole == HomeMemberRole.ADMIN) {
            if (currentRole != HomeMemberRole.OWNER && currentRole != HomeMemberRole.ADMIN) {
                throw new UnauthorizedException(ErrorCode.INSUFFICIENT_PERMISSIONS);
            }
        }
    }
}