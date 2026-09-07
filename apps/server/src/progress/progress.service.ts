import { Injectable, Logger } from '@nestjs/common';
import {
  LEVEL_CATALOG,
  PROFILE_META,
  type LevelId,
  type ProfileKey,
  type ProgressRecord,
  type ProgressUpsert,
} from '@sujia/shared';
import { AgeBand, ProfileKey as PrismaProfileKey, Track } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_FAMILY_NAME = '苏家学习乐园 Demo';

@Injectable()
export class ProgressService {
  private readonly log = new Logger(ProgressService.name);
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
      this.log.warn(`DB unavailable, progress API will degrade: ${String(e)}`);
      return false;
    }
  }

  async ensureCatalog() {
    if (!(await this.ensureDb())) return null;

    let family = await this.prisma.family.findFirst({
      where: { displayName: DEMO_FAMILY_NAME },
    });
    if (!family) {
      family = await this.prisma.family.create({
        data: { displayName: DEMO_FAMILY_NAME },
      });
    }

    for (const key of Object.keys(PROFILE_META) as ProfileKey[]) {
      const meta = PROFILE_META[key];
      await this.prisma.profile.upsert({
        where: { familyId_key: { familyId: family.id, key: key as PrismaProfileKey } },
        create: {
          familyId: family.id,
          key: key as PrismaProfileKey,
          displayName: meta.displayName,
        },
        update: { displayName: meta.displayName },
      });
    }

    for (const level of LEVEL_CATALOG) {
      await this.prisma.level.upsert({
        where: { id: level.id },
        create: {
          id: level.id,
          track: level.track as Track,
          title: level.title,
          minAgeBand: (level.recommendedFor[0] as AgeBand) ?? null,
          sortOrder: LEVEL_CATALOG.findIndex((l) => l.id === level.id),
          configJson: {
            subtitle: level.subtitle,
            emoji: level.emoji,
            recommendedFor: level.recommendedFor,
            timed: level.timed ?? false,
            timeLimitSec: level.timeLimitSec ?? null,
          },
        },
        update: {
          title: level.title,
          track: level.track as Track,
          configJson: {
            subtitle: level.subtitle,
            emoji: level.emoji,
            recommendedFor: level.recommendedFor,
            timed: level.timed ?? false,
            timeLimitSec: level.timeLimitSec ?? null,
          },
        },
      });
    }

    return family;
  }

  private async getProfile(profileKey: ProfileKey) {
    const family = await this.ensureCatalog();
    if (!family) return null;
    return this.prisma.profile.findUnique({
      where: {
        familyId_key: { familyId: family.id, key: profileKey as PrismaProfileKey },
      },
    });
  }

  async list(profileKey: ProfileKey): Promise<{ ok: boolean; offline?: boolean; items: ProgressRecord[] }> {
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true, items: [] };
    }
    try {
      const profile = await this.getProfile(profileKey);
      if (!profile) return { ok: true, items: [] };
      const rows = await this.prisma.progress.findMany({
        where: { profileId: profile.id },
      });
      return {
        ok: true,
        items: rows.map((r) => ({
          profileKey,
          levelId: r.levelId as LevelId,
          stars: r.stars,
          bestCombo: r.bestCombo,
          clearedAt: r.clearedAt?.toISOString() ?? null,
        })),
      };
    } catch (e) {
      this.log.warn(`list progress failed: ${String(e)}`);
      return { ok: true, offline: true, items: [] };
    }
  }

  async upsert(body: ProgressUpsert): Promise<{ ok: boolean; offline?: boolean; item?: ProgressRecord }> {
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true };
    }
    try {
      const profile = await this.getProfile(body.profileKey);
      if (!profile) return { ok: false, offline: true };

      const existing = await this.prisma.progress.findUnique({
        where: {
          profileId_levelId: { profileId: profile.id, levelId: body.levelId },
        },
      });

      const stars = Math.max(existing?.stars ?? 0, body.stars);
      const bestCombo = Math.max(existing?.bestCombo ?? 0, body.bestCombo ?? 0);
      const clearedAt = body.cleared ? new Date() : existing?.clearedAt ?? null;

      const row = await this.prisma.progress.upsert({
        where: {
          profileId_levelId: { profileId: profile.id, levelId: body.levelId },
        },
        create: {
          profileId: profile.id,
          levelId: body.levelId,
          stars,
          bestCombo,
          clearedAt,
        },
        update: {
          stars,
          bestCombo,
          clearedAt,
        },
      });

      const delta = stars - (existing?.stars ?? 0);
      if (delta > 0) {
        await this.prisma.profile.update({
          where: { id: profile.id },
          data: {
            starsTotal: { increment: delta },
            weekStars: { increment: delta },
            ...(bestCombo > profile.bestCombo ? { bestCombo } : {}),
          },
        });
      } else if (bestCombo > profile.bestCombo) {
        await this.prisma.profile.update({
          where: { id: profile.id },
          data: { bestCombo },
        });
      }

      return {
        ok: true,
        item: {
          profileKey: body.profileKey,
          levelId: body.levelId,
          stars: row.stars,
          bestCombo: row.bestCombo,
          clearedAt: row.clearedAt?.toISOString() ?? null,
        },
      };
    } catch (e) {
      this.log.warn(`upsert progress failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }
}
