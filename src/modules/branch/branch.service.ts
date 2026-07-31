import type { BranchRepository } from "./branch.repository";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreateBranchRequestDto } from "./dtos/create-branch-request.dto";
import { AppError } from "../../shared/errors/app-error";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";

export class BranchService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async createBranch(
    data: Omit<CreateBranchRequestDto, "createdBy">,
    user: UserTokenDto,
  ) {
    if (user.organizationId && user.organizationId !== data.organizationId) {
      throw new AppError("Cannot create branch for a different organization", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }

    return this.branchRepository.create({
      ...data,
      createdBy: user.id,
    });
  }

  async listBranches(organizationId?: string, user?: UserTokenDto) {
    const orgIdFilter = user?.organizationId || organizationId;

    let branchIdsFilter: string[] | undefined = undefined;
    if (user?.branchId) {
      branchIdsFilter = [user.branchId];
    }

    return this.branchRepository.findAll(orgIdFilter, branchIdsFilter);
  }
}
