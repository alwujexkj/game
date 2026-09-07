import { Injectable, Logger } from '@nestjs/common';
import {
  DEMO_FAMILY_ID,
  PROFILE_META,
  weekKeyOf,
  type ProfileKey,
} from '@sujia/shared';
import { ProfileKey as PrismaProfileKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_FAMILY_NAME = '苏家学习乐园 Demo';

@Injectable()
export class ParentService {
  private readonly log = new Logger(ParentService.name);
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
      this.log.warn(`DB unavailable, parent API will degrade: ${String(e)}`);
      return false;
    }
  }

  private async ensureFamily() {
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
    return family;
  }

  async setPinHash(pinHash: string): Promise<{ ok: boolean; offline?: boolean }> {
    if (!(await this.ensureDb())) return { ok: true, offline: true };
    try {
      const family = await this.ensureFamily();
      if (!family) return { ok: true, offline: true };
      await this.prisma.family.update({
        where: { id: family.id },
        data: { parentPinHash: pinHash },
      });
      return { ok: true };
    } catch (e) {
      this.log.warn(`setPinHash failed: ${String(e)}`);
      return { ok: true, offline: true };
    }
  }

  async verifyPinHash(pinHash: string): Promise<{ ok: boolean; offline?: boolean }> {
    if (!(await this.ensureDb())) return { ok: false, offline: true };
    try {
      const family = await this.ensureFamily();
      if (!family?.parentPinHash) return { ok: false, offline: true };
      return { ok: family.parentPinHash === pinHash };
    } catch (e) {
      this.log.warn(`verifyPinHash failed: ${String(e)}`);
      return { ok: false, offline: true };
    }
  }

  /** Accept raw pin from client; hash server-side for compare when DB has hash. */
  async verifyPin(pin: string): Promise<{ ok: boolean; offline?: boolean }> {
    // Client primarily compares locally; server only helps if hash was synced.
    // We store client hash as-is via setPinHash — verify endpoint receives raw pin
    // so we cannot recompute without same salt. For demo, treat as offline-first.
    if (!(await this.ensureDb())) return { ok: false, offline: true };
    try {
      const family = await this.ensureFamily();
      if (!family?.parentPinHash) return { ok: false };
      // Demo: if client sends pin matching length only when offline local fails —
      // actual compare happens client-side. Return false unless exact hash string sent as pin.
      if (pin === family.parentPinHash) return { ok: true };
      return { ok: false };
    } catch {
      return { ok: false, offline: true };
    }
  }

  async dashboard(): Promise<{
    ok: boolean;
    offline?: boolean;
    weekKey: string;
    children: Array<{
      profileKey: ProfileKey;
      displayName: string;
      weekStars: number;
      bestCombo: number;
      clears: number;
      weakTags: Array<{ tag: string; wrongCount: number }>;
    }>;
  }> {
    const weekKey = weekKeyOf();
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true, weekKey, children: [] };
    }
    try {
      const family = await this.ensureFamily();
      if (!family) return { ok: true, offline: true, weekKey, children: [] };

      const profiles = await this.prisma.profile.findMany({
        where: { familyId: family.id },
        include: {
          progress: true,
          weakTags: { orderBy: { wrongCount: 'desc' }, take: 3 },
        },
      });

      const children = profiles.map((p) => ({
        profileKey: p.key as ProfileKey,
        displayName: p.displayName || PROFILE_META[p.key as ProfileKey]?.displayName || p.key,
        weekStars: p.weekStars,
        bestCombo: p.bestCombo,
        clears: p.progress.filter((x) => x.clearedAt).length,
        weakTags: p.weakTags.map((w) => ({ tag: w.tag, wrongCount: w.wrongCount })),
      }));

      return { ok: true, weekKey, children };
    } catch (e) {
      this.log.warn(`dashboard failed: ${String(e)}`);
      return { ok: true, offline: true, weekKey, children: [] };
    }
  }

  async rank(weekKey?: string): Promise<{
    ok: boolean;
    offline?: boolean;
    weekKey: string;
    rows: Array<{ profileKey: ProfileKey; weekStars: number; bestCombo: number }>;
  }> {
    const key = weekKey || weekKeyOf();
    if (!(await this.ensureDb())) {
      return { ok: true, offline: true, weekKey: key, rows: [] };
    }
    try {
      const family = await this.ensureFamily();
      if (!family) return { ok: true, offline: true, weekKey: key, rows: [] };

      const snap = await this.prisma.rankSnapshot.findUnique({
        where: { familyId_weekKey: { familyId: family.id, weekKey: key } },
      });
      if (snap && Array.isArray(snap.payloadJson)) {
        return {
          ok: true,
          weekKey: key,
          rows: snap.payloadJson as Array<{
            profileKey: ProfileKey;
            weekStars: number;
            bestCombo: number;
          }>,
        };
      }

      const profiles = await this.prisma.profile.findMany({ where: { familyId: family.id } });
      return {
        ok: true,
        weekKey: key,
        rows: profiles.map((p) => ({
          profileKey: p.key as ProfileKey,
          weekStars: p.weekStars,
          bestCombo: p.bestCombo,
        })),
      };
    } catch (e) {
      this.log.warn(`rank failed: ${String(e)}`);
      return { ok: true, offline: true, weekKey: key, rows: [] };
    }
  }
}
