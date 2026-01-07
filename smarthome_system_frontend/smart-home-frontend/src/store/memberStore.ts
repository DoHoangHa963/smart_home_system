import { create } from 'zustand';
import { Member, Role } from '@/types';

// Mock Data
const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'Nguyễn Văn A', email: 'admin@example.com', role: 'owner', joinDate: '2023-01-01' },
  { id: '2', name: 'Trần Thị B', email: 'wife@example.com', role: 'admin', joinDate: '2023-01-05' },
  { id: '3', name: 'Lê Văn C', email: 'son@example.com', role: 'member', joinDate: '2023-06-12' },
];

interface MemberState {
  members: Member[];
  currentUserEmail: string; // Giả lập user đang đăng nhập
  addMember: (member: Omit<Member, 'id' | 'joinDate'>) => void;
  removeMember: (id: string) => void;
  updateRole: (id: string, newRole: Role) => void;
  transferOwnership: (newOwnerId: string) => void;
  leaveHome: () => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  members: MOCK_MEMBERS,
  currentUserEmail: 'admin@example.com', // Giả sử user hiện tại là ông A

  addMember: (newMember) => set((state) => ({
    members: [...state.members, { 
      ...newMember, 
      id: Math.random().toString(), 
      joinDate: new Date().toISOString().split('T')[0] 
    }]
  })),

  removeMember: (id) => set((state) => ({
    members: state.members.filter((m) => m.id !== id)
  })),

  updateRole: (id, newRole) => set((state) => ({
    members: state.members.map((m) => m.id === id ? { ...m, role: newRole } : m)
  })),

  transferOwnership: (newOwnerId) => set((state) => {
    // 1. Tìm owner hiện tại chuyển thành admin
    // 2. Tìm member mới chuyển thành owner
    return {
      members: state.members.map(m => {
        if (m.role === 'owner') return { ...m, role: 'admin' };
        if (m.id === newOwnerId) return { ...m, role: 'owner' };
        return m;
      })
    };
  }),

  leaveHome: () => {
    console.log("Rời nhà thành công");
    // Logic gọi API rời nhà thực tế ở đây
  }
}));