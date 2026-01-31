package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.HomeRequest;
import com.example.smart_home_system.dto.response.HomeResponse;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomeMemberStatus;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.mapper.HomeMapper;
import com.example.smart_home_system.dto.response.admin.RecentActivityResponse;
import com.example.smart_home_system.entity.EventLog;
import com.example.smart_home_system.repository.EventLogRepository;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.EventLogService;
import org.springframework.data.domain.PageRequest;
import com.example.smart_home_system.service.HomeMemberService;
import com.example.smart_home_system.service.HomeService;
import com.example.smart_home_system.util.PermissionUtils;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Implementation of {@link HomeService} for managing Home entities.
 * 
 * <p>This service provides the core business logic for home management including:
 * <ul>
 *   <li>Creating homes with automatic owner member creation</li>
 *   <li>Updating and deleting homes with ownership verification</li>
 *   <li>Retrieving homes with membership statistics</li>
 *   <li>Permission and ownership verification methods</li>
 * </ul>
 * 
 * <p><b>Transaction Management:</b>
 * All methods are transactional. Read operations use read-only transactions
 * for better performance.
 * 
 * <p><b>Home Creation Flow:</b>
 * <ol>
 *   <li>Validate user hasn't exceeded home limit</li>
 *   <li>Check for duplicate home name</li>
 *   <li>Validate timezone</li>
 *   <li>Create home entity</li>
 *   <li>Auto-create OWNER HomeMember entry</li>
 * </ol>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see HomeService
 */
@Service("homeService")
@RequiredArgsConstructor
@Transactional
@Slf4j
public class HomeServiceImpl implements HomeService {
    private final HomeRepository homeRepository;
    private final HomeMemberRepository homeMemberRepository;
    private final UserRepository userRepository;
    private final HomeMapper homeMapper;
    private final HomeMemberService homeMemberService;
    private final int MAX_HOMES_PER_USER = 3;
    private final RoomRepository roomRepository;
    private final EventLogRepository eventLogRepository;
    private final EventLogService eventLogService;

    @Override
    @Transactional
    public HomeResponse createHome(HomeRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            long currentHomes = homeRepository.countByOwnerIdAndDeletedAtIsNull(currentUserId);

            if (currentHomes >= MAX_HOMES_PER_USER) {
                log.warn("User {} tried to create home but reached limit of {}", currentUserId, MAX_HOMES_PER_USER);
                throw new AppException(ErrorCode.HOME_LIMIT_REACHED);
            }
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 1. Check duplicate name for owner
        if (homeRepository.existsByNameAndOwnerId(request.getName(), currentUserId)) {
            throw new AppException(ErrorCode.HOME_NAME_EXISTS);
        }

        if (!VALID_TIME_ZONES.contains(request.getTimeZone())) {
            throw new AppException(ErrorCode.HOME_INVALID_TIMEZONE);
        }

        // 2. Create Home
        Home home = homeMapper.toEntity(request);
        home.setOwner(currentUser);
        home = homeRepository.save(home);

        // 3. Auto add Creator as OWNER in HomeMember table
        HomeMember ownerMember = HomeMember.builder()
                .home(home)
                .user(currentUser)
                .role(HomeMemberRole.OWNER)
                .status(HomeMemberStatus.ACTIVE.name())
                .joinedAt(LocalDateTime.now())
                .invitedBy("SYSTEM")
                .invitedAt(LocalDateTime.now()) // THÊM
                .permissions(PermissionUtils.getDefaultPermissionsJsonByRole(HomeMemberRole.OWNER))
                .build();

        homeMemberRepository.save(ownerMember);

        // Ghi log tạo home
        String eventValue = String.format("{\"homeName\":\"%s\",\"address\":\"%s\",\"timeZone\":\"%s\"}",
                home.getName(), home.getAddress() != null ? home.getAddress() : "",
                home.getTimeZone() != null ? home.getTimeZone() : "");
        eventLogService.logHomeEvent(home, "HOME_CREATE", eventValue, "WEB");

        return homeMapper.toResponse(home);
    }

    @Override
    @Transactional
    public HomeResponse updateHome(Long homeId, HomeRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Home home = homeRepository.findByIdAndOwnerId(homeId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        if (home.getDeletedAt() != null) {
            throw new AppException(
                    ErrorCode.HOME_DELETED,
                    "Home id=" + homeId + " is already soft-deleted"
            );
        }

        homeMapper.updateHomeFromRequest(home, request);
        Home updatedHome = homeRepository.save(home);
        
        // Ghi log cập nhật home
        String eventValue = String.format("{\"homeName\":\"%s\",\"address\":\"%s\"}",
                updatedHome.getName(), updatedHome.getAddress() != null ? updatedHome.getAddress() : "");
        eventLogService.logHomeEvent(updatedHome, "HOME_UPDATE", eventValue, "WEB");
        
        return homeMapper.toResponse(updatedHome);
    }

    @Override
    @Transactional
    public void deleteHome(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Home home = homeRepository.findByIdAndOwnerId(homeId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        // Ghi log trước khi xóa
        String eventValue = String.format("{\"homeName\":\"%s\",\"address\":\"%s\"}",
                home.getName(), home.getAddress() != null ? home.getAddress() : "");
        eventLogService.logHomeEvent(home, "HOME_DELETE", eventValue, "WEB");
        
        // Soft delete (BaseEntity xử lý nếu cấu hình) hoặc xóa cứng cascade
        home.softDelete();
        homeRepository.save(home);
        //homeRepository.delete(home);
    }

    @Override
    @Transactional(readOnly = true)
    public HomeResponse getHomeById(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        Home home = member.getHome();

        int memberCount = homeMemberRepository.countByHomeId(homeId);
        int roomCount = roomRepository.countByHomeIdAndStatus(homeId);

        HomeResponse response = homeMapper.toResponse(home);

        response.setMemberCount(memberCount);
        response.setRoomCount(roomCount);

        return response;
    }

    // HomeServiceImpl.java - Giải pháp nhanh nhất
    @Transactional(readOnly = true)
    @Override
    public Page<HomeResponse> getMyHomes(Pageable pageable) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Page<Home> homesPage = homeRepository.findByUserIdWithOwner(currentUserId, pageable);

        // Tính counts cho từng home
        List<HomeResponse> responses = homesPage.getContent().stream()
                .map(home -> {
                    HomeResponse response = homeMapper.toBasicResponse(home);

                    int memberCount = homeMemberRepository.countByHomeId(home.getId());
                    int roomCount = roomRepository.countByHomeIdAndStatus(home.getId());

                    response.setMemberCount(memberCount);
                    response.setRoomCount(roomCount);

                    return response;
                })
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, homesPage.getTotalElements());
    }

    @Override
    public Page<HomeResponse> getAllHomes(Pageable pageable) {
        Page<Home> homesPage  = homeRepository.findAllByDeletedAtIsNull(pageable);

        List<HomeResponse> responses = homesPage.getContent().stream()
                .map(home -> {
                    HomeResponse response = homeMapper.toBasicResponse(home);

                    int memberCount = homeMemberRepository.countByHomeId(home.getId());
                    int roomCount = roomRepository.countByHomeIdAndStatus(home.getId());

                    response.setMemberCount(memberCount);
                    response.setRoomCount(roomCount);

                    return response;
                })
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, homesPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    @Override
    public Page<HomeResponse> searchHomes(String keyword, Pageable pageable) {
        log.debug("Searching homes with keyword: {}, page: {}, size: {}",
                keyword, pageable.getPageNumber(), pageable.getPageSize());

        Specification<Home> spec = Specification.where(null);

        if (StringUtils.hasText(keyword)) {
            Specification<Home> nameSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.like(
                            criteriaBuilder.lower(root.get("name")),
                            "%" + keyword.toLowerCase() + "%"
                    );

            spec = spec.and(nameSpec);
        }

        // Chỉ lấy home chưa bị xóa
        Specification<Home> notDeletedSpec = (root, query, criteriaBuilder) ->
                criteriaBuilder.isNull(root.get("deletedAt"));

        spec = spec.and(notDeletedSpec);

        Page<Home> homesPage = homeRepository.findAll(spec, pageable);
        return homesPage.map(homeMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isHomeMember(Long homeId) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            if (currentUserId == null) {
                return false;
            }
            return homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId).isPresent();
        } catch (Exception e) {
            log.error("Error checking home membership for homeId={}: {}", homeId, e.getMessage(), e);
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true, timeout = 5)  // Timeout 5 giây để tránh chờ quá lâu
    public boolean isHomeOwner(Long homeId) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            if (currentUserId == null) {
                return false;
            }
            // Sử dụng exists query để tối ưu performance thay vì find + isPresent
            boolean isOwner = homeMemberRepository.existsByHomeIdAndUserIdAndRole(
                    homeId,
                    currentUserId,
                    HomeMemberRole.OWNER
            );
            return isOwner;
        } catch (org.springframework.transaction.TransactionTimedOutException e) {
            log.warn("Transaction timeout when checking home ownership for homeId={}", homeId);
            return false;
        } catch (Exception e) {
            log.error("Error checking home ownership for homeId={}: {}", homeId, e.getMessage(), e);
            return false;
        }
    }

    @Override
    public boolean hasHomePermission(Long homeId, String permission) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

        HomeMemberRole role = member.getRole();
        switch (permission) {
            case "ADMIN":
                return role == HomeMemberRole.OWNER || role == HomeMemberRole.ADMIN;
            case "MANAGE_MEMBERS":
                return role == HomeMemberRole.OWNER || role == HomeMemberRole.ADMIN;
            case "MANAGE_DEVICES":
                return role == HomeMemberRole.OWNER || role == HomeMemberRole.ADMIN || role == HomeMemberRole.MEMBER;
            default:
                return role == HomeMemberRole.OWNER;
        }
    }

    @Override
    public boolean hasHomePermissionByName(Long homeId, String permissionName) {
        try {
            String currentUserId = SecurityUtils.getCurrentUserId();
            HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                    .orElse(null);

            if (member == null) {
                return false;
            }

            // Check if member has this specific permission (includes role-based + custom permissions)
            return member.hasPermission(permissionName);
        } catch (Exception e) {
            log.warn("Error checking permission {} for home {}: {}", permissionName, homeId, e.getMessage());
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public HomeResponse getHomeWithMembers(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Kiểm tra user có phải là thành viên của home không
        if (!isHomeMember(homeId)) {
            throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
        }

        // Lấy home với fetch eager
        // Sử dụng query tối ưu
        Home home = homeRepository.findByIdWithMembersAndUsers(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));

        // Map sang response (sẽ bao gồm members)
        return homeMapper.toResponse(home);
    }

    @Override
    public void leaveHome(Long homeId) {
        homeMemberService.leaveHome(homeId);
    }

    @Override
    public void transferOwnership(Long homeId, String newOwnerId) {
        homeMemberService.transferOwnership(homeId, newOwnerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecentActivityResponse> getRecentActivities(Long homeId, int limit) {
        // Kiểm tra quyền truy cập
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (!homeMemberRepository.existsByHomeIdAndUserId(homeId, currentUserId)) {
            throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
        }

        // Lấy event logs theo homeId
        List<EventLog> eventLogs = eventLogRepository.findRecentLogsByHomeId(
                homeId, PageRequest.of(0, limit));

        // Map sang RecentActivityResponse
        return eventLogs.stream()
                .map(this::mapToActivityResponse)
                .collect(Collectors.toList());
    }

    /**
     * Map EventLog entity sang RecentActivityResponse DTO
     */
    private RecentActivityResponse mapToActivityResponse(EventLog log) {
        String username = log.getUser() != null ? log.getUser().getUsername() : "System";
        String deviceName = log.getDevice() != null ? log.getDevice().getName() : null;
        
        // Format description dựa trên eventType và device
        String description;
        if (deviceName != null) {
            description = formatActivityDescription(log.getEventType(), deviceName, username);
        } else {
            description = String.format("[%s] %s: %s", 
                    log.getSource() != null ? log.getSource() : "System",
                    username, 
                    log.getEventType());
        }

        // Xác định type dựa trên eventType
        String type = "INFO";
        if (log.getEventType() != null) {
            String eventTypeUpper = log.getEventType().toUpperCase();
            if (eventTypeUpper.contains("ERROR") || eventTypeUpper.contains("FAIL")) {
                type = "ERROR";
            } else if (eventTypeUpper.contains("WARNING") || eventTypeUpper.contains("ALERT")) {
                type = "WARNING";
            } else if (eventTypeUpper.contains("SUCCESS") || eventTypeUpper.contains("COMPLETE")) {
                type = "SUCCESS";
            }
        }

        return RecentActivityResponse.builder()
                .id(log.getId())
                .description(description)
                .type(type)
                .relatedUser(username)
                .timestamp(log.getCreatedAt())
                .build();
    }

    /**
     * Format activity description dựa trên eventType
     */
    private String formatActivityDescription(String eventType, String deviceName, String username) {
        if (eventType == null) {
            return String.format("%s: %s", deviceName, "Hoạt động");
        }

        String eventUpper = eventType.toUpperCase();
        
        // Device control events
        if (eventUpper.contains("TURN_ON") || eventUpper.contains("ON")) {
            return String.format("%s đã bật %s", username, deviceName);
        }
        if (eventUpper.contains("TURN_OFF") || eventUpper.contains("OFF")) {
            return String.format("%s đã tắt %s", username, deviceName);
        }
        if (eventUpper.contains("TOGGLE")) {
            return String.format("%s đã chuyển trạng thái %s", username, deviceName);
        }
        
        // Device status events
        if (eventUpper.contains("ONLINE")) {
            return String.format("%s đã kết nối", deviceName);
        }
        if (eventUpper.contains("OFFLINE")) {
            return String.format("%s đã ngắt kết nối", deviceName);
        }
        
        // Sensor events
        if (eventUpper.contains("MOTION") || eventUpper.contains("MOVEMENT")) {
            return String.format("Phát hiện chuyển động ở %s", deviceName);
        }
        if (eventUpper.contains("DOOR") && eventUpper.contains("OPEN")) {
            return String.format("%s đã mở", deviceName);
        }
        if (eventUpper.contains("DOOR") && eventUpper.contains("CLOSE")) {
            return String.format("%s đã đóng", deviceName);
        }
        if (eventUpper.contains("GAS") || eventUpper.contains("ALERT")) {
            return String.format("Cảnh báo: %s phát hiện khí gas", deviceName);
        }
        
        // Default
        return String.format("%s: %s (%s)", deviceName, eventType, username);
    }

    private static final Set<String> VALID_TIME_ZONES = Set.of(
            "Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Singapore", "Asia/Hong_Kong",
            "Asia/Shanghai", "Asia/Taipei", "Asia/Seoul", "Asia/Tokyo",
            "Australia/Perth", "Australia/Sydney", "Pacific/Auckland",
            "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
            "America/New_York", "America/Chicago", "America/Denver",
            "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo"
    );
}