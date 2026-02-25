import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

// Tránh log/toast lỗi mạng trùng lặp (nhiều request fail cùng lúc / Strict Mode chạy effect 2 lần)
const NETWORK_LOG_DEBOUNCE_MS = 3000;
const NETWORK_TOAST_DEBOUNCE_MS = 5000;
let lastNetworkErrorLogTime = 0;
let lastNetworkErrorToastTime = 0;

function logNetworkErrorOnce(error: any) {
  const now = Date.now();
  if (now - lastNetworkErrorLogTime >= NETWORK_LOG_DEBOUNCE_MS) {
    lastNetworkErrorLogTime = now;
    console.warn('⚠️ Lỗi kết nối (network error). Request:', error.config?.method?.toUpperCase(), error.config?.url);
  }
}

/** Gọi từ interceptor: chỉ hiển thị 1 toast lỗi mạng trong mỗi khoảng NETWORK_TOAST_DEBOUNCE_MS */
function showNetworkErrorToastOnce() {
  const now = Date.now();
  if (now - lastNetworkErrorToastTime >= NETWORK_TOAST_DEBOUNCE_MS) {
    lastNetworkErrorToastTime = now;
    toast.error('Lỗi kết nối. Kiểm tra mạng hoặc server.');
  }
}

/** Dùng trong store/component: nếu là lỗi mạng thì không cần toast (interceptor đã xử lý), return true */
export function isNetworkError(error: any): boolean {
  return error?.code === 'ERR_NETWORK' || (error?.request && !error?.response);
}

// Kiểm tra xem có đang chạy trên thiết bị di động thật hay không (loại trừ DevTools)
const isRealMobile = () => {
  const ua = navigator.userAgent;
  // Chỉ detect mobile thật, không phải DevTools mobile mode
  const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const hasMobileInUA = mobilePattern.test(ua);
  // Kiểm tra độ rộng màn hình thực tế để phân biệt mobile thật với DevTools emulation
  const isSmallScreen = window.innerWidth < 768;
  
  return hasMobileInUA && isSmallScreen;
};

// Xác định base URL
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  
  // Kiểm tra có phải mobile device thật không
  const isMobile = isRealMobile();
  
  if (isMobile) {
    // TRÊN MOBILE: Dùng IP từ env hoặc IP mặc định
    if (envURL && !envURL.includes('localhost') && !envURL.includes('127.0.0.1')) {
      console.log('📱 Using env URL (mobile):', envURL);
      return envURL;
    }
    // Nếu env có localhost thì thay bằng IP
    if (envURL?.includes('localhost')) {
      const mobileURL = envURL.replace('localhost', '192.168.0.199');
      console.log('📱 Replaced localhost with IP (mobile):', mobileURL);
      return mobileURL;
    }
    // Default cho mobile
    const mobileURL = 'http://192.168.0.199:8080/api/v1';
    console.log('📱 Using default mobile URL:', mobileURL);
    return mobileURL;
  }
  
  // TRÊN DESKTOP: Luôn ưu tiên localhost, bỏ qua env nếu là IP
  if (envURL && (envURL.includes('localhost') || envURL.includes('127.0.0.1'))) {
    console.log('💻 Using localhost from env:', envURL);
    return envURL;
  }
  
  // Nếu env có IP nhưng đang ở desktop, bỏ qua và dùng localhost
  if (envURL && !envURL.includes('localhost') && !envURL.includes('127.0.0.1')) {
    console.warn('⚠️ Env has IP address but running on desktop, using localhost instead');
    console.warn('   Env URL:', envURL);
  }
  
  // Desktop default: LUÔN dùng localhost
  const defaultURL = 'http://localhost:8080/api/v1';
  console.log('💻 Using default localhost URL:', defaultURL);
  return defaultURL;
};

const baseURL = getBaseURL();
console.log('✅ API Base URL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
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
  console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
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
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response) {
      console.log(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`, error.response.data);
    } else if (error.request) {
      logNetworkErrorOnce(error);
      showNetworkErrorToastOnce();
    }

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
        // Gọi API Refresh Token - sử dụng cùng instance api để đảm bảo baseURL đúng
        const response = await api.post('/auth/refresh-token', {
          refreshToken: refreshToken
        });

        // Backend trả về ApiResponse<AuthResponse>, cần lấy data.data
        const authData = response.data?.data || response.data;
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = authData;

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