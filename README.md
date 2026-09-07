# 苏家学习乐园

家庭竖屏 H5：数学馆 · 英语岛 · 组队房间码 · **造关卡工坊（M3）**。
角色：甜甜、孟赢（女孩）、孟辙（男孩）、果冻（狗）。

## 功能

### M1 单人关
- M1 /math/M1 果冻数骨头
- M2 /math/M2 开门要几块
- M4 /math/M4 口算冲刺塔
- E1 /english/E1 听音找卡片
- E3 /english/E3 单词配对翻翻乐

### M3 造关卡工坊
- 地图热点 **工坊** → `/workshop`
- 三模板：寻宝门 / 口算塔矮版 / 听音三选一
- 积木参数：开门要几分、果冻走几步、题量、题型、答对奖励星
- 试玩 → 保存「我的关卡」→「放到地图」出现在工坊谷
- 本地 localStorage + 可选 Nest `/api/workshop`（DB 不可用时降级）

### M2 多设备组队（T1 双人开门）
- 地图热点 **组队** → `/room`
- 创建房间得到 4 位房间码（如 A7K2），大厅展示大字码 + 复制
- 另一设备输入码加入；座位最多 3 人；准备 → 房主开始
- 模式 all_must_correct：每人作答，全员答对才推进；通关后结算星数
- 实时通道命名空间 /room（见 docs/房间事件细稿-v1.md）
- 重连：客户端发 room.sync / 再 room.join 拿全量 room.state
- 热状态：Redis（若 REDIS_URL 可用）否则内存 Map，仅 Nest 也能本地演示


## 演示鉴权（家庭 Demo）

所有客户端共用固定 familyId = sujia-demo（DEMO_FAMILY_ID）。

握手 auth：
familyId + profileKey(tiantian|mengying|mengzhe) + displayName

同一家庭才能进同一房间。

## 两浏览器联调

1. 安装依赖，shared build，启动 dev:server(:3000) 与 dev:web(:5173)。Postgres/Redis 可选（docker compose）。
2. 浏览器 A：选「甜甜」→ 地图 → 组队 → 创建房间 → 复制大字房间码
3. 浏览器 B（无痕）：选「孟赢」或「孟辙」→ 组队 → 输入同一码加入
4. 双方准备，房主开始双人开门
5. 各自答题；全对推进；结算看星数

Redis 可选。未启动时日志会提示 in-memory room store，联机仍可用。

环境变量见 .env.example。前端可用 VITE_SERVER_URL（默认 http://localhost:3000）。
Vite 已代理 /api 与实时通道路径。

## Run

见根目录 package.json scripts：
install → db:generate → shared build → dev:web / dev:server

试玩：选角色，进地图数学馆 / 英语岛 / 组队 / 工坊。
