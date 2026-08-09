export interface UserResponseDto {
  id: string;
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  email: string;
  mobile: string | null;
  userType: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string | null;
  } | null;
}

export interface GetUsersResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
