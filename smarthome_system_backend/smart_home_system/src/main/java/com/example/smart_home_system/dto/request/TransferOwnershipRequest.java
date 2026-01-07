package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransferOwnershipRequest {
    @NotBlank(message = "New owner ID is required")
    private String newOwnerId;
}
