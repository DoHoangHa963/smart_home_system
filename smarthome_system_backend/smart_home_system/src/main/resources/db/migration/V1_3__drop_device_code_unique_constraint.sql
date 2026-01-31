-- Drop the unique constraint on device_code to allow soft-deleted devices to reuse codes
-- The uniqueness will be enforced at application level via existsByDeviceCode() query

ALTER TABLE devices DROP INDEX UK_delxn6d6q662wndbm0ecublmg;

-- Optional: Create a regular index for performance (not unique)
-- This is already created via @Index annotation in Device.java, so we skip it
-- CREATE INDEX idx_device_code ON devices(device_code);
