package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.UserDevicePermissionCreateRequest;
import com.example.smart_home_system.dto.request.UserDevicePermissionUpdateRequest;
import com.example.smart_home_system.dto.response.UserDevicePermissionResponse;
import com.example.smart_home_system.entity.UserDevicePermission;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface UserDevicePermissionMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "device", ignore = true)
    UserDevicePermission toEntity(UserDevicePermissionCreateRequest request);

    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "deviceId", source = "device.id")
    @Mapping(target = "deviceName", source = "device.name")
    UserDevicePermissionResponse toResponse(UserDevicePermission entity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "device", ignore = true)
    void updateEntity(
            @MappingTarget UserDevicePermission entity,
            UserDevicePermissionUpdateRequest request
    );

}
