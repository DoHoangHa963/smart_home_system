package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.HomeRequest;
import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.dto.response.HomeResponse;
import com.example.smart_home_system.entity.Home;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public abstract class HomeMapper {

    @Autowired
    protected HomeMemberMapper homeMemberMapper;

    // Dành cho response đầy đủ (có members) - Sử dụng query riêng với fetch join
    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "ownerUsername", source = "owner.username")
    @Mapping(target = "memberCount", ignore = true)
    @Mapping(target = "roomCount", ignore = true)
    @Mapping(target = "members", ignore = true)
    public abstract HomeResponse toResponse(Home home);

    @AfterMapping
    protected void mapMembersWithFilter(Home home, @MappingTarget HomeResponse response) {
        // Chỉ tính toán khi collection đã được fetch
        if (home.getMembers() != null) {
            long activeMemberCount = home.getMembers().stream()
                    .filter(member -> member != null && member.getDeletedAt() == null)
                    .count();
            response.setMemberCount((int) activeMemberCount);
        } else {
            response.setMemberCount(0);
        }

        response.setRoomCount(home.getRooms() != null ? home.getRooms().size() : 0);

        if (home.getMembers() != null) {
            List<HomeMemberResponse> members = home.getMembers().stream()
                    .filter(member -> member != null && member.getDeletedAt() == null)
                    .map(homeMemberMapper::toResponse)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            response.setMembers(members);
        } else {
            response.setMembers(Collections.emptyList());
        }
    }

    // Dành cho response cơ bản - KHÔNG truy cập collection
    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "ownerUsername", source = "owner.username")
    @Mapping(target = "memberCount", expression = "java(0)")  // Mặc định 0
    @Mapping(target = "roomCount", expression = "java(0)")    // Mặc định 0
    @Mapping(target = "members", expression = "java(java.util.Collections.emptyList())")
    public abstract HomeResponse toBasicResponse(Home home);

    // Xóa @AfterMapping mapBasicResponse

    public abstract Home toEntity(HomeRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "members", ignore = true)
    @Mapping(target = "rooms", ignore = true)
    @Mapping(target = "automations", ignore = true)
    @Mapping(target = "scenes", ignore = true)
    public abstract void updateHomeFromRequest(@MappingTarget Home home, HomeRequest request);
}