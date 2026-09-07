import { Injectable, Logger } from '@nestjs/common';
import {
  DEMO_FAMILY_ID,
  PROFILE_META,
  WorkshopBlocksSchema,
  compileWorkshopBlocks,
  type ProfileKey,
  type WorkshopBlocks,
  type WorkshopLevelRecord,
} from '@sujia/shared';
import { ProfileKey as PrismaProfileKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';

const DEMO_FAMILY_NAME = '苏家学习乐园 Demo';

@Injectable()
export class WorkshopService {
  private readonly log = new Logger(WorkshopService.name);
  private dbReady: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureDb(): Promise<boolean> {
    if (this.dbReady === true) return true;
    try {
      await this.prisma.$connect();
      this.dbReady = true;
      return true;
    } catch (e) {
      this.dbReady = false;
      this.log.warn(`DB unavailable, workshop API will degrade: ${String(e)}`);
      return false;
    }
  }

  private async ensureFamilyAndProfiles() {
    if (!(await this.ensureDb())) return null;

    let family = await this.prisma.family.findUnique({
      where: { id: DEMO_FAMILY_ID },
    });
    if (!family) {
      family = await this.prisma.family.findFirst({
        where: { displayName: DEMO_FAMILY_NAME },
      });
    }
    if (!family) {
      family = await this.prisma.family.create({
        data: { id: DEMO_FAMILY_ID, displayName: DEMO_FAMILY_NAME },
      });
    }

    for (const key of Object.keys(PROFILE_META) as ProfileKey[]) {
      const meta = PROFILE_META[key];
      await this.prisma.profile.upsert({
        where: {
          familyId_key: { familyId: family.id, key: key as PrismaProfileKey },
        },
        create: {
          familyId: family.id,
          key: key as PrismaProfileKey,
          displayName: meta.displayName,
        },
        update: { displayName: meta.displayName },
      });
    }

    return family;
  }

  private async getProfile(profileKey: ProfileKey) {
    const family = await this.ensureFamilyAndProfiles();
    if (!family) return null;
    return this.prisma.profile.findUnique({
      where: {
        familyId_key: { familyId: family.id, key: profileKey as PrismaProfileKey },
      },
    });
  }

  private toRecord(
    row: {
      id: string;
      familyId: string;
      title: string;
      blocksJson: unknown;
      compiledConfig: unknown;
      publishedToMap: boolean;
      createdAt: Date;
      updatedAt: Date;
      author: { key: string };
    },
  ): WorkshopLevelRecord {
    const blocks = WorkshopBlocksSchema.parse(row.blocksJson);
    const compiled =
      row.compiledConfig && typeof row.compiledConfig === 'object'
        ? (row.compiledConfig as WorkshopLevelRecord['compiledConfig'])
        : compileWorkshopBlocks(blocks);
    return {
      id: row.id,
      familyId: row.familyId,
      authorProfileKey: row.author.key as ProfileKey,
      title: row.title,
      templateId: blocks.templateId,
      blocksJson: blocks,
      compiledConfig: compiled,
      publishedToMap: row.publishedToMap,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(familyId = DEMO_FAMILY_ID): Promise<{
    ok: boolean;
    offline?: boolean;
    items: WorkshopLevelRecord[];
  }> {
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true, items: [] };
    }
    try {
      const family = await this.ensureFamilyAndProfiles();
      if (!family) return { ok: true, offline: true, items: [] };
      const fid = familyId || family.id;
      const rows = await this.prisma.workshopLevel.findMany({
        where: { familyId: fid === DEMO_FAMILY_ID ? family.id : fid },
        include: { author: true },
        orderBy: { updatedAt: 'desc' },
      });
      return { ok: true, items: rows.map((r) => this.toRecord(r)) };
    } catch (e) {
      this.log.warn(`list workshop failed: ${String(e)}`);
      return { ok: true, offline: true, items: [] };
    }
  }

  async listPublished(familyId = DEMO_FAMILY_ID): Promise<{
    ok: boolean;
    offline?: boolean;
    items: WorkshopLevelRecord[];
  }> {
    const all = await this.list(familyId);
    return {
      ...all,
      items: all.items.filter((i) => i.publishedToMap),
    };
  }

  async upsert(input: {
    id?: string;
    familyId?: string;
    authorProfileKey: ProfileKey;
    title?: string;
    blocksJson: WorkshopBlocks;
    publishedToMap?: boolean;
  }): Promise<{ ok: boolean; offline?: boolean; item?: WorkshopLevelRecord }> {
    const blocks = WorkshopBlocksSchema.parse(input.blocksJson);
    const compiled = compileWorkshopBlocks(blocks);
    const title = input.title || blocks.title || compiled.title;

    if (!(await this.ensureDb())) {
      // Client keeps localStorage; echo a synthetic item
      const now = new Date().toISOString();
      return {
        ok: true,
        offline: true,
        item: {
          id: input.id || `local-${randomUUID()}`,
          familyId: input.familyId || DEMO_FAMILY_ID,
          authorProfileKey: input.authorProfileKey,
          title,
          templateId: blocks.templateId,
          blocksJson: blocks,
          compiledConfig: compiled,
          publishedToMap: input.publishedToMap ?? false,
          createdAt: now,
          updatedAt: now,
        },
      };
    }

    try {
      const family = await this.ensureFamilyAndProfiles();
      const profile = await this.getProfile(input.authorProfileKey);
      if (!family || !profile) return { ok: false, offline: true };

      const data = {
        title,
        blocksJson: blocks,
        compiledConfig: compiled,
        ...(typeof input.publishedToMap === 'boolean'
          ? { publishedToMap: input.publishedToMap }
          : {}),
      };

      const row = input.id
        ? await this.prisma.workshopLevel.upsert({
            where: { id: input.id },
            create: {
              id: input.id,
              familyId: family.id,
              authorProfileId: profile.id,
              ...data,
              publishedToMap: input.publishedToMap ?? false,
            },
            update: data,
            include: { author: true },
          })
        : await this.prisma.workshopLevel.create({
            data: {
              familyId: family.id,
              authorProfileId: profile.id,
              title: data.title,
              blocksJson: data.blocksJson,
              compiledConfig: data.compiledConfig,
              publishedToMap: input.publishedToMap ?? false,
            },
            include: { author: true },
          });

      return { ok: true, item: this.toRecord(row) };
    } catch (e) {
      this.log.warn(`upsert workshop failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }

  async publish(input: {
    id: string;
    authorProfileKey: ProfileKey;
    publishedToMap?: boolean;
  }): Promise<{ ok: boolean; offline?: boolean; item?: WorkshopLevelRecord }> {
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true };
    }
    try {
      const profile = await this.getProfile(input.authorProfileKey);
      if (!profile) return { ok: false, offline: true };

      const existing = await this.prisma.workshopLevel.findUnique({
        where: { id: input.id },
        include: { author: true },
      });
      if (!existing) return { ok: false };

      const row = await this.prisma.workshopLevel.update({
        where: { id: input.id },
        data: { publishedToMap: input.publishedToMap ?? true },
        include: { author: true },
      });
      return { ok: true, item: this.toRecord(row) };
    } catch (e) {
      this.log.warn(`publish workshop failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }

  async getById(id: string): Promise<{
    ok: boolean;
    offline?: boolean;
    item?: WorkshopLevelRecord;
  }> {
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true };
    }
    try {
      const row = await this.prisma.workshopLevel.findUnique({
        where: { id },
        include: { author: true },
      });
      if (!row) return { ok: false };
      return { ok: true, item: this.toRecord(row) };
    } catch (e) {
      this.log.warn(`get workshop failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }
}
