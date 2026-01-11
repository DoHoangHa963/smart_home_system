package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.EventLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventLogRepository extends JpaRepository<EventLog, Long> {
    @Query("SELECT e FROM EventLog e LEFT JOIN FETCH e.user ORDER BY e.createdAt DESC")
    List<EventLog> findTop10RecentLogs(Pageable pageable);
}