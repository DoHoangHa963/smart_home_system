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

let isRefreshing = false;
// Hàng đợi các request bị lỗi để chạy lại sau khi có token mới
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa từng thử retry (biến _retry chưa set)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Kiểm tra xem có refresh token không
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Nếu đang có 1 thằng khác đang refresh, các request đến sau sẽ vào hàng đợi
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi API Refresh Token (Đường dẫn này tùy thuộc vào Backend của bạn)
        // Dựa vào file list backend của bạn, có thể là /auth/refresh-token
        const response = await axios.post(`${getBaseURL()}/auth/refresh-token`, {
          refreshToken: refreshToken
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Lưu token mới vào store
        setTokens(newAccessToken, newRefreshToken);

        // Update token cho request đang bị lỗi hiện tại
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`; // axios.headers thường tự xử lý
        
        // Xử lý hàng đợi các request bị treo
        processQueue(null, newAccessToken);
        
        return api(originalRequest);
      } catch (refreshError) {
        // Nếu refresh cũng lỗi (token hết hạn hẳn) -> Logout
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Nếu lỗi khác 401 hoặc đã retry rồi mà vẫn lỗi
    if (error.response?.status === 401) {
        useAuthStore.getState().logout();
    }
    
    return Promise.reject(error);
  }
);

export default api;