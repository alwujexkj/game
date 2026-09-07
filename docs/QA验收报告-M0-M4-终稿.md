# 苏家学习乐园 QA 验收报告 M0-M4 终稿

| 项 | 值 |
|----|-----|
| 日期 | 2026-09-07 Asia/Shanghai |
| 仓库 | https://github.com/alwujexkj/game main @ 495dcb8 |
| 本文件 | /workspace/sujia-game-qa/ACCEPTANCE-FINAL.md |
| 环境 | Vite:5173 Nest:3000 familyId=sujia-demo no DB/Redis |
| 结论 | Accept with conditions |

## 1. 测试用例表

| ID | Area | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| A1 | 选人 | 打开 / | Splash+CTA | Pass | 果冻欢迎 |
| A2 | 选人 | /select | 三孩 | Pass | 果冻不可选 |
| A3 | 选人 | 点甜甜 | /map | Pass |  |
| A4 | 选人 | 换人孟赢 | 当前孟赢 | Pass |  |
| B1 | 地图 | 热点 | 六热点+家长 | Pass |  |
| B2 | 地图 | 家长 | /parent | Pass |  |
| C1 | 五关 | M1 | 可玩连击 | Pass | 答3连击1 |
| C2 | 五关 | M2 | 3+2 | Pass |  |
| C3 | 五关 | M4 | 90s塔 | Pass | 答42 确认timer |
| C4 | 五关 | E1 | 听音 | Pass |  |
| C5 | 五关 | E3 | 配对 | Pass |  |
| C6 | 五关 | 掉落 | 进背包 | Blocked | 未观察 |
| D1 | 组队 | 建房 | 4位码 | Pass | A486 |
| D2 | 组队 | 加入 | 入座 | Blocked | 快修后复测 |
| D3 | 组队 | 开局 | T1 | Blocked | 快修后复测 |
| D4 | 组队 | 错family | WRONG_FAMILY | Pass | API |
| D5 | 组队 | 错码 | ROOM_NOT_FOUND | Pass | API |
| D6 | 组队 | 重连 | sync | Blocked | 未测 |
| E1 | 工坊 | 模板 | 三模板 | Pass |  |
| E2 | 工坊 | 试玩 | 可玩 | Fail | P1卡死90s |
| E3 | 工坊 | 上地图 | 工坊谷 | Pass | 保存成功+放到地图啦 |
| E4 | 工坊 | API | offline | Pass | API |
| F1 | 背包 | 库存 | 贴纸 | Pass |  |
| F2 | 背包 | 送礼 | 转移 | Pass | 骨头到孟赢 |
| F3 | 背包 | 喂果冻 | 反应 | Pass | 开心摇尾巴 |
| F4 | 背包 | API | offline | Pass | API |
| G1 | 排行 | /rank | 温和周榜 | Pass | 没有输赢只有一起成长 |
| G2 | 排行 | API | offline | Pass | API |
| H1 | 家长PIN | 首次设PIN | 保存进入 | Pass | 1234/1234成功 |
| H2 | 家长PIN | 总览 | 三孩 | Pass |  |
| H3 | 家长PIN | 错PIN 9999 | 不正确并锁定 | Pass | PIN不正确再试一次 |
| H4 | 家长PIN | 清数据 | 重设 | Blocked | 未测 |
| S1 | Server | health | ok | Pass |  |
| S2 | Server | SPA | 200 | Pass |  |

## 2. P0 / P1

### P0
无

### P1
1. 工坊试玩卡死浏览器约90s。复现: /workshop 寻宝门 试玩。需重启。下一构建必修。
2. ParentService.verifyPin 明文比 parentPinHash (parent.service.ts)。开 Postgres 前必修。

## 3. 回归建议（快修后）
1. 双浏览器组队 D2/D3
2. 工坊试玩稳定性 E2 优先
3. 家长错PIN抽测 + 清数据 H4
4. 结算贴纸掉落 C6
5. verifyPin 回归单测

## 4. 一句话
单人主链路+工坊上地图+家长错PIN可验收；试玩Hang与verifyPin为P1；双人全流程待快修后复测。

