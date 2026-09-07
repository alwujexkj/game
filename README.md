# 苏家学习乐园

家庭竖屏 H5 学习乐园：数学馆 · 英语岛 · 组队房间 · 造关卡工坊。
角色：甜甜（眼镜女孩）、孟赢（红卫衣女孩）、孟辙（数字衫男孩）、果冻（唯一犬引导）。

## M0 范围（本分支）

- pnpm monorepo：`apps/web` · `apps/server` · `packages/shared`
- 前端路由：`/` 闪屏、`/select` 选人、`/map` 竹林地图、`/parent` PIN 占位
- Pinia + localStorage 保存当前角色
- NestJS `GET /api/health` + Prisma schema + Socket.IO 空桩
- docker-compose：PostgreSQL + Redis
- 文档：`docs/房间事件细稿-v1.md`（M2 规划，无实时实现）

**不在 M0**：关卡玩法、实时组队、家长鉴权、第三方 BaaS。

## 本地运行

### 前置

- Node.js ≥ 20
- pnpm 9.x（可用 corepack 激活 pnpm@9.15.0）
- Docker（可选，用于数据库）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库（可选）

```bash
cp .env.example apps/server/.env
pnpm docker:up
pnpm db:generate
```

### 3. 启动前端

```bash
pnpm dev:web
# http://localhost:5173
```

### 4. 启动后端

```bash
pnpm dev:server
# http://localhost:3000
# GET /api/health
```

## 目录结构

```
apps/web          Vue 3 + Vite + TS + Router + Pinia
apps/server       NestJS + Prisma + Socket.IO stub
packages/shared   ProfileKey + Zod schemas
docs/
```

## 角色速记

| key | 显示名 | 辨识 |
|---|---|---|
| tiantian | 甜甜 | 眼镜女孩 |
| mengying | 孟赢 | 红卫衣女孩 |
| mengzhe | 孟辙 | 数字衫男孩 |
| （引导） | 果冻 | 唯一犬角色 |
