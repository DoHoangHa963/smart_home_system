package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.UserCreationRequest;
import com.example.smart_home_system.dto.request.UserUpdateRequest;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.service.UserService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {
    @Override
    public UserResponse createUser(UserCreationRequest request) {
        return null;
    }

    @Override
    public UserResponse updateUser(UserUpdateRequest request) {
        return null;
    }

    @Override
    public UserResponse getMyInfo() {
        return null;
    }

    @Override
    public void deleteUser(String userId) {

    }

    @Override
    public List<User> getUsers() {
        return List.of();
    }

    @Override
    public UserResponse getUser(String userId) {
        return null;
    }
}
