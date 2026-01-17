package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.HomeRequest;
import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.dto.response.HomeResponse;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.entity.Room;
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

    // FIX 1: Dùng toResponse đầy đủ (có counts)
    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "ownerUsername", source = "owner.username")
    @Mapping(target = "memberCount", ignore = true)  // Sẽ set trong @AfterMapping
    @Mapping(target = "roomCount", ignore = true)    // Sẽ set trong @AfterMapping
    @Mapping(target = "members", ignore = true)      // Sẽ set trong @AfterMapping
    public abstract HomeResponse toResponse(Home home);

    // FIX 4: toBasicResponse cũng cần tính counts
    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "ownerUsername", source = "owner.username")
    @Mapping(target = "memberCount", ignore = true)  // Sẽ set trong @AfterMapping
    @Mapping(target = "roomCount", ignore = true)    // Sẽ set trong @AfterMapping
    @Mapping(target = "members", expression = "java(java.util.Collections.emptyList())")
    public abstract HomeResponse toBasicResponse(Home home);

    public abstract Home toEntity(HomeRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "members", ignore = true)
    @Mapping(target = "rooms", ignore = true)
    @Mapping(target = "automations", ignore = true)
    @Mapping(target = "scenes", ignore = true)
    public abstract void updateHomeFromRequest(@MappingTarget Home home, HomeRequest request);
}