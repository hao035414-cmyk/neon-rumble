# NEON RUMBLE v2.0 实施与验证报告

日期：2026-10-20 · 范围：neon-rumble/ · 对照：docs/PRD-v2.0.md

## 1. 交付内容

| 模块 | 状态 |
| --- | --- |
| 6 名角色（KAI / RIN / VOLT / NOVA / SABER / ECHO） | 完成 |
| U 远程系统（含空中、单发限制、不可自接） | 完成 |
| 角色差异化（每人 U + S + 超杀） | 完成 |
| 选人页（6 格 + RANDOM、数值条、镜像配色、30 秒超时） | 完成 |
| 选图页（5 图 + RANDOM、败者选图、15 秒超时） | 完成 |
| VS 演出 | 完成 |
| 5 张地图（霓虹 / 沙漠 / 雪山 / 草原 / 雨天） | 完成 |
| 5 首地图 BGM + 菜单曲（WebAudio 合成，无音频文件） | 完成 |
| RIN 专属超杀（苦无风暴 3 发扇形） | 完成 |

## 2. 验证结果

### 2.1 自动化测试

- test/sim.test.mjs：30 组（帧差、反无限连、U 系统、空中 U、投技/拆投、相杀、回合上限、六角色专项）
- test/audio.test.mjs：曲库校验
- test/select.test.mjs：选人/选图状态机（锁定、超时、取消、CPU、镜像、败者选图）
- test/stages.test.mjs：5 地图与 5 BGM 映射
- 全部通过（node 24.22.0）。

### 2.2 平衡矩阵（node tools/matchups.mjs 100，30 组对阵 × 100 局）

总体胜率：

| 角色 | 胜率 |
| --- | --- |
| KAI | 60.9% |
| VOLT | 57.1% |
| SABER | 52.8% |
| RIN | 45.6% |
| NOVA | 43.0% |
| ECHO | 40.6% |

单对最差：RIN vs VOLT 29%；最好：KAI vs ECHO 70%。
最长连段 5 段，平均对局 87 秒。

**结论：未达到 PRD 要求的「任意两角色 45%–55%」。** 目前只有 SABER/RIN/NOVA 接近，KAI、VOLT 偏强，ECHO 偏弱，RIN 对 VOLT 明显吃亏。

### 2.3 浏览器冒烟

- 选人、选图、VS、5 张地图均截图成功，控制台无 ERROR 覆盖层。
- 截图：docs/shot-select.png、shot-stage.png、shot-vs.png、shot-desert.png、shot-snow.png、shot-grass.png、shot-rain.png。

### 2.4 性能

- 10000 帧逻辑（双 AI）约 22ms，远低于 16.7ms/帧预算。

## 3. 已知问题

1. **平衡未达标**：AI 对局代理下 KAI/VOLT 偏强、ECHO 偏弱；需要在真人试玩后继续调帧表与 AI。
2. **AI 不会主动用近身 S**：为避免反转技刷屏，AI 只在远程用投射类 S；这会让 KAI 的升龙、VOLT 的指令投、ECHO 的放置球在 AI 对局中利用率低，矩阵低估这些角色的真实强度。
3. **RIN 超杀**为 3 发扇形苦无，符合 PRD 的「多段」方向，但不是逐段演出。
4. 未部署到 GitHub Pages（无仓库写权限），本地可直接运行。
5. 未做真人手感测试与训练模式。

## 4. 如何运行

    cd neon-rumble
    python -m http.server 8080
    # 打开 http://127.0.0.1:8080

标题 Enter = 1P，2 = 本地双人；选人 J 确认，K 返回；选图 J 确认。

## 5. 下一步建议

1. 用真人试玩校准 2–3 组最差对局（RIN/VOLT、KAI/ECHO、NOVA/所有人）。
2. 让 AI 学会近身 S（升龙/指令投/放置），再跑矩阵，可信度更高。
3. 再决定是否回调 PRD 的 45–55 门槛，或把「AI 对局」改成「真人胜率」口径。
