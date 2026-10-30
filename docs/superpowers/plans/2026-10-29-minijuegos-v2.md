# Minijuegos v2 Implementation Plan

> **For agentic workers:** Implement end-to-end; prefer working software over process ceremony.

**Goal:** Replace quiz/odd with draw, tongue, dash, rhythm (Phi-mini); owner-only; client validation; cancel on hide.

**Files:**
- `supabase/migration_v4_minigames_v2.sql` — mini_start kinds, mini_answer=`win`, mini_cancel
- `src/main/resources/static/js/minigames.js` — full rewrite
- `src/main/resources/static/js/multiplayer.js` — `cancelMini`
- `src/main/resources/static/css/styles.css` — mini UI
- `src/main/resources/static/js/app.js` — only if wiring needed

**Tasks:** 1) SQL 2) minigames.js 3) CSS+MP 4) apply migration + smoke check
