package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface DeviceMapper {

    @Mapping(target = "type", source = "deviceType")
    @Mapping(target = "room.id", source = "roomId")
    Device toDevice(DeviceCreateRequest request);

    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomName", source = "room.name")
    DeviceResponse toDeviceResponse(Device device);

    @Mapping(target = "type", source = "type")
    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomName", source = "room.name")
    DeviceListResponse toListResponse(Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateDevice(@MappingTarget Device device, DeviceUpdateRequest request);
}
