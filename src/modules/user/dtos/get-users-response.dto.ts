export interface UserResponseDto {
  id: string;
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
    name: string;
  } | null;
}

export interface GetUsersResponseDto {
  users: UserResponseDto[];
}
