import type { BranchRepository } from "../../../modules/branch/branch.repository";
import type { OrganizationRepository } from "../../../modules/organization/organization.repository";
import { ForbiddenError } from "../../errors/forbidden-error";

export async function isTenantActiveCheck(
  organizationRepo: OrganizationRepository,
  branchRepo: BranchRepository,
  organizationId: string | null | undefined,
  branchId: string | null | undefined,
): Promise<void> {
  if (organizationId) {
    const organization = await organizationRepo.findOne({ id: organizationId });
    if (!organization || !organization.isActive) {
      throw new ForbiddenError(
        "Your organization has been deactivated. Please contact support.",
      );
    }
  }

  if (branchId) {
    const branch = await branchRepo.findOne({ id: branchId });
    if (!branch || !branch.isActive) {
      throw new ForbiddenError(
        "Your branch has been deactivated. Please contact the organization administrator.",
      );
    }
  }
}
