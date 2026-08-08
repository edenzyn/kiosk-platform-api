export interface CreateBranchRequestDto {
  organizationId: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  area?: string | null;
  landmark?: string | null;
  address: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  taxId?: string | null;
  createdBy: string;
}
