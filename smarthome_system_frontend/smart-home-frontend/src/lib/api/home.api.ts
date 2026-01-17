// lib/api/home.api.ts
import api from '../api';
import type {
  Home,
  HomeRequest,
  HomeResponse,
  HomeMember,
  HomeMemberResponse,
  AddMemberRequest,
  UpdateRoleRequest,
  ApiResponse,
} from '@/types/home';
import type { PageableResponse } from '@/types/pageable';

const BASE_URL = '/homes';

export const homeApi = {
  // ============================================
  // HOME MANAGEMENT
  // ============================================

   /**
   * Get all homes (Admin only)
   */
    getAllHomes: async (params?: {
      page?: number;
      size?: number;
      sortBy?: string;
      sortDirection?: 'ASC' | 'DESC';
    }) => {
      const { data } = await api.get<ApiResponse<PageableResponse<HomeResponse>>>(
        BASE_URL,  // GET /homes (không có path)
        { params }
      );
      return data;
    },

  /**
   * Get all homes where current user is a member
   */
  getMyHomes: async () => {
    const { data } = await api.get<ApiResponse<Home[]>>(`${BASE_URL}/my-homes`);
    return data;
  },

  /**
   * Get home by ID
   */
  getHomeById: async (homeId: number) => {
    const { data } = await api.get<ApiResponse<HomeResponse>>(`${BASE_URL}/${homeId}`);
    return data;
  },

  /**
   * Create a new home
   */
  createHome: async (request: HomeRequest) => {
    const { data } = await api.post<ApiResponse<HomeResponse>>(`${BASE_URL}`, request);
    return data;
  },

  /**
   * Update home information
   */
  updateHome: async (homeId: number, request: HomeRequest) => {
    const { data } = await api.put<ApiResponse<HomeResponse>>(
      `${BASE_URL}/${homeId}`,
      request
    );
    return data;
  },

  /**
   * Delete home (only owner)
   */
  deleteHome: async (homeId: number) => {
    const { data } = await api.delete<ApiResponse<void>>(`${BASE_URL}/${homeId}`);
    return data;
  },

  /**
   * Leave home (members only, not owner)
   */
  leaveHome: async (homeId: number) => {
    const { data } = await api.post<ApiResponse<void>>(`${BASE_URL}/${homeId}/leave`);
    return data;
  },

  /**
   * Transfer ownership to another member
   */
  transferOwnership: async (homeId: number, newOwnerId: string) => {
    const { data } = await api.post<ApiResponse<void>>(
      `${BASE_URL}/${homeId}/transfer-ownership`,
      null,
      { params: { newOwnerId } }
    );
    return data;
  },

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  /**
   * Get all members of a home
   */
  getHomeMembers: async (homeId: number) => {
    const { data } = await api.get<ApiResponse<HomeMemberResponse[]>>(
      `${BASE_URL}/${homeId}/members`
    );
    return data;
  },

  /**
   * Add a member to home
   */
  addMember: async (homeId: number, request: AddMemberRequest) => {
    const { data } = await api.post<ApiResponse<HomeMemberResponse>>(
      `${BASE_URL}/${homeId}/members`,
      request
    );
    return data;
  },

  /**
   * Remove a member from home
   */
  removeMember: async (homeId: number, userId: string) => {
    const { data } = await api.delete<ApiResponse<void>>(
      `${BASE_URL}/${homeId}/members/${userId}`
    );
    return data;
  },

  /**
   * Update member role
   */
  updateMemberRole: async (
    homeId: number,
    userId: string,
    request: UpdateRoleRequest
  ) => {
    const { data } = await api.put<ApiResponse<HomeMemberResponse>>(
      `${BASE_URL}/${homeId}/members/${userId}/role`,
      request
    );
    return data;
  },

  /**
   * Get specific member details
   */
  getMember: async (homeId: number, userId: string) => {
    const { data } = await api.get<ApiResponse<HomeMemberResponse>>(
      `${BASE_URL}/${homeId}/members/${userId}`
    );
    return data;
  },

  /**
   * Check if user is member of home
   */
  checkMember: async (homeId: number, userId: string) => {
    const { data } = await api.get<ApiResponse<boolean>>(
      `${BASE_URL}/${homeId}/members/check/${userId}`
    );
    return data;
  },
};