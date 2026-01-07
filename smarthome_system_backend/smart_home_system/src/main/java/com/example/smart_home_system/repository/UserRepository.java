package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByPhone(String phone);

    List<User> findByStatus(UserStatus status);

    // Tìm user chưa bị xóa
    Optional<User> findByIdAndDeletedAtIsNull(String id);
    Page<User> findByDeletedAtIsNull(Pageable pageable);

    // Tìm user theo home (owner)
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND u.id IN (SELECT h.owner.id FROM Home h WHERE h.id = :homeId)")
    Optional<User> findOwnerByHomeId(@Param("homeId") Long homeId);

    // Tìm user theo home (member)
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND u.id IN (SELECT hm.user.id FROM HomeMember hm WHERE hm.home.id = :homeId)")
    List<User> findMembersByHomeId(@Param("homeId") Long homeId);

    // Search users
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND " +
            "(LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.phone) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<User> searchUsers(@Param("keyword") String keyword, Pageable pageable);

    // Count active users
    @Query("SELECT COUNT(u) FROM User u WHERE u.deletedAt IS NULL")
    long countActiveUsers();

    // Check duplicate name for owner
    @Query("SELECT COUNT(h) > 0 FROM Home h WHERE h.name = :name AND h.owner.id = :ownerId AND h.deletedAt IS NULL")
    boolean existsByNameAndOwnerId(@Param("name") String name, @Param("ownerId") String ownerId);

    boolean existsByRoles_Id(Long id);

    List<User> findByHomeMemberships_Home_Id(Long homeId);
}