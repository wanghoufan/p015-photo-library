# HANDOFF｜OBS-3查因修复代码交付（2026-09-10）

> V1 字段已废弃，不填。

- Captured at（YYYY-MM-DD HH:MM）：2026-09-10（UTC 09-10，北京时间同日）
- Stage ID（本阶段叫什么）：OBS-3查因修复代码链（builder→review→qa走读→supervisor）
- 剩 P0（没完的才列，多一条都不行）：无
- 当前 Task（正干到哪）：OBS-3代码交付完成，真机转正待补。builder改src/lib/sync.ts 5处（outboxRank分级排序、processOutbox改排序、work删除wfv→media+owner scoping+错误直抛、postgrestError带码、lastErrorMessage带码截断500字）；根因randomUUID主键+同毫秒tie致首跑撞FK/缺行、重试自愈；lint PASS、ts-check零错（builder自报，review/supervisor走读采信未重跑）。
- 未闭环评审意见（code-reviewer/qa 留的还没改的）：review P2/P3共7条backlog（localeCompare、update秩、无??99兜底、pull/upload 6+1处未带码、owner不对称、idb注释、Storage孤儿，判不拦本轮）；qa遗留真机4项待补（删除一轮即清、失败带码、封面回填回归、批量+分面首跑）+P2-B4；OBS-3本体不关闭。
- docs 落盘清单（本轮新增/改了哪几个 docs 文件）：src/lib/sync.ts（业务）；docs/review/CODE_REVIEW_OBS-3.md（新增）；docs/qa/BUGS_OBS-3.md（新增）；docs/model/TASK-MODEL-LOG.jsonl（删示例行，追加OBS-3一行）；本文件（新增）。
- 下一步（Next Single Action）：派真机4项补测（qa文件§①-④复现步骤：新建1件非demo→删→一轮pending=0；强制失败看[码]；新建带封面rev递增；批量2-3图首轮pending=0），通过后关OBS-3。跳步合规记录：跳planner/product（单文件定向查因，HANDOFF已有假设验收），code-reviewer+qa+supervisor未跳。
- 人要拍什么板（列出来问，不问不许开工）：① 真机补测谁来做（你人肉点还是另派外部通道，含OAuth/云端数据纪律确认）；② P2-B4（pull/upload带码统一）是否并入下阶段还是继续backlog；③ 账本PASS口径确认（本行PASS仅指代码交付，OBS-3转正另起任务记账）。
- 收尾记一笔（neat-freak：文档对齐了没、临时文件清了没、未决列完没）：本次未派经验/neat-freak（非收尾）；HANDOFF主文件§2 OBS-3状态待真机后统一更新；无临时文件新增。

## 恢复读盘（全体系唯一顺序，别乱）

1. AGENTS；2. 角色卡；3. 根 `USER_MODEL_OVERRIDE.md`；4. 本 HANDOFF；5. 根 `经验一句话.md`；6. 任务目标放最后。
冲突才扩大读。

## 派工口令补记（2026-09-10，用户要求落盘）
- 依据：根 `USER_MODEL_OVERRIDE.md`（派前已读，精确ID）。
- builder→`opencode-go/muse-spark-1.3-contributor`：OBS-3查因修复（src/lib/sync.ts 5处）+ OBS-3真机补测；轻量备份恢复演练（含重跑）+巡检首次执行同模型。
- code-reviewer→`opencode-go/glm-5.3-flash`：OBS-3查因复核（docs/review/CODE_REVIEW_OBS-3.md）+收口审查（docs/review/CODE_REVIEW_CLOSURE-20260910.md）。
- qa→`opencode-free/mimo-v2.5-free`：OBS-3走读验证（docs/qa/BUGS_OBS-3.md）+ OBS-3真机4项（docs/qa/BUGS_OBS-3-REALDEVICE-20260910.md）+ L3/L4/M2-3真机收尾。
- supervisor→`opencode-go/muse-spark-1.3-contributor`：复检+账本校验（本轮补记）。
- 顺序：builder写→code-reviewer复核→qa测→supervisor复检→编排者收齐；跳planner/product（单文件定向查因），code-reviewer+qa+supervisor未跳。
