# Gemini 3 Integration Notes

## 1) Model-in-the-loop（强化为“改系统行为”）

**现在**

- Gemini 输出 explanation（解释文本）

**建议升级为**

- Gemini 的输出会改变系统行为（权重/约束/动作），系统据此重新计算

**示例**

- Gemini 判断：closing soon 风险极高
- 系统动作：提高 closing-time penalty → 重新排序 → 重新计算 ETA

这类形态可以称为 **AI-in-the-control-loop**（评审很吃这一点）。

## 2) Multi-step chained reasoning（链式调用，而非一次 prompt）

**从**

- System → Gemini → UI

**升级为**

1. Gemini Step 1：约束归一化（Normalize constraints）
2. Gemini Step 2：冲突识别（Detect conflicts）
3. Gemini Step 3：决策建议（Decide actions）

每一步都应有：

- 独立 schema
- 独立目标
- 独立输出（可被系统消费）

## 3) Structured decision schema（输出动作，不是文本）

将输出定义为“可执行动作列表”，系统可以直接 apply：

```json
{
  "actions": [
    {
      "type": "reorder",
      "target": "Tokyo Tower",
      "priority": "high"
    },
    {
      "type": "reduce_stay",
      "minutes": 20
    }
  ]
}
```

评审看到会立刻理解：这更像 agent，而不是聊天。

## 4) Constraint ranking（让 Gemini 给约束排权重）

让 Gemini 输出约束优先级（用于动态调整 penalty 权重）：

```json
{
  "constraint_priority": ["closing_time", "weather", "travel_time"]
}
```

优势：用 AI 解决“规则无法写死”的取舍问题。

## 5) Counterfactual reasoning（What-if / 反事实推理）

让 Gemini 分析：

- “如果提前 1 小时出发，哪些问题会消失？”

输出可以是：哪些冲突消失 + 哪些动作最小。

## 6) Uncertainty awareness（不确定性显式建模）

让 Gemini 标注不确定性与原因，UI 可提示风险：

```json
{
  "confidence": "low",
  "uncertainty_reason": "opening hours ambiguous"
}
```

## 7) Natural-language → structured constraints（语义转系统参数）

示例输入：

- “想轻松一点，不想走太多路。”

示例输出：

```json
{
  "preferences": {
    "walking_limit_minutes": 20,
    "pace": "relaxed"
  }
}
```

核心定位：不是聊天，而是“语义 → 系统参数”的转译。

## 8) Multimodal reasoning（可选）

- 例如：用户给一张地图截图，Gemini 提取地点名称
- 效果酷但风险/不确定性更高，不是必须项

---

## 最推荐的三件事（时间有限优先做）

1. Multi-step（Normalize → Detect → Decide）
2. Action-based decision schema（输出可执行动作）
3. Model-in-the-loop（系统执行动作并重新计算）

## 升级后的完整流程（示意）

Deterministic Engine
→ Constraint Snapshot
→ Gemini Step 1: Normalize
→ Gemini Step 2: Detect conflicts
→ Gemini Step 3: Decide actions
→ System executes actions
→ Final itinerary
