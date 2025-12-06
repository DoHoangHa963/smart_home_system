package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.UserCreationRequest;
import com.example.smart_home_system.dto.request.UserUpdateRequest;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.entity.User;

import java.util.List;

public interface UserService {
    UserResponse createUser(UserCreationRequest request);

    UserResponse updateUser(UserUpdateRequest request);

    UserResponse getMyInfo();

    void deleteUser(String userId);
    List<User> getUsers();
    UserResponse getUser(String userId);
}
