# Devpost Submission (Draft)

## 200-word project summary

TripPilot Orpin is a web-based trip planning app that turns messy travel intent into a feasible, time-aware itinerary. Planning a multi-stop day sounds simple until real-world constraints break the plan: opening hours, travel time between stops, limited daylight, and recommended stay durations. TripPilot Orpin combines a deterministic feasibility engine with Gemini 3 to help users move from “a list of places” to a plan that can actually work.

Users pick destinations, the app computes route legs and evaluates timing feasibility, then surfaces issues like “arrives after closing” or “not enough time to visit everything.” When conflicts are detected, Gemini proposes structured edits (not just chat) such as reordering stops, reducing stay time at a specific place, or starting earlier. If Gemini suggests a reorder that changes the itinerary, the app applies it and recalculates routes to show an improved plan.

The result is a planning assistant that doesn’t stop at advice—it generates actionable changes and re-runs the numbers. It’s built with Vite + React + TypeScript, with optional Firebase login/cloud sync. For secure deployment, Gemini calls can be routed through a server-side proxy so API keys aren’t exposed in the browser.

## 100-word: how the Gemini 3 API is used

Gemini 3 is used as a structured decision service inside a multi-step pipeline. The app first builds a constraint snapshot of the itinerary (places, locations, opening hours, recommended stay, and feasibility signals) and normalizes it into stable JSON. Gemini is called to (1) detect conflicts and risky stops and (2) decide structured actions. Prompts require “JSON only” output and the app validates/coerces the response into typed shapes. Actions include `reorder` (a new placeId order), `reduce_stay`, and `start_earlier`. When `reorder` is suggested, the app applies it and recalculates route legs to verify feasibility improvements. In production, calls can go through `/api/gemini` to keep keys server-side.

## Key features

- Business-hours and travel-time feasibility checks
- Gemini-generated JSON actions (reorder / reduce stay / start earlier)
- Automatic route recomputation after applying AI actions
- Optional Firebase login + saved trips/community sharing
- Production-safe Gemini proxy to avoid client key exposure
- Optional audio input support via multimodal `inlineData` (speech-to-text)

## Innovation

- Not a prompt wrapper: Gemini outputs executable, structured itinerary edits
- Closed-loop planning: AI suggestion → apply change → recompute → compare outcomes
- Constraint-first prompting: the model reasons over a normalized snapshot for stability
