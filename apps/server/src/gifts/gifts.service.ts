import { Injectable, Logger } from '@nestjs/common';
import {
  DEMO_FAMILY_ID,
  FEED_JELLY_TARGET,
  PROFILE_META,
  STICKER_CATALOG,
  pickJellyReaction,
  type InventoryItem,
  type ProfileKey,
  type StickerId,
} from '@sujia/shared';
import { ProfileKey as PrismaProfileKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_FAMILY_NAME = '苏家学习乐园 Demo';

@Injectable()
export class GiftsService {
  private readonly log = new Logger(GiftsService.name);
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
      this.log.warn(`DB unavailable, gifts API will degrade: ${String(e)}`);
      return false;
    }
  }

  private async ensureFamilyProfilesAndStickers() {
    if (!(await this.ensureDb())) return null;

    let family = await this.prisma.family.findUnique({ where: { id: DEMO_FAMILY_ID } });
    if (!family) {
      family = await this.prisma.family.findFirst({ where: { displayName: DEMO_FAMILY_NAME } });
    }
    if (!family) {
      family = await this.prisma.family.create({
        data: { id: DEMO_FAMILY_ID, displayName: DEMO_FAMILY_NAME },
      });
    }

    for (const key of Object.keys(PROFILE_META) as ProfileKey[]) {
      await this.prisma.profile.upsert({
        where: { familyId_key: { familyId: family.id, key: key as PrismaProfileKey } },
        create: {
          familyId: family.id,
          key: key as PrismaProfileKey,
          displayName: PROFILE_META[key].displayName,
        },
        update: { displayName: PROFILE_META[key].displayName },
      });
    }

    for (const s of STICKER_CATALOG) {
      await this.prisma.sticker.upsert({
        where: { code: s.id },
        create: {
          code: s.id,
          name: s.name,
          rarity: s.rarity,
          assetKey: 'gift-stickers-v1',
        },
        update: { name: s.name, rarity: s.rarity },
      });
    }

    return family;
  }

  private async getProfile(profileKey: ProfileKey) {
    const family = await this.ensureFamilyProfilesAndStickers();
    if (!family) return null;
    return this.prisma.profile.findUnique({
      where: { familyId_key: { familyId: family.id, key: profileKey as PrismaProfileKey } },
    });
  }

  async getInventory(profileKey: ProfileKey): Promise<{
    ok: boolean;
    offline?: boolean;
    items: InventoryItem[];
  }> {
    if (!(await this.ensureDb())) return { ok: true, offline: true, items: [] };
    try {
      const profile = await this.getProfile(profileKey);
      if (!profile) return { ok: true, items: [] };
      const rows = await this.prisma.inventoryItem.findMany({
        where: { profileId: profile.id },
        include: { sticker: true },
      });
      return {
        ok: true,
        items: rows
          .filter((r) => r.count > 0)
          .map((r) => ({
            stickerId: r.sticker.code as StickerId,
            count: r.count,
          })),
      };
    } catch (e) {
      this.log.warn(`getInventory failed: ${String(e)}`);
      return { ok: true, offline: true, items: [] };
    }
  }

  async upsertInventory(input: {
    profileKey: ProfileKey;
    items: InventoryItem[];
  }): Promise<{ ok: boolean; offline?: boolean }> {
    if (!(await this.ensureDb())) return { ok: true, offline: true };
    try {
      const profile = await this.getProfile(input.profileKey);
      if (!profile) return { ok: false, offline: true };

      for (const item of input.items) {
        const sticker = await this.prisma.sticker.findUnique({ where: { code: item.stickerId } });
        if (!sticker) continue;
        await this.prisma.inventoryItem.upsert({
          where: {
            profileId_stickerId: { profileId: profile.id, stickerId: sticker.id },
          },
          create: {
            profileId: profile.id,
            stickerId: sticker.id,
            count: Math.max(0, item.count),
          },
          update: { count: Math.max(0, item.count) },
        });
      }
      return { ok: true };
    } catch (e) {
      this.log.warn(`upsertInventory failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }

  async sendGift(input: {
    fromProfileKey: ProfileKey;
    toProfileKey: ProfileKey | typeof FEED_JELLY_TARGET;
    stickerId: StickerId;
  }): Promise<{ ok: boolean; offline?: boolean; reaction?: string }> {
    if (input.toProfileKey === FEED_JELLY_TARGET) {
      return { ok: true, offline: !(await this.ensureDb()), reaction: pickJellyReaction() };
    }
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true };
    }
    try {
      const from = await this.getProfile(input.fromProfileKey);
      const to = await this.getProfile(input.toProfileKey);
      const sticker = await this.prisma.sticker.findUnique({ where: { code: input.stickerId } });
      if (!from || !to || !sticker) return { ok: false, offline: true };

      await this.prisma.giftLog.create({
        data: {
          fromProfileId: from.id,
          toProfileId: to.id,
          stickerId: sticker.id,
          status: 'claimed',
          claimedAt: new Date(),
        },
      });
      return { ok: true };
    } catch (e) {
      this.log.warn(`sendGift failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }
}
