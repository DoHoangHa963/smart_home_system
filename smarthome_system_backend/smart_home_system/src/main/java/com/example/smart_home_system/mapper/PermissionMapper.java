package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.PermissionRequest;
import com.example.smart_home_system.dto.response.PermissionResponse;
import com.example.smart_home_system.entity.Permission;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);
    PermissionResponse toPermissionResponse(Permission permission);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updatePermission(
            @MappingTarget Permission permission,
            PermissionRequest request
    );
}
