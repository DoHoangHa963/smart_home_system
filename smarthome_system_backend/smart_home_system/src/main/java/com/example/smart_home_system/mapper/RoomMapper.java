package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.RoomRequest;
import com.example.smart_home_system.dto.response.RoomResponse;
import com.example.smart_home_system.entity.Room;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RoomMapper {
    @Mapping(target = "homeId", source = "home.id")
    @Mapping(target = "homeName", source = "home.name")
    @Mapping(target = "deviceCount", expression = "java(room.getDevices() != null ? room.getDevices().size() : 0)")
    RoomResponse toResponse(Room room);

    Room toEntity(RoomRequest request);

    void updateRoomFromRequest(@MappingTarget Room room, RoomRequest request);
}