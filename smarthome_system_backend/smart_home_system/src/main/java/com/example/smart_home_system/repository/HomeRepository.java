package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Home;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HomeRepository extends JpaRepository<Home, Long> {
    Optional<Home> findByIdAndOwnerId(Long id, String ownerId);

    boolean existsByNameAndOwnerId(String name, String ownerId);

    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN FETCH h.owner o " +  // FETCH owner thật sự
            "JOIN h.members hm " +
            "WHERE hm.user.id = :userId " +
            "AND hm.deletedAt IS NULL " +
            "AND h.deletedAt IS NULL")
    Page<Home> findByUserIdWithOwner(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN FETCH h.owner " +  // Thêm FETCH cho owner
            "LEFT JOIN FETCH h.members m " +  // Thêm FETCH cho members
            "LEFT JOIN FETCH h.rooms " +  // Thêm FETCH cho rooms (nếu cần đếm)
            "WHERE (h.owner.id = :userId OR m.user.id = :userId) " +
            "AND (m IS NULL OR m.deletedAt IS NULL)")
    List<Home> findAllByUserId(@Param("userId") String userId);

    // Hoặc tạo method riêng để lấy homes của chủ nhà
    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN FETCH h.owner " +
            "LEFT JOIN FETCH h.members " +
            "LEFT JOIN FETCH h.rooms " +
            "WHERE h.owner.id = :userId")
    List<Home> findByOwnerIdWithDetails(@Param("userId") String userId);

    Page<Home> findAllByDeletedAtIsNull(Pageable pageable);

    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN FETCH h.members hm " +
            "LEFT JOIN FETCH hm.user " + // Fetch user để tránh N+1
            "LEFT JOIN FETCH h.owner " +
            "LEFT JOIN FETCH h.rooms " +
            "WHERE h.id = :homeId " +
            "AND (hm IS NULL OR hm.deletedAt IS NULL)")
    Optional<Home> findByIdWithMembersAndUsers(@Param("homeId") Long homeId);

    Page<Home> findAll(Specification<Home> spec, Pageable pageable);

    long countByOwnerIdAndDeletedAtIsNull(String ownerId);

    long countByCreatedAtAfter(LocalDateTime timestamp);

    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN FETCH h.members m " +     // FETCH ở đây OK vì không phân trang
            "LEFT JOIN FETCH h.rooms r " +      // FETCH ở đây OK
            "WHERE h.id = :homeId")
    Optional<Home> findByIdWithMembersAndRoomsFull(@Param("homeId") Long homeId);

    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN h.members m " +          // Không dùng FETCH
            "LEFT JOIN h.rooms r " +           // Không dùng FETCH
            "WHERE EXISTS (SELECT hm FROM HomeMember hm WHERE hm.home = h AND hm.user.id = :userId AND hm.status = 'ACTIVE') " +
            "AND h.deletedAt IS NULL")
    Page<Home> findByUserIdWithOwnerAndMembersAndRooms(
            @Param("userId") String userId,
            Pageable pageable
    );
    @Query("SELECT COUNT(hm) FROM HomeMember hm " +
            "WHERE hm.home.id = :homeId AND hm.status = 'ACTIVE'")
    int countMembersByHomeId(@Param("homeId") Long homeId);

    @Query("SELECT COUNT(r) FROM Room r " +
            "WHERE r.home.id = :homeId AND r.deletedAt IS NULL")
    int countRoomsByHomeId(@Param("homeId") Long homeId);

    @Query("SELECT h.id FROM Home h " +
            "JOIN h.members hm " +
            "WHERE hm.user.id = :userId " +
            "AND hm.status = 'ACTIVE' " +
            "AND h.deletedAt IS NULL")
    Page<Long> findHomeIdsByUserId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT DISTINCT h FROM Home h " +
            "LEFT JOIN FETCH h.members m " +
            "LEFT JOIN FETCH h.rooms r " +
            "WHERE h.id IN :homeIds")
    List<Home> findAllByIdWithMembersAndRooms(@Param("homeIds") List<Long> homeIds);
}