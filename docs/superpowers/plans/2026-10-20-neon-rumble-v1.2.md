# NEON RUMBLE v1.2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans。步骤用 `- [ ]` 跟踪。
> 本仓库没有 git（沙箱无 git 二进制），"提交"步骤以"写入快照文件"替代。

**Goal:** 按 v1.2 设计重做帧数据、连招与攻防系统，消除无限连，并用自动化测试+平衡脚本证明。

**Architecture:** 逻辑全部留在 DOM-free 的 `src/{config,fighter,engine,input,ai}.js`，渲染单独在 `src/render.js`；测试用 Node 直接驱动 Engine。

**Tech Stack:** 原生 ES modules、HTML5 Canvas、Node 24 test 脚本（无依赖）。

**Spec:** `docs/superpowers/specs/2026-10-20-neon-rumble-v1.2-design.md`

## Global Constraints

- 零 runtime 依赖，`package.json` 的 `dependencies` 保持不存在。
- 60fps 逻辑不变：所有新状态按帧推进，不引入 setTimeout/Date。
- 帧差必须与设计表一致：lp +2/0、hp +1/−5、low 0/−5、kick 击倒/−4、overhead +1/−6。
- 单套连段 ≤ 6 段、≤ 45% 满血；CI 必须断言。
- 控制代码增量：`engine.js` +200 行以内。

## Review Focus

1. 墙角 60 秒轻拳压制不能击杀（最长连段 ≤ 6）。
2. 投技不能无条件吃满伤害：8 帧内轻+重可拆。
3. 升龙 1–8 帧无敌，但被防 −22 必须能确反。
4. 取消只能在命中/防御后，空挥不能取消。
5. 平局第 5 回合必须结束对局，不能无限打。

---

### Task 1: 帧表与新招式数据
**Files:** Modify `src/config.js`
**Interfaces:** Produces: `MOVES.{lp,hp,kick,low,jumpAtk,overhead,launch,throw,dp,special,super}`，每个含 startup/active/recovery/damage/hitstun/blockstun；`MAX_ROUNDS=5`。
- [ ] Step 1: 用探针记录旧帧差（+4/−2/−3）作为回归基线
- [ ] Step 2: 写测试 `frameAdvantage(lp) === 2` 等 5 条，先失败
- [ ] Step 3: 改表
- [ ] Step 4: 测试通过

### Task 2: Fighter 状态机
**Files:** Modify `src/fighter.js`
**Interfaces:** Produces: `startMove` 支持 throw/launch/dp/overhead；`onHit(move, dmg, opts)` 支持浮空；`canCancel()`、`confirmHit()`；dash/backdash 状态。
- [ ] Step 1: 测试：浮空后对手 airborne；冲刺位移 120±10；升龙第 1–8 帧 invuln>0
- [ ] Step 2: 实现
- [ ] Step 3: 测试通过

### Task 3: Engine 结算
**Files:** Modify `src/engine.js`
**Interfaces:** Produces: `damageScale`（第 0 段 1.0，每段 −0.09，地板 0.30）、`hitstunScale`（每段 −0.12，地板 0.55）、`pushScale`、取消窗口、投技/拆投、投射物相杀、`MAX_ROUNDS` 平局。
- [ ] Step 1: 测试：同一套连段第 4 段 hitstun < 第 1 段；投射物相杀后数组为空；第 5 回合平局进入 matchOver
- [ ] Step 2: 实现
- [ ] Step 3: 测试通过

### Task 4: 输入
**Files:** Modify `src/input.js`
**Interfaces:** Produces: `input.{special,super,dp,tech,dashF,dashB}`；攻击 6 帧缓冲；DP 优先级高于 QCF；双击方向 12 帧。
- [ ] Step 1: 测试：模拟 f→d→df+heavy 得到 dp=true；1、2、3 帧内重按方向得到 dashF
- [ ] Step 2: 实现
- [ ] Step 3: 测试通过

### Task 5: CPU 与角色
**Files:** Modify `src/ai.js`、`src/config.js`
**Interfaces:** Produces: `new AI({difficulty})` 内部 `delay = 12/8/5`；确反/拆投/升龙行为；角色 KAI/RIN 数值差异。
- [ ] Step 1: 测试：AI 在对手起手第 1 帧不可能防御（延迟 > 0）；200 局镜像胜率 45–55%
- [ ] Step 2: 实现 + `tools/balance.mjs`
- [ ] Step 3: 数据达标

### Task 6: 渲染、PRD 与报告
**Files:** Modify `src/render.js`、`src/main.js`；Create `docs/PRD-v1.2.md`、`docs/PRD-v1.2-评审修订版.docx`、`REPORT-v1.2.md`
- [ ] Step 1: 新招式姿势 + 连段计数 HUD + DRAW
- [ ] Step 2: headless Edge 截图验证
- [ ] Step 3: PRD v1.2 与实测报告
