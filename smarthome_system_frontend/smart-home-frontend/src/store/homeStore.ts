import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Home, HomeMember } from '@/types/home';
import { homeApi } from '@/lib/api/home.api';
import { toast } from 'sonner';

const extractData = (data: any) => {
  if (data?.content && Array.isArray(data.content)) {
    return data.content;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

interface HomeState {
  homes: Home[];
  currentHome: Home | null;
  currentMember: HomeMember | null;
  members: HomeMember[];
  isLoading: boolean;
  error: string | null;

  fetchMyHomes: () => Promise<void>;
  setCurrentHome: (home: Home | null) => Promise<void>;
  createHome: (name: string, address?: string, timeZone?: string) => Promise<Home>;
  updateHome: (homeId: number, name: string, address?: string, timeZone?: string) => Promise<void>;
  deleteHome: (homeId: number) => Promise<void>;
  leaveHome: (homeId: number) => Promise<void>;
  transferOwnership: (homeId: number, newOwnerId: string) => Promise<void>;

  fetchHomeMembers: (homeId: number) => Promise<void>;
  addMember: (homeId: number, identifier: string, role?: string) => Promise<void>;
  removeMember: (homeId: number, userId: string) => Promise<void>;
  updateMemberRole: (homeId: number, userId: string, newRole: string) => Promise<void>;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  homes: [],
  currentHome: null,
  currentMember: null,
  members: [],
  isLoading: false,
  error: null,
};

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchMyHomes: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await homeApi.getMyHomes();
          const homesArray = extractData(response.data);
          set({ homes: homesArray, isLoading: false });
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to fetch homes';
          set({ error: errorMsg, isLoading: false });
        }
      },

      setCurrentHome: async (home: Home | null) => {
        set({ isLoading: true, error: null });

        if (!home) {
          set({ currentHome: null, currentMember: null, isLoading: false });
          return;
        }

        try {
          const membersResponse = await homeApi.getHomeMembers(home.id);
          const members = membersResponse.data;

          const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          const userId = authState.state?.user?.id || authState.state?.user?.userId;
          
          const currentMember = members.find(m => m.userId === userId) || null;

          set({
            currentHome: home,
            currentMember: currentMember,
            members: members,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to set current home';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      createHome: async (name: string, address?: string, timeZone?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await homeApi.createHome({ name, address, timeZone });
          const newHome = response.data;

          set((state) => ({
            homes: [...state.homes, newHome],
            isLoading: false,
          }));

          toast.success('Tạo nhà thành công!');
          return newHome;
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to create home';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      updateHome: async (homeId: number, name: string, address?: string, timeZone?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await homeApi.updateHome(homeId, { name, address, timeZone });
          const updatedHome = response.data;

          set((state) => ({
            homes: state.homes.map((h) => (h.id === homeId ? updatedHome : h)),
            currentHome:
              state.currentHome?.id === homeId ? updatedHome : state.currentHome,
            isLoading: false,
          }));

          toast.success('Cập nhật nhà thành công!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to update home';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      deleteHome: async (homeId: number) => {
        set({ isLoading: true, error: null });
        try {
          await homeApi.deleteHome(homeId);

          set((state) => ({
            homes: state.homes.filter((h) => h.id !== homeId),
            currentHome: state.currentHome?.id === homeId ? null : state.currentHome,
            currentMember: state.currentHome?.id === homeId ? null : state.currentMember,
            isLoading: false,
          }));

          toast.success('Xóa nhà thành công!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to delete home';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      leaveHome: async (homeId: number) => {
        set({ isLoading: true, error: null });
        try {
          await homeApi.leaveHome(homeId);

          set((state) => ({
            homes: state.homes.filter((h) => h.id !== homeId),
            currentHome: state.currentHome?.id === homeId ? null : state.currentHome,
            currentMember: state.currentHome?.id === homeId ? null : state.currentMember,
            isLoading: false,
          }));

          toast.success('Đã rời khỏi nhà!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to leave home';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      transferOwnership: async (homeId: number, newOwnerId: string) => {
        set({ isLoading: true, error: null });
        try {
          await homeApi.transferOwnership(homeId, newOwnerId);

          await get().fetchMyHomes();
          if (get().currentHome?.id === homeId) {
            const updatedHome = get().homes.find(h => h.id === homeId);
            if (updatedHome) {
              await get().setCurrentHome(updatedHome);
            }
          }

          toast.success('Chuyển quyền sở hữu thành công!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to transfer ownership';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      fetchHomeMembers: async (homeId: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await homeApi.getHomeMembers(homeId);
          const membersArray = extractData(response.data);
          set({ members: membersArray, isLoading: false });
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to fetch members';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      addMember: async (homeId: number, identifier: string, role?: string) => {
        set({ isLoading: true, error: null });
        try {
          await homeApi.addMember(homeId, {
            identifier,
            role: role as any,
          });

          await get().fetchHomeMembers(homeId);

          toast.success('Thêm thành viên thành công!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to add member';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      removeMember: async (homeId: number, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await homeApi.removeMember(homeId, userId);

          set((state) => ({
            members: state.members.filter((m) => m.userId !== userId),
            isLoading: false,
          }));

          toast.success('Xóa thành viên thành công!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to remove member';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      updateMemberRole: async (homeId: number, userId: string, newRole: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await homeApi.updateMemberRole(homeId, userId, {
            newRole: newRole as any,
          });

          set((state) => ({
            members: state.members.map((m) =>
              m.userId === userId ? response.data : m
            ),
            isLoading: false,
          }));

          toast.success('Cập nhật vai trò thành công!');
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to update role';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'home-storage',
      partialize: (state) => ({
        currentHome: state.currentHome,
        currentMember: state.currentMember,
        homes: state.homes,
      }),
    }
  )
);
