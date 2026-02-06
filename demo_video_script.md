# TripPilot × Gemini 3 Hackathon — 3-Minute Demo Script

> **目标**：3分钟内展示 TripPilot 如何用 Gemini 3 实现“现实可行”的智能旅行规划。
> **主线**：用户输入（语音/文本）→ 检查约束 → Gemini 3 检测与推理 → 自动修正 → 一键导出。

---

## 🎬 0:00 - 0:20｜开场 & 痛点直击

**画面**：

- TripPilot 首页 Logo，快速切换到一张 Google 地图，标出多个景点。

**旁白**：
“Planning a trip looks easy, but real-world constraints—like opening hours and travel time—make it hard to get right.”
“Meet TripPilot, powered by Gemini 3. Let’s see how it makes travel planning truly smart.”

---

## 🎬 0:20 - 0:50｜Step 1: 语音/文本输入 & 结构化理解

**画面**：

- 展示“Chat/Plan”输入区，用户长按麦克风（或粘贴文本）。
- 语音输入：“I want to visit the Colosseum, Trevi Fountain, Piazza Navona, and the Pantheon today.”
- Gemini 3 解析为地点卡片，自动识别地标。
- 用户点击“+”添加全部景点。

**旁白**：
“Just speak or paste your travel ideas. Gemini 3’s multimodal NLU instantly turns messy input into real, clickable places.”

---

## 🎬 0:50 - 1:20｜Step 2: 现实约束检测 & 冲突制造

**画面**：

- 用户手动拖动“Pantheon”到行程最后。
- 点击“Recompute”。
- 时间轴出现红色警告：“Pantheon will be closed.”

**旁白**：
“Let’s break the plan: move the Pantheon to the end. The app checks opening hours and travel time—red warnings show up. This plan won’t work.”

---

## 🎬 1:20 - 1:50｜Step 3: Gemini 3 推理 & 自动修正

**画面**：

- 点击“Recompute”或自动触发。
- 屏幕浮现 Gemini 3 的 JSON 推理结果（代码叠加）：
  ```json
  {
    "thought": "Pantheon closes at 19:00, arriving at 20:00 is invalid. Move to morning.",
    "action": "reorder"
  }
  ```
- 行程顺序自动调整，Pantheon 移到上午。
- 顶部绿色 Banner：“Order auto-optimized”。
- 时间轴变绿。

**旁白**：
“TripPilot sends a full constraint snapshot to Gemini 3. Instead of chat, Gemini returns structured JSON—detecting the conflict and suggesting a fix. The app auto-applies the solution.”

---

## 🎬 1:50 - 2:20｜Step 4: 结果对比 & 体验提升

**画面**：

- 鼠标悬停“vs previous run”，显示节省时间。
- 展示所有景点都在开放时间内。
- 用户点击“Detail”查看修正前后对比。

**旁白**：
“Now, the plan is feasible. No more closed doors or impossible schedules. Gemini 3 turns impossible into possible—in seconds.”

---

## 🎬 2:20 - 2:50｜Step 5: 一键导出 & Google 集成

**画面**：

- 点击“Share”→“Open in Google Maps”。
- 新标签页打开 Google Maps 路线。
- 点击“Add to Google Calendar”，日历事件自动生成。

**旁白**：
“Ready to go? Export your plan to Google Maps for navigation, or add it to your Calendar with one click.”

---

## 🎬 2:50 - 3:00｜结尾 & 技术亮点

**画面**：

- 快速展示架构图、Gemini 3 Hackathon Logo。

**旁白**：
“TripPilot: Built with React, Vite, and Gemini 3. Smart, constraint-aware planning—ready for real travel. Thank you!”

---

## 💡 录制建议

- 保持节奏紧凑，突出 Gemini 3 的结构化推理和自动修正。
- 重点展示“红色警告→Gemini JSON→绿色修正”完整闭环。
- 导出功能和 Google 集成要有实际操作画面。
