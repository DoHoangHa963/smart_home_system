export interface Home {
  id: number;
  name: string;
  address?: string;
  timeZone?: string;
  ownerId: string;
  ownerUsername: string;
  memberCount: number;
  roomCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeRequest {
  name: string;
  address?: string;
  timeZone?: string;
}

export interface HomeResponse {
  id: number;
  name: string;
  address?: string;
  timeZone?: string;
  ownerId: string;
  ownerUsername: string;
  memberCount: number;
  roomCount: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// HOME MEMBER TYPES
// ============================================
export interface HomeMember {
  id: number;
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
  joinedAt?: string;
  customRoleName?: string;
  permissions?: string; // JSON string
}

export interface HomeMemberResponse {
  id: number;
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
  joinedAt?: string;
}

export interface AddMemberRequest {
  identifier: string; // email or username
  role?: 'ADMIN' | 'MEMBER' | 'GUEST';
}

export interface UpdateRoleRequest {
  newRole: 'ADMIN' | 'MEMBER' | 'GUEST';
}

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface HomeWithMember {
  home: Home;
  currentMember: HomeMember;
}