package com.example.smart_home_system.dto.response.MCU;

import com.example.smart_home_system.dto.response.HomeResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object for MCU Gateway pairing initialization response.
 * 
 * <p>This DTO is returned when initializing the pairing process. It contains
 * the created MCU Gateway ID and a list of available homes that the user
 * can select to pair with.
 * 
 * <p><b>Usage Flow:</b>
 * <ol>
 *   <li>Frontend calls init-pairing endpoint</li>
 *   <li>Backend returns this response with available homes</li>
 *   <li>Frontend displays home selection UI to user</li>
 *   <li>User selects a home</li>
 *   <li>Frontend calls confirm-pairing with mcuGatewayId and selected homeId</li>
 * </ol>
 * 
 * <p><b>Available Homes Criteria:</b>
 * <ul>
 *   <li>User must be the OWNER of the home</li>
 *   <li>Home must not already have an MCU Gateway</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUPairingResponse
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUPairingInitResponse {
    
    /**
     * MCU Gateway ID (đang ở trạng thái PAIRING)
     */
    private Long mcuGatewayId;
    
    /**
     * Serial number của MCU
     */
    private String serialNumber;
    
    /**
     * Tên MCU
     */
    private String name;
    
    /**
     * Home ID đã được chọn để pair
     */
    private Long homeId;
    
    /**
     * Tên Home đã được chọn
     */
    private String homeName;
    
    /**
     * Danh sách homes mà user có thể chọn để pair (deprecated - dùng homeId)
     * (Homes mà user là OWNER và chưa có MCU)
     */
    @Deprecated
    private List<HomeResponse> availableHomes;
    
    /**
     * Thông báo
     */
    private String message;
}
