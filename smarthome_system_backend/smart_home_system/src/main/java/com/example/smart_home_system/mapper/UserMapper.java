package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.RegisterRequest;
import com.example.smart_home_system.dto.request.UserCreationRequest;
import com.example.smart_home_system.dto.request.UserUpdateRequest;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.entity.User;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

@Mapper(componentModel = "spring",
        uses = {RoleMapper.class, PermissionMapper.class, UserDevicePermissionMapper.class})
public interface UserMapper {

    @Mapping(target = "roles", ignore = true)
    User toUser(UserCreationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "roles", ignore = true)       // Handled in service
    @Mapping(target = "password", ignore = true)    // Must be encoded in service
    @Mapping(target = "status", ignore = true)      // Default status set in service
    User toUser(RegisterRequest request);

    @Mapping(target = "roles", source = "roles", qualifiedByName = "rolesToStringSet")
    UserResponse toUserResponse(User user);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "roles", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
