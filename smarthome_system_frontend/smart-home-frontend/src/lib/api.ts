import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// Kiểm tra xem có đang chạy trên thiết bị di động hay không
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

// Xác định base URL
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  
  // Nếu URL từ env đã được cấu hình đúng, sử dụng nó
  if (envURL && !envURL.includes('localhost')) {
    return envURL;
  }
  
  // Trên mobile, nếu không có cấu hình, sử dụng địa chỉ IP mặc định
  if (isMobile && envURL?.includes('localhost')) {
    // Thay localhost bằng địa chỉ IP của máy chủ phát triển
    return envURL.replace('localhost', '192.168.0.199');
  }
  
  return envURL || 'http://localhost:8080/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Tăng timeout cho mạng di động
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;