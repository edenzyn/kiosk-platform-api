import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../config/db";
import {
  organizations,
  type OrganizationEntity,
  type CreateOrganizationEntity,
} from "./organization.schema";

export class OrganizationRepository {
  constructor(private readonly database: Database) {}

  async create(data: CreateOrganizationEntity): Promise<OrganizationEntity> {
    const [organization] = await this.database.client
      .insert(organizations)
      .values(data)
      .returning();

    if (!organization) {
      throw new Error("Failed to create organization");
    }
    return organization;
  }

  async findById(id: string): Promise<OrganizationEntity | undefined> {
    const [organization] = await this.database.client
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    return organization;
  }

  async findByName(name: string): Promise<OrganizationEntity | undefined> {
    const [organization] = await this.database.client
      .select()
      .from(organizations)
      .where(eq(organizations.name, name))
      .limit(1);

    return organization;
  }

  async findAll(filters?: {
    orgIds?: string[];
  }): Promise<OrganizationEntity[]> {
    let query = this.database.client.select().from(organizations).$dynamic();

    if (filters?.orgIds && filters.orgIds.length > 0) {
      query = query.where(inArray(organizations.id, filters.orgIds));
    }

    return query;
  }
}
