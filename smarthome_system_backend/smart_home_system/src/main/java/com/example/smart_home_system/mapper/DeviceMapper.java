package com.example.smart_home_system.mapper;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.util.GPIOMapping;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public abstract class DeviceMapper {

    @Mapping(target = "type", source = "deviceType")
    @Mapping(target = "room", ignore = true) // Room is set manually in service to handle null roomId
    @Mapping(target = "gpioPin", source = "gpioPin")
    public abstract Device toDevice(DeviceCreateRequest request);

    @Mapping(target = "roomId", source = "room.id", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @Mapping(target = "roomName", source = "room.name", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @Mapping(target = "gpioPin", ignore = true) // Sẽ được set trong @AfterMapping
    public abstract DeviceResponse toDeviceResponse(Device device);

    @Mapping(target = "type", source = "type")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "stateValue", source = "stateValue")
    @Mapping(target = "roomId", source = "room.id", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @Mapping(target = "roomName", source = "room.name", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @Mapping(target = "gpioPin", ignore = true) // Sẽ được set trong @AfterMapping
    public abstract DeviceListResponse toListResponse(Device device);

    /**
     * Map GPIO pin cho DeviceResponse
     * Ưu tiên gpioPin đã lưu trong device entity (user đã chọn khi tạo)
     * Fallback về GPIOMapping nếu không có
     */
    @AfterMapping
    protected void mapGPIO(@MappingTarget DeviceResponse response, Device device) {
        if (device != null) {
            // Ưu tiên gpioPin đã lưu trong entity
            if (device.getGpioPin() != null) {
                response.setGpioPin(device.getGpioPin());
            } else if (device.getDeviceCode() != null) {
                // Fallback về GPIOMapping nếu chưa có gpioPin
                response.setGpioPin(GPIOMapping.getGPIOFromDeviceCode(device.getDeviceCode()));
            }
        }
    }

    /**
     * Map GPIO pin cho DeviceListResponse
     * Ưu tiên gpioPin đã lưu trong device entity (user đã chọn khi tạo)
     * Fallback về GPIOMapping nếu không có
     */
    @AfterMapping
    protected void mapGPIO(@MappingTarget DeviceListResponse response, Device device) {
        if (device != null) {
            // Ưu tiên gpioPin đã lưu trong entity
            if (device.getGpioPin() != null) {
                response.setGpioPin(device.getGpioPin());
            } else if (device.getDeviceCode() != null) {
                // Fallback về GPIOMapping nếu chưa có gpioPin
                response.setGpioPin(GPIOMapping.getGPIOFromDeviceCode(device.getDeviceCode()));
            }
        }
    }

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    public abstract void updateDevice(@MappingTarget Device device, DeviceUpdateRequest request);
}
