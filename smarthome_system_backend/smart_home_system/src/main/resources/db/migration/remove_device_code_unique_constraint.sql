-- Migration: Remove unique constraint on device_code to support soft delete
-- This allows reusing device codes after soft deletion

-- Drop the existing unique constraint
ALTER TABLE `devices` DROP INDEX `UKdelxn6d6q662wndbm0ecublmg`;

-- Note: Application-level uniqueness is enforced via DeviceRepository.existsByDeviceCode()
-- which only checks devices where deletedAt IS NULL
