package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.HomeRequest;
import com.example.smart_home_system.dto.response.HomeResponse;
import com.example.smart_home_system.dto.response.admin.RecentActivityResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service interface for managing Home entities in the Smart Home System.
 * 
 * <p>This service provides comprehensive home management operations including:
 * <ul>
 *   <li>CRUD operations for homes</li>
 *   <li>Home membership and ownership verification</li>
 *   <li>Permission-based access control</li>
 *   <li>Ownership transfer functionality</li>
 * </ul>
 * 
 * <p><b>Business Rules:</b>
 * <ul>
 *   <li>Each user can own a maximum of 3 homes (configurable)</li>
 *   <li>Home names must be unique per owner</li>
 *   <li>Only the OWNER can delete or transfer ownership of a home</li>
 *   <li>Home members are automatically added with appropriate roles</li>
 * </ul>
 * 
 * <p><b>Security:</b>
 * All operations are secured using Spring Security with role-based
 * and permission-based access control via {@code @PreAuthorize} annotations.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see HomeServiceImpl
 * @see HomeMemberService
 */
public interface HomeService {
    HomeResponse createHome(HomeRequest request);
    HomeResponse updateHome(Long homeId, HomeRequest request);
    void deleteHome(Long homeId);
    HomeResponse getHomeById(Long homeId);
    Page<HomeResponse> getMyHomes(Pageable pageable);
    Page<HomeResponse> getAllHomes(Pageable pageable);

    Page<HomeResponse> searchHomes(String keyword, Pageable pageable); // optional
    HomeResponse getHomeWithMembers(Long homeId);

    // For security expressions
    boolean isHomeMember(Long homeId);
    boolean isHomeOwner(Long homeId);
    boolean hasHomePermission(Long homeId, String permission); // Check role-based permission
    boolean hasHomePermissionByName(Long homeId, String permissionName); // Check individual permission (including custom)

    // New methods for controller
    void leaveHome(Long homeId);
    void transferOwnership(Long homeId, String newOwnerId);

    // Recent activities
    List<RecentActivityResponse> getRecentActivities(Long homeId, int limit);
}