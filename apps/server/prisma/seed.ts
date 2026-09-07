/**
 * Seed demo family, 3 profiles, and M1 levels (M1/M2/M4/E1/E3).
 */
import { PrismaClient, AgeBand, Track } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const family = await prisma.family.upsert({
    where: { id: "demo-sujia-family" },
    create: { id: "demo-sujia-family", displayName: "苏家学习乐园 Demo" },
    update: { displayName: "苏家学习乐园 Demo" },
  });

  const profiles = [
    { key: "tiantian" as const, displayName: "甜甜" },
    { key: "mengying" as const, displayName: "孟赢" },
    { key: "mengzhe" as const, displayName: "孟辙" },
  ];
  for (const p of profiles) {
    await prisma.profile.upsert({
      where: { familyId_key: { familyId: family.id, key: p.key } },
      create: { familyId: family.id, key: p.key, displayName: p.displayName },
      update: { displayName: p.displayName },
    });
  }

  const levels = [
    { id: "M1", track: Track.math, title: "果冻数骨头", minAgeBand: AgeBand.kinder, sortOrder: 1, configJson: { emoji: "bone", subtitle: "count 1-10" } },
    { id: "M2", track: Track.math, title: "开门要几块", minAgeBand: AgeBand.kinder, sortOrder: 2, configJson: { emoji: "door", subtitle: "add/sub within 10" } },
    { id: "M4", track: Track.math, title: "口算冲刺塔", minAgeBand: AgeBand.g4, sortOrder: 4, configJson: { emoji: "tower", timed: true, timeLimitSec: 90 } },
    { id: "E1", track: Track.english, title: "听音找卡片", minAgeBand: AgeBand.kinder, sortOrder: 1, configJson: { emoji: "listen" } },
    { id: "E3", track: Track.english, title: "单词配对翻翻乐", minAgeBand: AgeBand.g4, sortOrder: 3, configJson: { emoji: "pair" } },
  ];
  for (const level of levels) {
    await prisma.level.upsert({
      where: { id: level.id },
      create: level,
      update: {
        title: level.title,
        track: level.track,
        minAgeBand: level.minAgeBand,
        sortOrder: level.sortOrder,
        configJson: level.configJson,
      },
    });
  }
  console.log("Seeded demo family, profiles, levels M1/M2/M4/E1/E3");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
