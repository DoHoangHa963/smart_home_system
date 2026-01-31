import { RoomRequest, ROOM_VALIDATION, ValidationResult } from '@/types/room';

export const validateRoomRequest = (data: RoomRequest): ValidationResult => {
  const errors: Record<string, string> = {};

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Tên phòng không được để trống';
  } else if (data.name.trim().length < ROOM_VALIDATION.name.minLength) {
    errors.name = `Tên phòng phải có ít nhất ${ROOM_VALIDATION.name.minLength} ký tự`;
  } else if (data.name.trim().length > ROOM_VALIDATION.name.maxLength) {
    errors.name = `Tên phòng không được vượt quá ${ROOM_VALIDATION.name.maxLength} ký tự`;
  } else if (!ROOM_VALIDATION.name.pattern.test(data.name)) {
    errors.name = ROOM_VALIDATION.name.patternMessage;
  }

  // Validate homeId
  if (!data.homeId || data.homeId <= 0) {
    errors.homeId = 'ID nhà không hợp lệ';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateRoomName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Tên phòng không được để trống';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < ROOM_VALIDATION.name.minLength) {
    return `Tên phòng phải có ít nhất ${ROOM_VALIDATION.name.minLength} ký tự`;
  }
  
  if (trimmedName.length > ROOM_VALIDATION.name.maxLength) {
    return `Tên phòng không được vượt quá ${ROOM_VALIDATION.name.maxLength} ký tự`;
  }
  
  if (!ROOM_VALIDATION.name.pattern.test(trimmedName)) {
    return ROOM_VALIDATION.name.patternMessage;
  }
  
  return null;
};