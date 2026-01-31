-- Update devices table status enum to include ON, OFF, ACTIVE, INACTIVE
-- Previous enum: ('ERROR','OFFLINE','ONLINE','UNKNOWN')
-- New enum: ('ERROR','OFFLINE','ONLINE','UNKNOWN','ON','OFF','ACTIVE','INACTIVE')

ALTER TABLE devices 
MODIFY COLUMN status ENUM('ERROR','OFFLINE','ONLINE','UNKNOWN','ON','OFF','ACTIVE','INACTIVE') DEFAULT NULL;
