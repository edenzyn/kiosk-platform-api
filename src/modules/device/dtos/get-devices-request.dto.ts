export interface GetDevicesRequestDto {
  organizationId?: string;
  branchId?: string;
  deviceIds?: string[];
  page?: number;
  limit?: number;
}
