import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { organizations } from "./organization.schema";
import type {
  CreateOrganizationRepoInput,
  CreateOrganizationRepoResult,
  FindAllOrganizationsRepoInput,
  FindAllOrganizationsRepoResult,
  FindOneOrganizationRepoInput,
  FindOneOrganizationRepoResult,
} from "./organization.types";

export class OrganizationRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? ORGANIZATION SCHEMA METHODS
  // ========================================
  async findOne(
    input: FindOneOrganizationRepoInput,
  ): Promise<FindOneOrganizationRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) {
      conditions.push(eq(organizations.id, input.id));
    }
    if (input.name !== undefined) {
      conditions.push(eq(organizations.name, input.name));
    }

    if (conditions.length === 0) {
      return undefined;
    }

    const [organization] = await this.database.client
      .select()
      .from(organizations)
      .where(and(...conditions))
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
}
