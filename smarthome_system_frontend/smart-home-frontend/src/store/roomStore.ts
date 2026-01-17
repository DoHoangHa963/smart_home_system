import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  RoomResponse,
  RoomRequest,
  RoomWithStatistics,
  PaginatedRooms,
  RoomQueryParams,
  RoomEvent,
  RoomSummary,
  RoomFilter,
  RoomSortBy,
  RoomEventType,
} from '@/types/room';
import { ApiError } from '@/types/api';
import roomApi from '@/lib/api/room.api';
import { validateRoomRequest } from '@/lib/validation/room.validation';

interface RoomState {
  // State
  rooms: RoomResponse[];
  currentRoom: RoomResponse | null;
  paginatedRooms: PaginatedRooms | null;
  roomStatistics: Record<number, RoomWithStatistics>;
  roomSummary: RoomSummary | null;
  loading: boolean;
  error: string | null;
  
  // Room events (for real-time updates)
  recentEvents: RoomEvent[];
  
  // Filter and pagination
  currentFilters: RoomFilter;
  currentSort: RoomSortBy;
  currentPage: number;
  pageSize: number;
  
  // Actions
  setRooms: (rooms: RoomResponse[]) => void;
  setCurrentRoom: (room: RoomResponse | null) => void;
  setPaginatedRooms: (paginatedRooms: PaginatedRooms | null) => void;
  setRoomStatistics: (roomId: number, statistics: RoomWithStatistics) => void;
  setRoomSummary: (summary: RoomSummary | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Filter actions
  setFilters: (filters: RoomFilter) => void;
  setSort: (sort: RoomSortBy) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Event actions
  addRoomEvent: (event: RoomEvent) => void;
  clearEvents: () => void;
  
  // API actions (thunks)
  fetchRoomsByHome: (homeId: number) => Promise<void>;
  fetchPaginatedRooms: (params: RoomQueryParams) => Promise<void>;
  fetchRoomById: (roomId: number) => Promise<void>;
  fetchRoomStatistics: (roomId: number) => Promise<void>;
  fetchRoomSummary: (homeId: number) => Promise<void>;
  
  createNewRoom: (data: RoomRequest) => Promise<RoomResponse>;
  updateExistingRoom: (roomId: number, data: RoomRequest) => Promise<RoomResponse>;
  deleteExistingRoom: (roomId: number, homeId: number) => Promise<void>;
  
  moveDeviceToAnotherRoom: (roomId: number, deviceId: number) => Promise<void>;
  
  searchRooms: (homeId: number, searchTerm?: string) => Promise<void>;
  
  // Utility actions
  getRoomById: (roomId: number) => RoomResponse | undefined;
  getRoomStatisticsById: (roomId: number) => RoomWithStatistics | undefined;
  clearAllRooms: () => void;
  clearCurrentRoom: () => void;
  clearErrors: () => void;
  
  // Computed/derived state getters
  getRoomCount: () => number;
  getTotalDevices: () => number;
  getRoomsWithDevices: () => RoomResponse[];
  getRoomNames: () => string[];
  getFilteredRooms: () => RoomResponse[];
}

export const useRoomStore = create<RoomState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        rooms: [],
        currentRoom: null,
        paginatedRooms: null,
        roomStatistics: {},
        roomSummary: null,
        loading: false,
        error: null,
        recentEvents: [],
        currentFilters: {},
        currentSort: RoomSortBy.NAME_ASC,
        currentPage: 0,
        pageSize: 20,
        
        // Basic setters
        setRooms: (rooms) => set({ rooms }),
        setCurrentRoom: (room) => set({ currentRoom: room }),
        setPaginatedRooms: (paginatedRooms) => set({ paginatedRooms }),
        setRoomStatistics: (roomId, statistics) =>
          set((state) => ({
            roomStatistics: {
              ...state.roomStatistics,
              [roomId]: statistics,
            },
          })),
        setRoomSummary: (summary) => set({ roomSummary: summary }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        
        // Filter setters
        setFilters: (filters) => set({ currentFilters: filters }),
        setSort: (sort) => set({ currentSort: sort }),
        setPage: (page) => set({ currentPage: page }),
        setPageSize: (size) => set({ pageSize: size }),
        
        // Event actions
        addRoomEvent: (event) =>
          set((state) => ({
            recentEvents: [event, ...state.recentEvents].slice(0, 50), // Keep last 50 events
          })),
        clearEvents: () => set({ recentEvents: [] }),
        
        // API actions
        fetchRoomsByHome: async (homeId) => {
          set({ loading: true, error: null });
          try {
            const rooms = await roomApi.getRoomsByHomeId(homeId);
            set({ rooms, loading: false });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch rooms',
              loading: false,
            });
          }
        },
        
        fetchPaginatedRooms: async (params) => {
          set({ loading: true, error: null });
          try {
            const paginatedRooms = await roomApi.getRoomsByHomeIdPaginated(
              params.homeId,
              params.page,
              params.size,
              params.sort
            );
            set({
              paginatedRooms,
              rooms: paginatedRooms.content,
              currentPage: params.page || 0,
              pageSize: params.size || 20,
              loading: false,
            });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch paginated rooms',
              loading: false,
            });
          }
        },
        
        fetchRoomById: async (roomId) => {
          set({ loading: true, error: null });
          try {
            const room = await roomApi.getRoomById(roomId);
            set({ currentRoom: room, loading: false });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch room',
              loading: false,
            });
          }
        },
        
        fetchRoomStatistics: async (roomId) => {
          set({ loading: true, error: null });
          try {
            const statistics = await roomApi.getRoomStatistics(roomId);
            set((state) => ({
              roomStatistics: {
                ...state.roomStatistics,
                [roomId]: statistics,
              },
              loading: false,
            }));
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch room statistics',
              loading: false,
            });
          }
        },
        
        fetchRoomSummary: async (homeId) => {
          set({ loading: true, error: null });
          try {
            const summary = await roomApi.getRoomSummary(homeId);
            set({ roomSummary: summary, loading: false });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch room summary',
              loading: false,
            });
          }
        },
        
        createNewRoom: async (data) => {
          set({ loading: true, error: null });
          try {
            const validationResult = validateRoomRequest(data);
            if (!validationResult.isValid) {
              throw new Error(Object.values(validationResult.errors).join(', '));
            }
            const newRoom = await roomApi.createRoom(data);
            
            // Update local state
            set((state) => ({
              rooms: [...state.rooms, newRoom],
              currentRoom: newRoom,
              loading: false,
            }));
            
            // Add event
            get().addRoomEvent({
              type: RoomEventType.ROOM_CREATED,
              roomId: newRoom.id,
              homeId: data.homeId,
              userId: 'current-user', // This should be replaced with actual user ID
              timestamp: new Date().toISOString(),
              data: { roomName: newRoom.name },
            });
            
            return newRoom;
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to create room';
            set({
              error: error.response?.data?.message || 'Failed to create room',
              loading: false,
            });
            throw error;
          }
        },
        
        updateExistingRoom: async (roomId, data) => {
          set({ loading: true, error: null });
          try {
            const validationResult = validateRoomRequest(data);
            if (!validationResult.isValid) {
              throw new Error(Object.values(validationResult.errors).join(', '));
            }
            const updatedRoom = await roomApi.updateRoom(roomId, data);
            
            // Update local state
            set((state) => ({
              rooms: state.rooms.map((room) =>
                room.id === roomId ? updatedRoom : room
              ),
              currentRoom: state.currentRoom?.id === roomId ? updatedRoom : state.currentRoom,
              loading: false,
            }));
            
            // Add event
            get().addRoomEvent({
              type: RoomEventType.ROOM_UPDATED,
              roomId,
              homeId: data.homeId,
              userId: 'current-user',
              timestamp: new Date().toISOString(),
              data: { roomName: updatedRoom.name },
            });
            
            return updatedRoom;
          } catch (error: any) {
             const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to update room';
            set({
              error: error.response?.data?.message || 'Failed to update room',
              loading: false,
            });
            throw error;
          }
        },
        
        deleteExistingRoom: async (roomId, homeId) => {
          set({ loading: true, error: null });
          try {
            await roomApi.deleteRoom(roomId);
            
            // Update local state
            set((state) => ({
              rooms: state.rooms.filter((room) => room.id !== roomId),
              currentRoom: state.currentRoom?.id === roomId ? null : state.currentRoom,
              loading: false,
            }));
            
            // Remove statistics if exists
            set((state) => {
              const { [roomId]: _, ...restStatistics } = state.roomStatistics;
              return { roomStatistics: restStatistics };
            });
            
            // Add event
            get().addRoomEvent({
              type: RoomEventType.ROOM_DELETED,
              roomId,
              homeId,
              userId: 'current-user',
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to delete room',
              loading: false,
            });
            throw error;
          }
        },
        
        moveDeviceToAnotherRoom: async (roomId, deviceId) => {
          set({ loading: true, error: null });
          try {
            await roomApi.moveDeviceToRoom(roomId, deviceId);
            
            // Invalidate statistics cache
            set((state) => {
              const { [roomId]: _, ...rest } = state.roomStatistics;
              return { roomStatistics: rest };
            });
            
            // Add event
            get().addRoomEvent({
              type: RoomEventType.DEVICE_MOVED,
              roomId,
              homeId: get().currentRoom?.homeId || 0,
              userId: 'current-user',
              timestamp: new Date().toISOString(),
              data: { deviceId },
            });
            
            set({ loading: false });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to move device',
              loading: false,
            });
            throw error;
          }
        },
        
        searchRooms: async (homeId, searchTerm) => {
          set({ loading: true, error: null });
          try {
            const params: RoomQueryParams = {
              homeId,
              page: get().currentPage,
              size: get().pageSize,
              sort: get().currentSort,
              name: searchTerm,
            };
            
            const paginatedRooms = await roomApi.searchRooms(
              homeId,
              searchTerm,
              get().currentPage,
              get().pageSize,
              get().currentSort
            );
            
            set({
              paginatedRooms,
              rooms: paginatedRooms.content,
              loading: false,
            });
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to search rooms',
              loading: false,
            });
          }
        },
        
        // Utility actions
        getRoomById: (roomId) => {
          return get().rooms.find((room) => room.id === roomId);
        },
        
        getRoomStatisticsById: (roomId) => {
          return get().roomStatistics[roomId];
        },
        
        clearAllRooms: () => {
          set({
            rooms: [],
            paginatedRooms: null,
            roomStatistics: {},
            currentRoom: null,
          });
        },
        
        clearCurrentRoom: () => {
          set({ currentRoom: null });
        },
        
        clearErrors: () => {
          set({ error: null });
        },
        
        // Computed getters
        getRoomCount: () => get().rooms.length,
        
        getTotalDevices: () => {
          return get().rooms.reduce((total, room) => total + (room.deviceCount || 0), 0);
        },
        
        getRoomsWithDevices: () => {
          return get().rooms.filter((room) => (room.deviceCount || 0) > 0);
        },
        
        getRoomNames: () => {
          return get().rooms.map((room) => room.name);
        },
        
        getFilteredRooms: () => {
          const { rooms, currentFilters } = get();
          
          return rooms.filter((room) => {
            // Filter by name
            if (currentFilters.name && !room.name.toLowerCase().includes(currentFilters.name.toLowerCase())) {
              return false;
            }
            
            // Filter by device count
            if (currentFilters.hasDevices !== undefined) {
              const hasDevices = (room.deviceCount || 0) > 0;
              if (currentFilters.hasDevices && !hasDevices) return false;
              if (!currentFilters.hasDevices && hasDevices) return false;
            }
            
            if (currentFilters.minDevices !== undefined && (room.deviceCount || 0) < currentFilters.minDevices) {
              return false;
            }
            
            if (currentFilters.maxDevices !== undefined && (room.deviceCount || 0) > currentFilters.maxDevices) {
              return false;
            }
            
            return true;
          });
        },
      }),
      {
        name: 'room-storage',
        partialize: (state) => ({
          // Only persist these fields
          rooms: state.rooms,
          currentFilters: state.currentFilters,
          currentSort: state.currentSort,
          pageSize: state.pageSize,
          // Don't persist loading, error, currentRoom, etc.
        }),
      }
    ),
    {
      name: 'RoomStore',
    }
  )
);

// Selector hooks for better performance
export const useRooms = () => useRoomStore((state) => state.rooms);
export const useCurrentRoom = () => useRoomStore((state) => state.currentRoom);
export const useRoomStatistics = (roomId: number) =>
  useRoomStore((state) => state.roomStatistics[roomId]);
export const useRoomSummary = () => useRoomStore((state) => state.roomSummary);
export const useRoomLoading = () => useRoomStore((state) => state.loading);
export const useRoomError = () => useRoomStore((state) => state.error);
export const useRoomEvents = () => useRoomStore((state) => state.recentEvents);
export const useRoomFilters = () => useRoomStore((state) => state.currentFilters);
export const useRoomSort = () => useRoomStore((state) => state.currentSort);
export const usePagination = () =>
  useRoomStore((state) => ({
    page: state.currentPage,
    size: state.pageSize,
    totalPages: state.paginatedRooms?.totalPages || 0,
    totalElements: state.paginatedRooms?.totalElements || 0,
  }));

// Action hooks
export const useRoomActions = () =>
  useRoomStore((state) => ({
    fetchRoomsByHome: state.fetchRoomsByHome,
    fetchRoomById: state.fetchRoomById,
    fetchRoomStatistics: state.fetchRoomStatistics,
    createNewRoom: state.createNewRoom,
    updateExistingRoom: state.updateExistingRoom,
    deleteExistingRoom: state.deleteExistingRoom,
    moveDeviceToAnotherRoom: state.moveDeviceToAnotherRoom,
    searchRooms: state.searchRooms,
    setFilters: state.setFilters,
    setSort: state.setSort,
    setPage: state.setPage,
    setPageSize: state.setPageSize,
    clearAllRooms: state.clearAllRooms,
    clearCurrentRoom: state.clearCurrentRoom,
    clearErrors: state.clearErrors,
  }));

// Derived state hooks
export const useRoomCount = () => useRoomStore((state) => state.getRoomCount());
export const useTotalDevices = () => useRoomStore((state) => state.getTotalDevices());
export const useRoomsWithDevices = () => useRoomStore((state) => state.getRoomsWithDevices());
export const useRoomNames = () => useRoomStore((state) => state.getRoomNames());
export const useFilteredRooms = () => useRoomStore((state) => state.getFilteredRooms());