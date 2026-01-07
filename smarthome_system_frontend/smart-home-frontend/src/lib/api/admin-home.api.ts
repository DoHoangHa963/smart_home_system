import api from '../api';
import type { ApiResponse, HomeResponse } from '@/types/home';
import type { PageableResponse } from '@/types/pageable';

export const adminHomeApi = {
  getAllHomes: async () => {
    return api.get<ApiResponse<PageableResponse<HomeResponse[]>>>('/homes');
  },

  deleteHome: async (homeId: number) => {
    return api.delete<ApiResponse<void>>(`/homes/${homeId}`);
  }
};