export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
  // Các field count nếu cần
  ownedHomesCount?: number;
  homeMembershipsCount?: number;
}