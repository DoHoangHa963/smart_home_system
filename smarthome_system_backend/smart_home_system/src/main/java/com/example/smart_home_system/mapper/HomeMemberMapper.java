package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.enums.HomeMemberStatus;
import com.example.smart_home_system.util.PermissionUtils;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Set;

@Mapper(componentModel = "spring", imports = {PermissionUtils.class})
public interface HomeMemberMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "avatarUrl", source = "user.avatarUrl")
    @Mapping(target = "role", source = "role")
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    @Mapping(target = "customRoleName", source = "customRoleName")
    @Mapping(target = "invitedBy", source = "invitedBy")
    @Mapping(target = "invitedAt", source = "invitedAt")
    @Mapping(target = "joinedAt", source = "joinedAt")
    @Mapping(target = "permissions", expression = "java(getPermissionsAsList(homeMember))")
    HomeMemberResponse toResponse(HomeMember homeMember);

    @Named("stringToStatus")
    default HomeMemberStatus stringToStatus(String status) {
        if (status == null) return null;
        try {
            return HomeMemberStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            return HomeMemberStatus.INACTIVE;
        }
    }

    // THÊM: Method để lấy permissions dưới dạng List<String>
    default Set<String> getPermissionsAsList(HomeMember homeMember) {
        if (homeMember == null || homeMember.getPermissions() == null) {
            return Set.of();
        }

        // Sử dụng PermissionUtils để parse JSON string thành Set<String>
        return PermissionUtils.parsePermissionsFromJson(homeMember.getPermissions());
    }
}