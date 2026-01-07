package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.enums.HomeMemberStatus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface HomeMemberMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "avatarUrl", source = "user.avatarUrl")
    @Mapping(target = "role", source = "role")
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")

    @Mapping(target = "permissions", expression = "java(homeMember.getAllPermissions())")
    @Mapping(target = "customRoleName", source = "customRoleName")
    @Mapping(target = "invitedBy", source = "invitedBy")
    @Mapping(target = "invitedAt", source = "invitedAt")
    @Mapping(target = "joinedAt", source = "joinedAt")
    HomeMemberResponse toResponse(HomeMember homeMember);

    @Named("stringToStatus")
    default HomeMemberStatus stringToStatus(String status) {
        if (status == null) return null;
        try {
            return HomeMemberStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return HomeMemberStatus.INACTIVE;
        }
    }
}