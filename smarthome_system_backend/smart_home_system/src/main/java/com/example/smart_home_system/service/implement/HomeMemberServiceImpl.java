package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.AddMemberRequest;
import com.example.smart_home_system.dto.request.UpdateRoleRequest;
import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomeMemberStatus;
import com.example.smart_home_system.enums.HomePermission;
import com.example.smart_home_system.exception.*;
import com.example.smart_home_system.mapper.HomeMemberMapper;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.EventLogService;
import com.example.smart_home_system.service.HomeMemberService;
import com.example.smart_home_system.util.PermissionUtils;
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
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Implementation of {@link HomeMemberService} for managing home membership.
 * 
 * <p>This service provides the core business logic for member management including:
 * <ul>
 *   <li>Adding members with role and permission assignment</li>
 *   <li>Removing members with privilege validation</li>
 *   <li>Updating member roles with default permissions</li>
 *   <li>Ownership transfer between members</li>
 * </ul>
 * 
 * <p><b>Permission Model:</b>
 * The service uses a hybrid permission model:
 * <ul>
 *   <li><b>Role-based:</b> OWNER, ADMIN, MEMBER, GUEST have default permissions</li>
 *   <li><b>Custom:</b> Individual permissions can be added/removed per member</li>
 * </ul>
 * 
 * <p><b>Member Operations Rules:</b>
 * <ul>
 *   <li>OWNER can perform all operations</li>
 *   <li>ADMIN can add/remove MEMBER and GUEST</li>
 *   <li>ADMIN cannot remove other ADMINs</li>
 *   <li>Nobody can remove the OWNER</li>
 *   <li>OWNER cannot leave without transferring ownership</li>
 * </ul>
 * 
 * <p><b>Ownership Transfer:</b>
 * Uses SERIALIZABLE isolation level to prevent race conditions
 * when transferring ownership.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see HomeMemberService
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HomeMemberServiceImpl implements HomeMemberService {

    private final HomeMemberRepository homeMemberRepository;
    private final HomeRepository homeRepository;
    private final UserRepository userRepository;
    private final HomeMemberMapper homeMemberMapper;
    private final PermissionServiceImpl permissionService;
    private final EventLogService eventLogService;

    @Override
    @Transactional
    public HomeMemberResponse addMember(Long homeId, AddMemberRequest request) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        // 1. Lấy người mời
        HomeMember requester = getMemberOrThrow(homeId, currentUsername);

        // 2. CHECK QUYỀN: OWNER luôn có quyền, sau đó check permission hoặc ADMIN role
        HomeMemberRole requesterRole = requester.getRole();
        if (requesterRole != HomeMemberRole.OWNER) {
            // Nếu không phải OWNER, check permission hoặc ADMIN role
            if (!requester.hasPermission("MEMBER_INVITE")) {
                // Fallback: Nếu không có quyền mềm, check Role cứng (tương thích ngược)
                validatePrivilege(requester, HomeMemberRole.ADMIN);
            }
        }
        // OWNER luôn có quyền, không cần check thêm

        // 3. Tìm user
        User targetUser = userRepository.findByUsername(request.getIdentifier())
                .or(() -> userRepository.findByEmail(request.getIdentifier()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        HomeMemberRole role = request.getRole() != null ?
                request.getRole() : HomeMemberRole.MEMBER;

        Set<HomePermission> defaultPermissions = PermissionUtils.getDefaultPermissionsByRole(role);
        String permissionsJson = PermissionUtils.toPermissionsJsonFromEnum(defaultPermissions);

        // 4. Validate Duplicate
        if (homeMemberRepository.existsByHomeIdAndUserId(homeId, targetUser.getId())) {
            throw new DuplicateResourceException("User is already a member of this home");
        }

        HomeMemberRole roleGetFromRequest = request.getRole() != null ?
                request.getRole() : HomeMemberRole.MEMBER;

        // 5. Build Member mới
        HomeMember newMember = HomeMember.builder()
                .home(requester.getHome())
                .user(targetUser)
                .role(roleGetFromRequest)
                .status(HomeMemberStatus.ACTIVE.name())
                .invitedBy(currentUsername)
                .invitedAt(LocalDateTime.now())
                .permissions(permissionsJson) // <--- QUAN TRỌNG: Khởi tạo permissions rỗng để tránh NULL
                .joinedAt(LocalDateTime.now())
                .build();

        HomeMember savedMember = homeMemberRepository.save(newMember);
        
        // Ghi log thêm member
        String eventValue = String.format("{\"role\":\"%s\",\"username\":\"%s\"}",
                savedMember.getRole().name(), targetUser.getUsername());
        eventLogService.logMemberEvent(homeId, targetUser.getId(), "MEMBER_ADD", eventValue, "WEB");

        return homeMemberMapper.toResponse(savedMember);
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

        // Ghi log trước khi xóa
        String eventValue = String.format("{\"role\":\"%s\",\"username\":\"%s\"}",
                targetMember.getRole().name(), targetMember.getUser().getUsername());
        eventLogService.logMemberEvent(homeId, targetUserId, "MEMBER_REMOVE", eventValue, "WEB");
        
        // 3. Xóa (Soft Delete hoặc Hard Delete tùy cấu hình BaseEntity)
        homeMemberRepository.delete(targetMember);
    }

    @Override
    @Transactional
    public HomeMemberResponse updateMemberRole(Long homeId, String targetUserId, UpdateRoleRequest request) {
        String currentUsername = SecurityUtils.getCurrentUsername();

        // 1. Lấy người thực hiện
        HomeMember requester = getMemberOrThrow(homeId, currentUsername);

        // 2. CHECK QUYỀN MỀM (Flexible Permission) thay vì Role cứng
        if (!requester.hasPermission("MEMBER_UPDATE")) {
            // Fallback: Nếu không có quyền mềm, check Role cứng
            // Chỉ OWNER mới được update role của người khác
            validatePrivilege(requester, HomeMemberRole.OWNER);
        }

        // 3. Tìm member cần update
        HomeMember targetMember = homeMemberRepository.findByHomeIdAndUserId(homeId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        // 4. Validate: Không được update role của chính mình
        if (requester.getId().equals(targetMember.getId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không thể thay đổi vai trò của chính mình");
        }

        // 5. Validate: Không được hạ cấp/chuyển role của OWNER trừ khi là API transferOwnership
        if (targetMember.getRole() == HomeMemberRole.OWNER) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Không thể thay đổi role của Owner. Vui lòng sử dụng API chuyển quyền sở hữu.");
        }

        // 6. Lấy role mới từ request
        HomeMemberRole newRole = request.getNewRole() != null ?
                request.getNewRole() : HomeMemberRole.MEMBER;

        // 7. Lấy default permissions cho role mới và convert sang JSON
        Set<HomePermission> defaultPermissions = PermissionUtils.getDefaultPermissionsByRole(newRole);
        String permissionsJson = PermissionUtils.toPermissionsJsonFromEnum(defaultPermissions);

        // 8. Cập nhật thông tin
        HomeMemberRole oldRole = targetMember.getRole();
        targetMember.setRole(newRole);
        targetMember.setPermissions(permissionsJson);
        targetMember.setUpdatedAt(LocalDateTime.now());

        // 9. Save và trả về response
        HomeMember updatedMember = homeMemberRepository.save(targetMember);
        
        // Ghi log cập nhật role
        String eventValue = String.format("{\"oldRole\":\"%s\",\"newRole\":\"%s\",\"username\":\"%s\"}",
                oldRole.name(), newRole.name(), updatedMember.getUser().getUsername());
        eventLogService.logMemberEvent(homeId, targetUserId, "MEMBER_UPDATE_ROLE", eventValue, "WEB");
        
        return homeMemberMapper.toResponse(updatedMember);
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

        // Ghi log rời nhà
        String eventValue = String.format("{\"role\":\"%s\",\"username\":\"%s\"}",
                member.getRole().name(), member.getUser().getUsername());
        eventLogService.logMemberEvent(homeId, member.getUser().getId(), "MEMBER_LEAVE", eventValue, "WEB");

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
        
        // Ghi log chuyển quyền sở hữu
        String eventValue = String.format("{\"oldOwner\":\"%s\",\"newOwner\":\"%s\",\"newOwnerId\":\"%s\"}",
                currentUsername, newOwnerMember.getUser().getUsername(), newOwnerId);
        eventLogService.logMemberEvent(homeId, newOwnerId, "HOME_TRANSFER_OWNERSHIP", eventValue, "WEB");
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

    @Override
    @Transactional(readOnly = true)
    public HomeMemberResponse getMemberByHomeIdAndUserId(Long homeId, String userId) {
        try {
            HomeMember member = homeMemberRepository.findByHomeIdAndUserIdWithUser(homeId, userId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Member not found for homeId: " + homeId + " and userId: " + userId
                    ));

            return homeMemberMapper.toResponse(member);
        } catch (ResourceNotFoundException e) {
            homeRepository.findById(homeId).ifPresent(home -> {
                if (home.getOwner() != null && userId.equals(home.getOwner().getId())) {
                    log.info("User {} is owner of home {} but not in home_members table", userId, homeId);
                }
            });

            throw e;
        }
    }

    // Helper: Lấy Member hiện tại hoặc ném lỗi nếu không thuộc nhà
    private HomeMember getMemberOrThrow(Long homeId, String username) {
        return homeMemberRepository.findByHomeIdAndUsernameWithUser(homeId, username)
                .orElseThrow(() -> new UnauthorizedException(ErrorCode.HOME_ACCESS_DENIED));
    }

    // Helper: Validate quyền hạn tối thiểu
    private void validatePrivilege(HomeMember member, HomeMemberRole minRole) {
        HomeMemberRole currentRole = member.getRole();

        if (minRole == HomeMemberRole.ADMIN) {
            if (currentRole != HomeMemberRole.OWNER && currentRole != HomeMemberRole.ADMIN) {
                throw new UnauthorizedException(ErrorCode.INSUFFICIENT_PERMISSIONS);
            }
        }
    }
}