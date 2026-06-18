# Session Work Log

> Auto-generated. Format: next-milestone skill convention.
> For milestone wrap-ups: /next-milestone


---

## 2026-06-07 04:34 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
f2278ca docs: design spec — file sort, TOC tree, auto-update fix, virtual grouping
```

---

## 2026-06-07 04:46 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
2f3cf2e feat: file-tree sort + virtual grouping, TOC tree view, auto-update fix
f2278ca docs: design spec — file sort, TOC tree, auto-update fix, virtual grouping
```

---

## 2026-06-07 04:52 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
2f3cf2e feat: file-tree sort + virtual grouping, TOC tree view, auto-update fix
f2278ca docs: design spec — file sort, TOC tree, auto-update fix, virtual grouping
```

---

## 2026-06-07 11:45 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
2f3cf2e feat: file-tree sort + virtual grouping, TOC tree view, auto-update fix
f2278ca docs: design spec — file sort, TOC tree, auto-update fix, virtual grouping
```

---

## 2026-06-07 12:15 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
126704d fix: decouple document viewer from file-tree scan
2f3cf2e feat: file-tree sort + virtual grouping, TOC tree view, auto-update fix
f2278ca docs: design spec — file sort, TOC tree, auto-update fix, virtual grouping
```

---

## 2026-06-07 12:44 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
c9f6987 chore: release v1.2.0 — sort, virtual grouping, TOC tree, viewer decouple
126704d fix: decouple document viewer from file-tree scan
2f3cf2e feat: file-tree sort + virtual grouping, TOC tree view, auto-update fix
```

## 2026-06-09 — virtual grouping rule + version display + Claude/Codex themes

- **Virtual grouping**: date grouping now triggers on *format* not value. When 2+ dated files share a directory, every distinct date becomes its own group — singletons included. Lone dated file (sole match) stays loose. `src/renderer/src/utils/groupTree.ts`, test added.
- **Settings version**: added `GET_APP_VERSION` IPC (main `app.getVersion()`) → preload → SettingsPanel shows "현재 버전 vX.Y.Z" + "최신 버전 vN 사용 가능" from `update-available` info.
- **Themes**: ported AN-PIP Claude (warm cream/coral) + Codex (near-black/teal) palettes into Catppuccin token vars. `index.css` `.theme-claude`/`.theme-codex`, `Theme` union widened (uiStore, App, preload, api.d.ts, window.ts THEME_OVERLAY), SettingsPanel theme list.
- typecheck clean, 133 unit tests pass.

---

## 2026-06-09 20:21 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 20:25 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 20:29 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 20:33 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 20:49 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
75650ea fix(ci): upload latest*.yml + blockmaps so auto-updater has a manifest
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 20:54 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
75650ea fix(ci): upload latest*.yml + blockmaps so auto-updater has a manifest
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 20:58 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
75650ea fix(ci): upload latest*.yml + blockmaps so auto-updater has a manifest
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 21:02 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
75650ea fix(ci): upload latest*.yml + blockmaps so auto-updater has a manifest
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 21:05 — Markdown-Organizer

**Session:** `a6dada60-c7bd-4432-83a5-d8332380a5ef`

**Commits (last 8h):**
```
75650ea fix(ci): upload latest*.yml + blockmaps so auto-updater has a manifest
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-09 21:08 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
75650ea fix(ci): upload latest*.yml + blockmaps so auto-updater has a manifest
4c5d8c4 feat: format-based virtual grouping, version display, Claude/Codex themes
```

---

## 2026-06-12 22:57 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
97a2159 fix: search jump no longer clobbered by saved scroll restore — v1.2.2
```

---

## 2026-06-12 23:12 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
97a2159 fix: search jump no longer clobbered by saved scroll restore — v1.2.2
```

---

## 2026-06-13 23:04 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
f183680 feat: nested year/month/day virtual grouping + fix auto-update 404 — v1.2.3
```

---

## 2026-06-13 23:14 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
f183680 feat: nested year/month/day virtual grouping + fix auto-update 404 — v1.2.3
```

---

## 2026-06-13 23:40 — Markdown-Organizer

**Session:** `unknown`

**Commits (last 8h):**
```
f183680 feat: nested year/month/day virtual grouping + fix auto-update 404 — v1.2.3
```
