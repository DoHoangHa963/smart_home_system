-- Allow device type 'OTHER' and any future enum values.
-- If column is ENUM, MySQL truncates values not in the list; VARCHAR(255) avoids that.

ALTER TABLE devices
MODIFY COLUMN type VARCHAR(255) DEFAULT NULL;
