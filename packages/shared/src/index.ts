export const PROFILE_KEYS = ['tiantian', 'mengying', 'mengzhe'] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];

export const PROFILE_META: Record<
  ProfileKey,
  { displayName: string; title: string; blurb: string; accent: string }
> = {
  tiantian: {
    displayName: '甜甜',
    title: '探险队长',
    blurb: '眼镜女孩 · 冷静带路',
    accent: '#2f6b4f',
  },
  mengying: {
    displayName: '孟赢',
    title: '活力冲锋',
    blurb: '红卫衣女孩 · 热情组队',
    accent: '#c62828',
  },
  mengzhe: {
    displayName: '孟辙',
    title: '数字小侦察兵',
    blurb: '数字衫男孩 · 好奇按按钮',
    accent: '#1565c0',
  },
};

export const MAP_HOTSPOTS = [
  { id: 'math', label: '数学馆', emoji: '🧮', hint: '口算与应用题' },
  { id: 'english', label: '英语岛', emoji: '🔤', hint: '听音与词汇' },
  { id: 'team', label: '组队', emoji: '🤝', hint: '房间码一起闯关（M2）' },
  { id: 'workshop', label: '工坊', emoji: '🧱', hint: '自己造关卡（M2）' },
] as const;

import { z } from 'zod';

export const ProfileKeySchema = z.enum(PROFILE_KEYS);

export const SelectProfileSchema = z.object({
  key: ProfileKeySchema,
  selectedAt: z.string().datetime().optional(),
});

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string(),
  time: z.string(),
});

export type SelectProfile = z.infer<typeof SelectProfileSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
