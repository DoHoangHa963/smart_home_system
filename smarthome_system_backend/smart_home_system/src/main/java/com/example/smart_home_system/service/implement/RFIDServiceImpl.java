package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.RFID.RFIDAccessLogRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDCardUpdateRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDLearnRequest;
import com.example.smart_home_system.dto.response.RFID.*;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.entity.RFIDAccessLog;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import com.example.smart_home_system.repository.RFIDAccessLogRepository;
import com.example.smart_home_system.service.MqttService;
import com.example.smart_home_system.service.RFIDService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link RFIDService} for RFID card management operations.
 * 
 * <p>This service now uses MQTT as primary communication method with
 * HTTP as fallback for ESP32 MCU Gateway communication.
 */
@Service("rfidService")
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RFIDServiceImpl implements RFIDService {

    private final MCUGatewayRepository mcuGatewayRepository;
    private final HomeRepository homeRepository;
    private final RFIDAccessLogRepository rfidAccessLogRepository;
    private final MqttService mqttService;
    private final com.example.smart_home_system.service.MqttResponseStore mqttResponseStore;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MQTT_REQUEST_TIMEOUT_SECONDS = 5;

    @Override
    public RFIDCardsListResponse getCardsList(Long homeId) {
        mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        try {
            String requestId = mqttResponseStore.generateRequestId();
            java.util.concurrent.CompletableFuture<String> future = mqttResponseStore.createRequest(requestId);
            mqttService.requestRFIDCards(homeId, requestId);

            String response = mqttResponseStore.getWithTimeout(
                    future, MQTT_REQUEST_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);

            JsonNode root = objectMapper.readTree(response);
            List<RFIDCardResponse> cards = new ArrayList<>();
            JsonNode cardsNode = root.get("cards");
            if (cardsNode != null && cardsNode.isArray()) {
                for (JsonNode cardNode : cardsNode) {
                    RFIDCardResponse card = RFIDCardResponse.builder()
                            .index(cardNode.get("index").asInt())
                            .uid(cardNode.get("uid").asText())
                            .name(cardNode.get("name").asText())
                            .enabled(cardNode.get("enabled").asBoolean())
                            .lastUsed(cardNode.has("lastUsed") ? cardNode.get("lastUsed").asLong() : null)
                            .build();
                    cards.add(card);
                }
            }

            return RFIDCardsListResponse.builder()
                    .cards(cards)
                    .count(root.has("count") ? root.get("count").asInt() : cards.size())
                    .maxCards(root.has("maxCards") ? root.get("maxCards").asInt() : 5)
                    .learningMode(root.has("learningMode") && root.get("learningMode").asBoolean())
                    .build();

        } catch (java.util.concurrent.TimeoutException e) {
            log.error("MQTT request timeout getting RFID cards for homeId={}", homeId);
            throw new AppException(ErrorCode.MCU_CONNECTION_FAILED);
        } catch (Exception e) {
            log.error("Error getting RFID cards for homeId={}: {}", homeId, e.getMessage());
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    @Override
    public RFIDLearnStatusResponse startLearning(Long homeId, RFIDLearnRequest request) {
        // Verify MCU exists
        mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        
        String cardName = (request != null && request.getName() != null) ? request.getName() : null;
        
        // Primary: Use MQTT (instant delivery, non-blocking)
        log.info("[MQTT] Starting RFID learning via MQTT for homeId={}, cardName={}", homeId, cardName);
        mqttService.startRFIDLearning(homeId, cardName);
        
        // Return immediate response - actual status will come via MQTT/SSE
        return RFIDLearnStatusResponse.builder()
                .learningMode(true)
                .complete(false)
                .success(false)
                .result("Chế độ học thẻ đã bắt đầu. Đặt thẻ lên đầu đọc...")
                .cardCount(null)
                .build();
    }

    @Override
    public RFIDLearnStatusResponse getLearningStatus(Long homeId) {
        mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        try {
            String requestId = mqttResponseStore.generateRequestId();
            java.util.concurrent.CompletableFuture<String> future = mqttResponseStore.createRequest(requestId);
            mqttService.requestRFIDLearnStatus(homeId, requestId);

            String response = mqttResponseStore.getWithTimeout(
                    future, MQTT_REQUEST_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);

            JsonNode root = objectMapper.readTree(response);
            return RFIDLearnStatusResponse.builder()
                    .learningMode(root.has("learningMode") && root.get("learningMode").asBoolean())
                    .complete(root.has("complete") && root.get("complete").asBoolean())
                    .success(root.has("success") && root.get("success").asBoolean())
                    .result(root.has("result") ? root.get("result").asText() : null)
                    .cardCount(root.has("cardCount") ? root.get("cardCount").asInt() : null)
                    .build();

        } catch (java.util.concurrent.TimeoutException e) {
            log.error("MQTT request timeout getting RFID learn status for homeId={}", homeId);
            throw new AppException(ErrorCode.MCU_CONNECTION_FAILED);
        } catch (Exception e) {
            log.error("Error getting RFID learning status for homeId={}: {}", homeId, e.getMessage());
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    @Override
    public void deleteCard(Long homeId, int index) {
        // Verify MCU exists
        mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        
        // Use MQTT to delete card (instant delivery, non-blocking)
        log.info("[MQTT] Deleting RFID card via MQTT for homeId={}, index={}", homeId, index);
        mqttService.deleteRFIDCard(homeId, index);
        
        log.info("RFID card delete command sent successfully for index {}", index);
    }

    @Override
    public void updateCard(Long homeId, RFIDCardUpdateRequest request) {
        // Verify MCU exists
        mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        
        // Use MQTT to update card (instant delivery, non-blocking)
        log.info("[MQTT] Updating RFID card via MQTT for homeId={}, index={}", homeId, request.getIndex());
        mqttService.updateRFIDCard(homeId, request.getIndex(), request.getName(), request.getEnabled());
        
        log.info("RFID card update command sent successfully for index {}", request.getIndex());
    }

    @Override
    public void clearAllCards(Long homeId) {
        // Verify MCU exists
        mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        
        // Use MQTT to clear all cards (instant delivery, non-blocking)
        log.info("[MQTT] Clearing all RFID cards via MQTT for homeId={}", homeId);
        mqttService.clearRFIDCards(homeId);
        
        log.info("RFID clear all cards command sent successfully for homeId={}", homeId);
    }

    @Override
    public void recordAccessLog(String apiKey, RFIDAccessLogRequest request) {
        // Tìm MCU Gateway bằng API Key
        MCUGateway mcuGateway = mcuGatewayRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_API_KEY));
        
        Home home = mcuGateway.getHome();
        if (home == null) {
            log.warn("MCU Gateway {} has no associated home", mcuGateway.getSerialNumber());
            return;
        }
        
        // Tạo access log record
        RFIDAccessLog accessLog = RFIDAccessLog.builder()
                .mcuGateway(mcuGateway)
                .home(home)
                .cardUid(request.getCardUid())
                .cardName(request.getCardName())
                .authorized(request.getAuthorized())
                .status(request.getStatus())
                .mcuSerialNumber(request.getSerialNumber())
                .deviceTimestamp(request.getTimestamp())
                .build();
        
        rfidAccessLogRepository.save(accessLog);
        log.info("RFID access log recorded: cardUid={}, authorized={}, status={}", 
                request.getCardUid(), request.getAuthorized(), request.getStatus());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RFIDAccessLogResponse> getAccessLogs(Long homeId, Pageable pageable) {
        // Verify home exists
        homeRepository.findById(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));
        
        return rfidAccessLogRepository.findByHomeIdOrderByCreatedAtDesc(homeId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RFIDAccessLogResponse> getRecentAccessLogs(Long homeId) {
        // Verify home exists
        homeRepository.findById(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));
        
        return rfidAccessLogRepository.findTop10ByHomeIdOrderByCreatedAtDesc(homeId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RFIDAccessStatsResponse getAccessStats(Long homeId) {
        // Verify home exists
        homeRepository.findById(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));
        
        Long authorizedCount = rfidAccessLogRepository.countAuthorizedByHomeId(homeId);
        Long unauthorizedCount = rfidAccessLogRepository.countUnauthorizedByHomeId(homeId);
        
        return RFIDAccessStatsResponse.builder()
                .totalAccess(authorizedCount + unauthorizedCount)
                .authorizedCount(authorizedCount)
                .unauthorizedCount(unauthorizedCount)
                .build();
    }

    /**
     * Map RFIDAccessLog entity to response DTO
     */
    private RFIDAccessLogResponse mapToResponse(RFIDAccessLog log) {
        return RFIDAccessLogResponse.builder()
                .id(log.getId())
                .cardUid(log.getCardUid())
                .cardName(log.getCardName())
                .authorized(log.getAuthorized())
                .status(log.getStatus())
                .mcuSerialNumber(log.getMcuSerialNumber())
                .homeId(log.getHome() != null ? log.getHome().getId() : null)
                .homeName(log.getHome() != null ? log.getHome().getName() : null)
                .deviceTimestamp(log.getDeviceTimestamp())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
