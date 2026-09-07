# 苏家学习乐园

家庭竖屏 H5：数学馆 · 英语岛。
角色：甜甜、孟赢、孟辙、果冻。

## M1
- M1 /math/M1 果冻数骨头
- M2 /math/M2 开门要几块
- M4 /math/M4 口算冲刺塔
- E1 /english/E1 听音找卡片
- E3 /english/E3 单词配对翻翻乐

Runtime 爱心连击果冻气泡星级结算。进度 localStorage 与 Nest progress API。
推荐：孟辙 M1/M2/E1；孟赢 M2/M4/E3；甜甜全部。

## Run
pnpm install
pnpm db:generate
pnpm --filter @sujia/shared build
pnpm dev:web
pnpm dev:server

试玩：选角色，进地图数学馆或英语岛，闯关结算看星数。
