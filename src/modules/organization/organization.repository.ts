import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../config/db";
import { organizations } from "./organization.schema";
import type {
  CreateOrganizationRepoInput,
  CreateOrganizationRepoResult,
  FindAllOrganizationsRepoInput,
  FindAllOrganizationsRepoResult,
  FindOrganizationByIdRepoInput,
  FindOrganizationByIdRepoResult,
  FindOrganizationByNameRepoInput,
  FindOrganizationByNameRepoResult,
} from "./organization.types";

export class OrganizationRepository {
  constructor(private readonly database: Database) {}

  async create(
    input: CreateOrganizationRepoInput,
  ): Promise<CreateOrganizationRepoResult> {
    const [organization] = await this.database.client
      .insert(organizations)
      .values(input.data)
      .returning();

    if (!organization) {
      throw new Error("Failed to create organization");
    }
    return organization;
  }

  async findById(
    input: FindOrganizationByIdRepoInput,
  ): Promise<FindOrganizationByIdRepoResult> {
    const [organization] = await this.database.client
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.id))
      .limit(1);

    return organization;
  }

  async findByName(
    input: FindOrganizationByNameRepoInput,
  ): Promise<FindOrganizationByNameRepoResult> {
    const [organization] = await this.database.client
      .select()
      .from(organizations)
      .where(eq(organizations.name, input.name))
      .limit(1);

    return organization;
  }

  async findAll(
    input: FindAllOrganizationsRepoInput = {},
  ): Promise<FindAllOrganizationsRepoResult> {
    let query = this.database.client.select().from(organizations).$dynamic();

    if (input.orgIds && input.orgIds.length > 0) {
      query = query.where(inArray(organizations.id, input.orgIds));
    }

    return query;
  }
}
