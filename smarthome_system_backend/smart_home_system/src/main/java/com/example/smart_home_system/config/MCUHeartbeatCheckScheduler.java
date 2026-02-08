package com.example.smart_home_system.config;

import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.enums.MCUStatus;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Đánh dấu MCU offline khi không nhận heartbeat/LWT trong 5 phút (rút nguồn, mất mạng).
 * Broadcast "offline" qua WebSocket để frontend cập nhật ngay.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MCUHeartbeatCheckScheduler {

    private static final int HEARTBEAT_TIMEOUT_MINUTES = 5;

    private final MCUGatewayRepository mcuGatewayRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedDelayString = "${app.mcu.heartbeat-check-interval-ms:120000}")
    @Transactional
    public void markStaleMCUsAsOffline() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(HEARTBEAT_TIMEOUT_MINUTES);
        List<MCUGateway> stale = mcuGatewayRepository.findByStatusAndLastHeartbeatBefore(MCUStatus.ONLINE, threshold);

        for (MCUGateway mcu : stale) {
            Long homeId = mcu.getHome() != null ? mcu.getHome().getId() : null;
            mcu.setStatus(MCUStatus.OFFLINE);
            mcuGatewayRepository.save(mcu);

            if (homeId != null) {
                messagingTemplate.convertAndSend("/topic/home/" + homeId + "/status", "offline");
                log.info("[HeartbeatCheck] MCU marked OFFLINE (no heartbeat > {} min): homeId={}, serial={}",
                        HEARTBEAT_TIMEOUT_MINUTES, homeId, mcu.getSerialNumber());
            }
        }
    }
}
