-- Fix MCU Gateway home_id to be nullable for PAIRING state
-- During init-pairing, MCU Gateway is created without home association
-- Home is assigned later during confirm-pairing

ALTER TABLE mcu_gateways MODIFY COLUMN home_id BIGINT NULL;
