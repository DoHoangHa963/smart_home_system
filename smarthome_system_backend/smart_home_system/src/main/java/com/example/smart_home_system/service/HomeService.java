package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.HomeRequest;
import com.example.smart_home_system.dto.response.HomeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
    boolean hasHomePermission(Long homeId, String permission);

    // New methods for controller
    void leaveHome(Long homeId);
    void transferOwnership(Long homeId, String newOwnerId);
}