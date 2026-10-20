# NEON RUMBLE v2.0 实施计划

> **For agentic workers:** 逐任务执行，TDD。仓库无 git，提交步骤以写入快照替代。

**Goal:** 按 PRD v2.0 交付 6 角色、U 远程系统、选人/选图、5 地图与每图 BGM。
**Architecture:** 数据驱动（角色/招式/地图/BGM 分离），仿真层继续 DOM-free，音频独立于渲染。
**Tech Stack:** 原生 ES modules、Canvas 2D、WebAudio、Node 测试（无依赖）。
**Spec:** docs/PRD-v2.0.md

## Global Constraints

- 零 runtime 依赖；不引入音频/图片文件。
- 60fps；逻辑 10000 帧 < 50ms/角色。
- 每角色 1 个 U + 1 个 S + 1 个超杀；U 空中限一跳一次。
- 任意两角色胜率 45%–55%；无无限连。

## Review Focus

1. U 不能取消成 U，且场上每人最多 1 发。
2. 空中 U 过后该跳不能出空中攻击，落地 4 帧硬直。
3. 地图与 BGM 切换不能出现两个调度器同时响。
4. 选图不改变仿真：状态哈希跨图一致。
5. 音频必须在首次用户交互后才启动。

---

### Task 1: 音频引擎与曲库
**Files:** Create src/audio.js, src/audio-tracks.js; Modify src/main.js, package.json; Test test/audio.test.mjs
**Interfaces:** Produces: AudioEngine.ensure(), playTrack(id), setMuted(bool); TRACKS map.
- [ ] Step 1: 测试曲库数据（bpm、8 小节、和弦、lead 合法）
- [ ] Step 2: 运行测试先失败
- [ ] Step 3: 实现曲库与引擎
- [ ] Step 4: 测试通过；游戏内切换菜单/对局曲

### Task 2: 角色数据与 U/S/超杀
**Files:** Create src/characters.js; Modify src/config.js, src/fighter.js, src/input.js, src/engine.js; Test test/sim.test.mjs
**Interfaces:** Produces: CHARACTERS[id].{u,special,super}; input.u; 每人投射物上限 1。
- [ ] Step 1: 测试 KAI/RIN 的 U、空中 U、U 不可自接
- [ ] Step 2: 实现
- [ ] Step 3: 测试通过

### Task 3: 新角色 4 名
**Files:** Modify src/characters.js, src/fighter.js, src/engine.js, src/ai.js
- [ ] Step 1: 每人数据校验测试
- [ ] Step 2: 实装 VOLT/NOVA/SABER/ECHO
- [ ] Step 3: 每角色 AI 对局冒烟

### Task 4: 选人/选图页面
**Files:** Create src/select.js, src/render-select.js; Modify src/main.js, src/input.js
- [ ] Step 1: 状态机测试（锁定、超时、取消、镜像）
- [ ] Step 2: 实装页面与 VS
- [ ] Step 3: 3 键内开局

### Task 5: 地图 4 张
**Files:** Create src/stages.js; Modify src/render.js, src/config.js
- [ ] Step 1: 5 图状态哈希一致测试
- [ ] Step 2: 绘制沙漠/雪山/草原/雨天
- [ ] Step 3: 截图冒烟

### Task 6: 平衡与发布
**Files:** tools/matchups.mjs; Modify tools/balance.mjs
- [ ] Step 1: 15 组矩阵
- [ ] Step 2: 全部 45–55%
- [ ] Step 3: 截图、README、报告
