// Định nghĩa cấu trúc phản hồi chuẩn từ Backend
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// Error Response
export interface ApiError {
  success: boolean;
  message: string;
  errorCode?: string;
  timestamp: string;
  details?: Record<string, any>;
  path?: string;
}

// Pagination Metadata
export interface PaginationMeta {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Paginated Response
export interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// API Configuration
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}