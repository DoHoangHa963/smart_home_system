package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Room;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findById(@NotNull(message = "ROOMID_REQUIRED") Long roomId);

    boolean existsById(Long roomId);
    List<Room> findByHomeId(Long homeId);

    boolean existsByNameAndHomeId(String name, Long homeId);
}
