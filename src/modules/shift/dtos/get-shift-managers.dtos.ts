export interface GetShiftManagersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ShiftManagerDto {
  id: string;
  name: string;
  hasPin: boolean;
}

export interface GetShiftManagersResponseDto {
  managers: ShiftManagerDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
