// Định nghĩa cấu trúc phản hồi chuẩn từ Backend
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}