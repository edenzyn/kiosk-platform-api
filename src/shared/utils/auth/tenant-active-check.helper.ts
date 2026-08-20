import type { BranchRepository } from "../../../modules/branch/branch.repository";
import type { OrganizationRepository } from "../../../modules/organization/organization.repository";
import { HttpStatusCodes } from "../../constants/http-status-codes.constants";
import { AppError } from "../../errors/app-error";

export async function isTenantActiveCheck(
  organizationRepo: OrganizationRepository,
  branchRepo: BranchRepository,
  organizationId: string | null | undefined,
  branchId: string | null | undefined,
): Promise<void> {
  if (organizationId) {
    const organization = await organizationRepo.findOne({ id: organizationId });
    if (!organization || !organization.isActive) {
      throw new AppError(
        "Your organization has been deactivated. Please contact support.",
        { statusCode: HttpStatusCodes.FORBIDDEN },
      );
    }
  }

  if (branchId) {
    const branch = await branchRepo.findOne({ id: branchId });
    if (!branch || !branch.isActive) {
      throw new AppError(
        "Your branch has been deactivated. Please contact the organization administrator.",
        { statusCode: HttpStatusCodes.FORBIDDEN },
      );
    }
  }
}
