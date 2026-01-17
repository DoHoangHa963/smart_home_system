package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Room;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findById(@NotNull(message = "ROOMID_REQUIRED") Long roomId);

    boolean existsById(Long roomId);

    List<Room> findByHomeId(Long homeId);

    Page<Room> findByHomeId(Long homeId, Pageable pageable);

    @Query("SELECT r FROM Room r WHERE r.home.id = :homeId AND LOWER(r.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Room> findByHomeIdAndNameContainingIgnoreCase(
            @Param("homeId") Long homeId,
            @Param("name") String name,
            Pageable pageable
    );

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END " +
            "FROM Room r " +
            "JOIN r.home h " +
            "LEFT JOIN h.members hm " +
            "WHERE r.id = :roomId " +
            "AND (" +
            "   h.owner.username = :username " +
            "   OR " +
            "   (hm.user.username = :username AND hm.status = 'ACTIVE') " +
            ")")
    boolean isUserMemberOfHouseByRoomId(@Param("roomId") Long roomId,
                                        @Param("username") String username);

    boolean existsByNameAndHomeId(String name, Long homeId);

    @Query("SELECT COUNT(d) FROM Room r JOIN r.devices d WHERE r.id = :roomId")

    long countDevicesInRoom(@Param("roomId") Long roomId);

    @Query("SELECT COUNT(r) FROM Room r " +
            "WHERE r.home.id = :homeId AND r.deletedAt IS null ")
    int countByHomeIdAndStatus(@Param("homeId") Long homeId);
}