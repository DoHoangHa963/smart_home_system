package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.enums.HomeMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HomeMemberRepository extends JpaRepository<HomeMember, Long> {

    // Method cơ bản - KHÔNG fetch user
    Optional<HomeMember> findByHomeIdAndUserId(Long homeId, String userId);

    // Method cơ bản - KHÔNG fetch user
    Optional<HomeMember> findByHomeIdAndUser_Username(Long homeId, String username);

    // Method với JOIN FETCH để lấy thông tin user
    @Query("SELECT hm FROM HomeMember hm " +
            "JOIN FETCH hm.user " +  // FETCH user để tránh lazy loading
            "WHERE hm.home.id = :homeId AND hm.user.id = :userId")
    Optional<HomeMember> findByHomeIdAndUserIdWithUser(@Param("homeId") Long homeId, @Param("userId") String userId);

    @Query("SELECT hm FROM HomeMember hm " +
            "JOIN FETCH hm.user " +  // FETCH user
            "WHERE hm.home.id = :homeId AND hm.user.username = :username")
    Optional<HomeMember> findByHomeIdAndUsernameWithUser(@Param("homeId") Long homeId, @Param("username") String username);

    // Sửa lỗi: Optional<Object> → Optional<HomeMember>
    @Query("SELECT hm FROM HomeMember hm " +
            "JOIN FETCH hm.user " +
            "WHERE hm.home.id = :homeId " +
            "AND hm.user.id = :userId " +
            "AND hm.role = :role")
    Optional<HomeMember> findByHomeIdAndUserIdAndRole(
            @Param("homeId") Long homeId,
            @Param("userId") String userId,
            @Param("role") HomeMemberRole role
    );

    // Lấy danh sách thành viên VỚI FETCH user
    @Query("SELECT DISTINCT hm FROM HomeMember hm " +
            "JOIN FETCH hm.user u " +  // FETCH user
            "WHERE hm.home.id = :homeId " +
            "AND hm.deletedAt IS NULL " +
            "ORDER BY " +
            "CASE hm.role " +
            "  WHEN 'OWNER' THEN 1 " +
            "  WHEN 'ADMIN' THEN 2 " +
            "  WHEN 'MEMBER' THEN 3 " +
            "  WHEN 'GUEST' THEN 4 " +
            "  ELSE 5 END, " +
            "u.username ASC")
    List<HomeMember> findAllByHomeIdWithUser(@Param("homeId") Long homeId);

    // Kiểm tra user đã có trong nhà chưa
    boolean existsByHomeIdAndUserId(Long homeId, String userId);

    // Method cũ - giữ lại cho tương thích
    @Query("SELECT hm FROM HomeMember hm WHERE hm.home.id = :homeId AND hm.deletedAt IS NULL")
    List<HomeMember> findAllByHomeId(@Param("homeId") Long homeId);
}