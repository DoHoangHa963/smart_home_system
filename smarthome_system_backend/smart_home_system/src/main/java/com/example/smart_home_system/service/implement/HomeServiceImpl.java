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
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.HomeMemberService;
import com.example.smart_home_system.service.HomeService;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

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

    @Override
    @Transactional
    public HomeResponse createHome(HomeRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        long currentHomes = homeRepository.countByOwnerId(currentUserId);
        if (currentHomes >= MAX_HOMES_PER_USER) {
            log.warn("User {} tried to create home but reached limit of {}", currentUserId, MAX_HOMES_PER_USER);
            throw new AppException(ErrorCode.HOME_LIMIT_REACHED);
        }

        // 1. Check duplicate name for owner
        if (homeRepository.existsByNameAndOwnerId(request.getName(), currentUserId)) {
            throw new AppException(ErrorCode.HOME_NAME_EXISTS);
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
                .build();

        homeMemberRepository.save(ownerMember);

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
        return homeMapper.toResponse(homeRepository.save(home));
    }

    @Override
    @Transactional
    public void deleteHome(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        Home home = homeRepository.findByIdAndOwnerId(homeId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_ACCESS_DENIED));

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

        return homeMapper.toBasicResponse(home);
    }

    @Transactional(readOnly = true)
    @Override
    public Page<HomeResponse> getMyHomes(Pageable pageable) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Page<Home> homesPage  = homeRepository.findByUserIdWithOwner(currentUserId, pageable);

        return homesPage.map(homeMapper::toResponse);
    }

    @Override
    public Page<HomeResponse> getAllHomes(Pageable pageable) {
        Page<Home> homesPage  = homeRepository.findAllByDeletedAtIsNull(pageable);
        return homesPage.map(homeMapper::toResponse);
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
    public boolean isHomeMember(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            return false;
        }
        return homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId).isPresent();
    }

    @Override
    public boolean isHomeOwner(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        return homeMemberRepository.findByHomeIdAndUserIdAndRole(
                homeId,
                currentUserId,
                HomeMemberRole.OWNER
        ).isPresent();
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
}