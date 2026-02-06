# TripPilot Orpin – Gemini 3 API 导向版技术说明文档

## 1. 当前阶段目标（Goal）

🎯 本阶段要解决的核心问题：

> 用户在一天的行程中，是否真的来得及完成所有计划？

TripPilot Orpin 并不是生成一份“看起来合理”的行程，而是：在真实世界复杂约束下，让 AI 参与决策。

系统需要在以下真实世界信号中进行推理：

- 交通方式（Transit / Walking / Driving）
- 实际通行耗时（Directions）
- 营业时间（结构化 + 非结构化文本）
- 天气条件
- 人类行程的不确定性

并最终回答：

- ✅ 是否可行
- ⚠️ 问题出现在哪里
- 🔧 如何以最小代价修正计划

## 2. 本阶段成功标准（Success Criteria）

本阶段完成后，应满足：

- 至少一个城市场景可以完整 demo
- 行程可自动排序（基于真实交通耗时）
- 能识别“即将关门 / 来不及”的地点
- 能输出结构化 AI 推理结果（非自然语言）
- 能清晰展示 Gemini 的决策依据
- Demo 全流程可稳定跑通一次

## 3. 交付物（Deliverables）

### 📦 必须交付（Must Have）

- Transit / Walking / Driving 路线耗时可获取
- 行程顺序自动优化（确定性算法）
- 营业时间可达性判断（确定性规则）
- 到达 / 离开时间估算
- 行程整体风险提示

### ⭐ Gemini 3 API 核心交付（重点）

- Gemini 作为 Reasoning Engine（推理引擎）
- 使用 **结构化输入 + 结构化输出（JSON Schema）**
- Gemini 输出必须用于：
  - 决策判断
  - 风险归因
  - 修正方案选择

**严禁** 仅用于生成自然语言文案。

### ✨ 有时间再做（Nice to Have）

- What-if 场景分析（反事实推理）
- Closing-soon 权重自适应（Gemini 判断）
- 室内备选推荐（天气语义理解）
- 多语言营业时间语义统一

### ❌ 本阶段不做（Out of Scope）

- 精确票价 / 餐厅价格金额
- 最便宜 / 最快 / 最舒适 多路线分类
- 实时交通延误
- Chat UI 型对话机器人
- 单纯文本 prompt 调用

## 4. 功能优先级说明（Scope Control）

| 优先级 | 含义               |
| ------ | ------------------ |
| P0     | Demo 不可缺少      |
| P1     | 有时间锦上添花     |
| P2     | 明确不做，避免返工 |

⚠️ 若某功能无法体现 Gemini 推理价值，则优先级自动降低。

## 5. 核心逻辑流程（Logic Flow）

🧭 系统级流程（Model-in-the-loop）：

```text
用户输入
	↓
系统确定性计算（地图 / 时间 / 规则）
	↓
结构化约束数据生成
	↓
Gemini 3 API（推理）
	↓
结构化决策输出
	↓
系统根据 AI 决策重新计算
	↓
最终行程 + 可解释结果展示
```

## 6. 路线优化逻辑（职责划分）

### 系统负责（Deterministic）

- 路线耗时计算
- 到达 / 离开时间推演
- 营业时间解析
- 基础贪心排序

### Gemini 3 负责（Probabilistic Reasoning）

- 哪个约束更重要
- 哪个地点风险最高
- 哪个调整代价最低
- 哪些问题无法通过规则判断

## 7. Gemini 3 API 使用方式（⭐评审重点）

- ❗ Gemini 不作为文本生成器
- ✅ Gemini 作为系统决策引擎

### Gemini 输入（结构化约束上下文）

```json
{
  "task": "analyze_itinerary_feasibility",
  "context": {
    "start_time": "09:30",
    "transport_mode": "transit",
    "weather": "rain"
  },
  "stops": [
    {
      "name": "Tokyo Tower",
      "arrival_time": "19:40",
      "close_time": "20:00",
      "stay_minutes": 60,
      "travel_time_from_prev": 35
    }
  ]
}
```

### Gemini 输出（结构化决策结果）

```json
{
  "risk_level": "high",
  "reasoning": ["Arrival is too close to closing time", "No buffer for delays"],
  "at_risk_stops": [
    {
      "name": "Tokyo Tower",
      "cause": "closing_soon"
    }
  ],
  "suggested_actions": [
    {
      "type": "reorder",
      "target": "Tokyo Tower",
      "benefit": "avoid early closure"
    }
  ]
}
```

### Gemini 调用特征（建议明确写进 README）

- ✅ JSON Schema Output
- ✅ Multi-step reasoning
- ✅ Function-style decision output
- ✅ Model-in-the-loop architecture
- ✅ Explainable AI reasoning

## 8. 验收标准（Definition of Done）

- [ ] Gemini 输出为结构化 JSON（非文本）
- [ ] AI 输出结果真实影响系统决策
- [ ] 推理结果可在 UI 中逐条展示
- [ ] Gemini 不可被替换为 if/else
- [ ] Demo 视频中能明确指出：“这是 Gemini 做出的判断。”

## 9. 当前 Demo 固定场景

- 城市：Tokyo
- 日期：2026-02-15
- 出发时间：09:30
- 地点数：4–5
- 交通方式：Transit

该场景作为：Gemini 推理能力的最小可验证单元（MVU）。

## 10. 团队协作共识（极重要）

不做：

- ❌ 不做 ChatBot
- ❌ 不展示 prompt
- ❌ 不展示模型输出原文

我们只展示三件事：

- ✅ 输入给 Gemini 的结构化现实约束
- ✅ Gemini 输出的结构化决策
- ✅ 这些决策如何改变系统行为

## ✅ 最终一句话（评审记得住的）

> 我们不是让 Gemini 生成旅行计划。
> 我们让 Gemini 在真实世界约束中参与决策。
