package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.DeviceMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceMetricRepository extends JpaRepository<DeviceMetric, Long> {
    List<DeviceMetric> findByDeviceId(Long deviceId);
}