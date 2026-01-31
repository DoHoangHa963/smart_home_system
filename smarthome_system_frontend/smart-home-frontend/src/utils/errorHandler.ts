/**
 * Centralized error handler for user-friendly error messages
 * Maps backend error codes/messages to user-friendly Vietnamese messages
 */

interface ErrorResponse {
  response?: {
    status?: number;
    data?: {
      code?: number;
      message?: string;
      detail?: string;
      errors?: any;
    };
  };
  message?: string;
}

/**
 * Maps error codes to user-friendly messages
 */
const ERROR_MESSAGE_MAP: Record<number, string> = {
  // 1xxx - Validation Errors
  1000: 'Yêu cầu không hợp lệ',
  1001: 'Thông tin nhập vào không hợp lệ',
  1002: 'Thông tin nhập vào không đúng định dạng',
  1003: 'Vui lòng điền đầy đủ thông tin bắt buộc',
  1004: 'Định dạng email không hợp lệ',
  1005: 'Mật khẩu không đúng định dạng',
  1006: 'Số điện thoại không hợp lệ',
  1009: 'Giá trị vượt quá giới hạn cho phép',
  1010: 'Bạn đã đạt giới hạn số lượng nhà (Tối đa 3 nhà)',

  // 2xxx - Authentication Errors
  2000: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn',
  2001: 'Phiên đăng nhập không hợp lệ',
  2002: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  2004: 'Tên đăng nhập hoặc mật khẩu không đúng',
  2005: 'Tài khoản đã bị khóa',
  2006: 'Tài khoản đã bị vô hiệu hóa',
  2008: 'Mã xác thực không đúng',
  2009: 'Mã xác thực đã hết hạn',
  2010: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau',

  // 3xxx - Authorization Errors
  3000: 'Bạn không có quyền thực hiện thao tác này',
  3001: 'Bạn không có đủ quyền để thực hiện hành động này',
  3002: 'Vai trò của bạn không được phép thực hiện thao tác này',
  3003: 'Bạn không có quyền truy cập tài nguyên này',
  3004: 'Bạn không có quyền truy cập thiết bị này',
  3005: 'Bạn không có quyền truy cập nhà này',
  3006: 'Chỉ quản trị viên mới có thể thực hiện thao tác này',

  // 4xxx - Not Found Errors
  4000: 'Không tìm thấy tài nguyên',
  4001: 'Không tìm thấy người dùng',
  4002: 'Không tìm thấy thông tin người dùng',
  4010: 'Không tìm thấy thiết bị',
  4011: 'Không tìm thấy loại thiết bị',
  4020: 'Không tìm thấy nhà',
  4021: 'Không tìm thấy phòng',
  4022: 'Không tìm thấy thành viên',
  4030: 'Không tìm thấy kịch bản',
  4040: 'Không tìm thấy quy tắc tự động hóa',

  // 5xxx - Conflict Errors
  5000: 'Dữ liệu đã tồn tại',
  5001: 'Email đã được sử dụng',
  5002: 'Tên đăng nhập đã được sử dụng',
  5003: 'Số điện thoại đã được sử dụng',
  5010: 'Mã thiết bị đã được sử dụng. Vui lòng chọn mã khác.',
  5011: 'Tên thiết bị đã tồn tại trong nhà này',
  5091: 'Vai trò đã tồn tại',
  5092: 'Quyền đã tồn tại',

  // 8xxx - Rate Limiting & Quota
  8000: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',
  8001: 'Quá nhiều yêu cầu, vui lòng đợi một chút rồi thử lại',
  8002: 'Đã đạt số lượng thiết bị tối đa',
  8003: 'Đã đạt số lượng kịch bản tối đa',
  8004: 'Đã đạt số lượng quy tắc tự động hóa tối đa',
};

/**
 * Maps HTTP status codes to user-friendly messages
 */
const HTTP_STATUS_MAP: Record<number, string> = {
  400: 'Thông tin không hợp lệ',
  401: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy thông tin',
  409: 'Thông tin đã tồn tại trong hệ thống',
  422: 'Dữ liệu không hợp lệ',
  429: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  500: 'Hệ thống đang gặp sự cố, vui lòng thử lại sau',
  502: 'Hệ thống đang bận, vui lòng thử lại sau',
  503: 'Dịch vụ tạm thời không khả dụng',
  504: 'Yêu cầu quá thời gian, vui lòng thử lại',
};

/**
 * Maps common error message patterns to user-friendly messages
 */
const MESSAGE_PATTERN_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /already exists|đã tồn tại|already registered/i, message: 'Thông tin này đã tồn tại trong hệ thống' },
  { pattern: /not found|không tìm thấy/i, message: 'Không tìm thấy thông tin' },
  { pattern: /duplicate|trùng lặp/i, message: 'Thông tin bị trùng lặp' },
  { pattern: /invalid|không hợp lệ/i, message: 'Thông tin không hợp lệ' },
  { pattern: /required|bắt buộc|thiếu/i, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' },
  { pattern: /unauthorized|chưa đăng nhập/i, message: 'Bạn cần đăng nhập để tiếp tục' },
  { pattern: /forbidden|không có quyền/i, message: 'Bạn không có quyền thực hiện thao tác này' },
  { pattern: /device code already exists/i, message: 'Mã thiết bị này đã được sử dụng' },
  { pattern: /device_code_pattern/i, message: 'Mã thiết bị chứa ký tự không hợp lệ' },
];

/**
 * Extracts user-friendly error message from error response
 */
export function getUserFriendlyError(error: ErrorResponse | unknown): string {
  if (!error) {
    return 'Hệ thống gặp sự cố, vui lòng thử lại sau!';
  }

  const err = error as ErrorResponse;

  // Check for error code in response data
  if (err.response?.data?.code) {
    const code = err.response.data.code;
    if (ERROR_MESSAGE_MAP[code]) {
      return ERROR_MESSAGE_MAP[code];
    }
  }

  // Check for detail message (most specific)
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail.toLowerCase();
    for (const { pattern, message } of MESSAGE_PATTERN_MAP) {
      if (pattern.test(detail)) {
        return message;
      }
    }
    // If detail exists but no pattern matches, return detail if it's user-friendly
    if (err.response.data.detail.length < 100) {
      return err.response.data.detail;
    }
  }

  // Check for message in response data
  if (err.response?.data?.message) {
    const message = err.response.data.message.toLowerCase();
    for (const { pattern, userMessage } of MESSAGE_PATTERN_MAP) {
      if (pattern.test(message)) {
        return userMessage;
      }
    }
    // Return message if it's short and looks user-friendly
    if (err.response.data.message.length < 100) {
      return err.response.data.message;
    }
  }

  // Check HTTP status code
  if (err.response?.status) {
    const status = err.response.status;
    if (HTTP_STATUS_MAP[status]) {
      return HTTP_STATUS_MAP[status];
    }
  }

  // Check error.message (client-side errors)
  if (err.message) {
    const msg = err.message.toLowerCase();
    for (const { pattern, userMessage } of MESSAGE_PATTERN_MAP) {
      if (pattern.test(msg)) {
        return userMessage;
      }
    }
  }

  // Default fallback
  return 'Hệ thống gặp sự cố, vui lòng thử lại sau!';
}
