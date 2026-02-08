import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { transformMemberResponse, type Home, type HomeMember, type HomeMemberResponse } from '@/types/home';
import { homeApi } from '@/lib/api/home.api';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/utils/errorHandler';

const extractData = (data: any) => {
  if (data?.content && Array.isArray(data.content)) {
    return data.content;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

const transformMembersData = (data: HomeMemberResponse[]): HomeMember[] => {
  return data.map(transformMemberResponse);
};

const getErrorMessage = (error: any, defaultMsg: string) => {
  // Sử dụng getUserFriendlyError để đảm bảo tất cả message đều là tiếng Việt
  return getUserFriendlyError(error) || defaultMsg;
};

const createMockMemberFromUser = (user: any, homeId: number): HomeMember => {
  return {
    id: 0,
    userId: user?.id || user?.userId,
    username: user?.username || 'User',
    email: user?.email || '',
    role: 'MEMBER',
    status: 'ACTIVE',
    permissions: '[]', // JSON string
    joinedAt: new Date().toISOString()
  };
};

interface HomeState {
  homes: Home[];
  currentHome: Home | null;
  currentMember: HomeMember | null;
  members: HomeMember[];
  isLoading: boolean;
  error: string | null;

  fetchMyHomes: () => Promise<void>;
  setCurrentHome: (home: Home | null, bypassPermission?: boolean) => Promise<void>;
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
          const errorMsg = getErrorMessage(error, 'Không thể tải danh sách nhà');
          set({ error: errorMsg, isLoading: false });
        }
      },

      // Trong homeStore.ts, cần sửa phần setCurrentHome
      setCurrentHome: async (home: Home | null, bypassPermission = false) => {
        set({ isLoading: true, error: null });

        if (!home) {
          set({ 
            currentHome: null, 
            currentMember: null, 
            members: [],
            isLoading: false 
          });
          localStorage.removeItem('currentHome');
          return;
        }

        try {
          const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          const user = authState.state?.user;
          const userId = user?.id || user?.userId;
          const isAdmin = user?.roles?.includes('ADMIN');

          set({ members: [] });

          if (isAdmin && bypassPermission) {
            const adminMember: HomeMember = {
              id: 0,
              userId: userId,
              username: user?.username || 'Administrator',
              email: user?.email || '',
              role: 'ADMIN',
              status: 'ACTIVE',
              permissions: '[]',
              joinedAt: new Date().toISOString()
            };

            set({
              currentHome: home,
              currentMember: adminMember,
              isLoading: false,
            });
            localStorage.setItem('currentHome', JSON.stringify(home));
            return;
          }

          try {
            console.log(`Fetching current member info for home ${home.id}...`);
            
            const memberResponse = await homeApi.getMyHomeMember(home.id);
            const myMemberResponse = memberResponse.data;
            // ✅ Transform response
            const myMember = transformMemberResponse(myMemberResponse);
            
            console.log('Current member info from API /me:', myMember);
            
            if (myMember.role === 'OWNER' || myMember.role === 'ADMIN' || isAdmin) {
              try {
                const membersResponse = await homeApi.getHomeMembers(home.id);
                const membersResponseArray = extractData(membersResponse.data);
                const allMembers = transformMembersData(membersResponseArray);
                set({ members: allMembers });
              } catch (membersError) {
                console.warn('Could not fetch all members:', membersError);
              }
            }

            set({
              currentHome: home,
              currentMember: myMember, // ✅ Đã transform
              isLoading: false,
            });
            
            localStorage.setItem('currentHome', JSON.stringify(home));
            
          } catch (memberError: any) {
            console.error('Error fetching current member:', memberError);
            
            const status = memberError.response?.status;
            const errorDetail = memberError.response?.data?.detail || 
                              memberError.response?.data?.message;
            
            if (status === 403 || status === 401) {
              set({
                currentHome: null,
                currentMember: null,
                error: 'Bạn không có quyền truy cập nhà này',
                isLoading: false,
              });
            } else {
              set({
                currentHome: null,
                currentMember: null,
                error: errorDetail || 'Không thể tải thông tin thành viên',
                isLoading: false,
              });
            }
          }

        } catch (error: any) {
          const errorMsg = getErrorMessage(error, 'Không thể chọn nhà');
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
          const errorMsg = getErrorMessage(error, 'Không thể tạo nhà');
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
          const errorMsg = getErrorMessage(error, 'Không thể cập nhật nhà');
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
          const errorMsg = getErrorMessage(error, 'Không thể xóa nhà');
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
          const errorMsg = getErrorMessage(error, 'Không thể rời khỏi nhà');
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
          const errorMsg = getErrorMessage(error, 'Không thể chuyển quyền sở hữu');
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      fetchHomeMembers: async (homeId: number) => {
        console.log('fetchHomeMembers called with homeId:', homeId);
        set({ isLoading: true, error: null });
        try {
          const response = await homeApi.getHomeMembers(homeId);
          console.log('API Response:', response);
          
          const membersResponseArray = extractData(response.data);
          // ✅ Transform data trước khi lưu
          const membersArray = transformMembersData(membersResponseArray);
          
          console.log('Transformed members array:', membersArray);
          set({ members: membersArray, isLoading: false });
        } catch (error: any) {
          console.error('Error fetching members:', error);
          const errorMsg = getErrorMessage(error, 'Không thể tải danh sách thành viên');
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

          // Sau khi thêm thành viên, fetch lại danh sách (sẽ được transform trong fetchHomeMembers)
          await get().fetchHomeMembers(homeId);

        } catch (error: any) {
          const status = error.response?.status;
          const errorCode = error.response?.data?.code;
          const errorMsg = getErrorMessage(error, 'Không thể thêm thành viên. Vui lòng thử lại.');
          set({ error: errorMsg, isLoading: false });
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
          const errorMsg = getErrorMessage(error, 'Failed to remove member');
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

          // ✅ Transform response.data từ HomeMemberResponse sang HomeMember
          const updatedMemberResponse = response.data;
          const updatedMember = transformMemberResponse(updatedMemberResponse);

          set((state) => ({
            members: state.members.map((m) =>
              m.userId === userId ? updatedMember : m // ✅ Đã transform
            ),
            isLoading: false,
          }));

          toast.success('Cập nhật vai trò thành công!');
        } catch (error: any) {
          const errorMsg = getErrorMessage(error, 'Không thể cập nhật vai trò');
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