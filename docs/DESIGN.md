# Design System — Markdown Organizer

## Product Context
- **What this is:** macOS Electron desktop app for browsing, reading, and managing AI-generated Markdown documents across multiple projects.
- **Who it's for:** Developers who use LLMs (ChatGPT, Claude, Gemini) daily and need to organize the output.
- **Space/industry:** Developer productivity tools / AI document management.
- **Project type:** Desktop app — 4-column layout optimized for long-form reading and fast navigation.
- **Memorable thing:** "Fast navigation of AI-generated markdown across multiple projects — a serious tool for serious developers."

---

## Aesthetic Direction
- **Direction:** Industrial Reading Terminal
- **Decoration level:** Zero — no illustrations, gradients, background patterns, or decorative elements. Catppuccin Mocha's subtle hue variation handles all surface distinction.
- **Mood:** A research terminal that respects the work inside it. Every element earns its place. The content IS the design.
- **Thesis:** This tool is quiet enough that the AI-generated writing can be heard.

---

## Typography

Three-font system. Each font has a single responsibility.

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| UI / Chrome | **Geist** | 400, 500, 600 | ActivityBar, FileTree labels, buttons, panel headers, metadata. Developer-tool neutral. |
| Document Body | **Literata** (variable) | 400, 500 | All prose in the document viewer. opsz 7–72 variable. Makes AI-generated content feel like writing worth reading, not generated text. |
| Code Blocks | **JetBrains Mono** | 400 | Rendered by Shiki (catppuccin-mocha theme). No changes needed. |

### Font Loading
```bash
npm install @fontsource/geist @fontsource-variable/literata
```

Import in renderer entry point (`src/renderer/src/main.tsx`):
```ts
import '@fontsource/geist'
import '@fontsource-variable/literata'
```

### Scale
| Level | Size | Font | Use |
|-------|------|------|-----|
| H1 | 26px / 1.3 | Literata 500 | Document title |
| H2 | 20px / 1.4 | Literata 500 | Section headings |
| H3 | 16px / 1.5 | Literata 500 | Subsections |
| Body | 15px / 1.75 | Literata 400 | Document prose |
| UI text | 13px / 1.5 | Geist 400 | File names, labels, buttons |
| Small / meta | 11–12px | Geist 400 | Timestamps, counts, panel headers |
| Monospace meta | 10–11px | JetBrains Mono 400 | Section labels (uppercase, tracked) |
| Code | 12–13px / 1.7 | JetBrains Mono 400 | Code blocks |

---

## Color

### Approach
Restrained. One accent color — amber. Everything else is Catppuccin Mocha surface variations.

### Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-base` | `#1e1e2e` | Main background |
| `--color-mantle` | `#181825` | ActivityBar, panel headers, code block backgrounds |
| `--color-crust` | `#11111b` | Deepest surfaces |
| `--color-surface0` | `#313244` | Borders, dividers, elevated surfaces |
| `--color-surface1` | `#45475a` | Hover states, secondary borders |
| `--color-overlay0` | `#6c7086` | Disabled text, arrows, secondary UI |
| `--color-text` | `#cdd6f4` | Primary text |
| `--color-subtext0` | `#a6adc8` | Document body text, file names |
| `--color-amber` | `#f5c05a` | **Primary interactive accent.** Active file border, selected TOC item, primary buttons, amber badges. |
| `--color-amber-soft` | `rgba(245,192,90,0.10)` | Active file/TOC item background highlight |

### Semantic (freshness system — unchanged)
| Token | Hex | Usage |
|-------|-----|-------|
| Green | `#a6e3a1` | Fresh docs (< 24h) |
| Yellow | `#f9e2af` | Aging docs (1–7 days) |
| Red | `#f38ba8` | Stale docs (> 7 days) |

### Active Accent — Amber
**Rationale:** Every other markdown viewer uses teal or purple/lavender. Amber is warm against the cool Catppuccin navy, surprising without being jarring, and immediately memorable. The Claude subagent independently proposed it ("amber reads as 'deliberate,' not 'default'").

### Design Decision: Why NOT teal?
Teal (`#94e2d5`) is already in the Catppuccin palette and is what users of the color scheme expect. Keeping amber makes the interactive layer feel designed, not inherited.

---

## Themes

Three themes controlled by a class on the root div: `theme-dark`, `theme-black`, `theme-latte`.

| Theme | Background | Surface | Description |
|-------|-----------|---------|-------------|
| `theme-dark` | `#1e1e2e` | `#181825` | Catppuccin Mocha (default) |
| `theme-black` | `#000000` | `#0a0a0a` | Near-black for OLED / deep dark preference |
| `theme-latte` | `#eff1f5` | `#e6e9ef` | Catppuccin Latte — for bright environments |

Adding `theme-latte` support: add CSS variables for latte colors in `index.css`, update `uiStore` type, update `ThemeToggle` cycle.

---

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — this is long-form reading, not a data dashboard. Don't compress.
- **Document padding:** 32px vertical, 40px horizontal (current `px-8 py-6` → upgrade to `px-10 py-8`)

| Scale | Value |
|-------|-------|
| 2xs | 4px |
| xs | 8px |
| sm | 12px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

---

## Layout
- **Approach:** Grid-disciplined — 4 fixed columns, no creative surprises.
- **Columns:** ActivityBar (48px) | FileTree (220px, resizable) | Document (flex-1) | TOC (200px, resizable)
- **Max content width:** none (full width of Document column)
- **Border radius:** 6px for interactive elements (buttons, file items), 4px for code surfaces, 10px for the app window chrome.

### File Tree — Icon-free
File items in the tree show filename only — no file type icons. Noise removed. The active file is indicated by a 2px amber left border + amber-soft background. Directories show `▶`/`▾` arrows and an md count.

### TOC — Live Reading Anchor
The TOC panel's active heading updates on scroll. Active item: font-weight 500, 2px amber left border, amber-soft background. This makes the TOC feel alive — the developer's eye glances right to orient, never needs to scroll back up.

---

## Motion
- **Approach:** Minimal-functional — transitions only where they aid comprehension.
- **File selection:** Instant (no delay).
- **TOC active update:** Smooth via scroll event, no CSS animation needed.
- **Sidebar resize:** Instant.
- **No entrance animations.** This is a productivity tool, not a marketing site.

---

## Components

### Buttons
```
Primary:   bg-amber text-crust font-geist-500 px-3.5 py-1.5 rounded-md
Secondary: bg-surface0 text-text ...
Ghost:     border border-surface0 text-subtext0 ...
```

### Freshness Badge
```
Fresh:  border-green/30 bg-green/10 text-green font-mono text-xs
Aging:  border-yellow/30 bg-yellow/10 text-yellow font-mono text-xs
Stale:  border-red/30 bg-red/10 text-red font-mono text-xs
```

### Code Block
- Background: `bg-mantle`, border: `border-surface0`, radius: `rounded-lg`
- Copy button: appears on hover, top-right corner
- Font: JetBrains Mono 12px, Shiki catppuccin-mocha theme

---

## Implementation Checklist

- [ ] Install `@fontsource/geist` and `@fontsource-variable/literata`
- [ ] Import fonts in `src/renderer/src/main.tsx`
- [ ] Update `tailwind.config.ts`: add Geist as `fontFamily.sans`, Literata as `fontFamily.serif`, JetBrains Mono as `fontFamily.mono`
- [ ] Update `MarkdownRenderer.tsx`: use `font-serif` (Literata) for `<article>` prose
- [ ] Add `--color-amber` and `--color-amber-soft` CSS variables to `index.css`
- [ ] Update file tree active state: amber left border instead of `bg-surface0`
- [ ] Update TOC active state: amber left border, font-weight 500
- [ ] Add `theme-latte` CSS variables and update `uiStore` + `ThemeToggle`
- [ ] Add amber as Tailwind color in config

---

## Anti-Patterns (never add these)
- Purple/violet gradients
- File type icons in the tree
- Decorative blobs or background illustrations  
- Rounded corners on code blocks larger than 8px
- Entrance animations on file load
- system-ui as the display or body font

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-26 | Amber `#f5c05a` as primary interactive accent | Differentiates from teal/purple category defaults. Claude subagent independently proposed same. "Deliberate, not default." |
| 2026-05-26 | Literata for document body | Long-form reading font — makes AI output feel authored, not generated. Contrasts correctly with JetBrains Mono code. |
| 2026-05-26 | Geist for UI chrome | Developer-tool neutral. Proportions pair well with code blocks. |
| 2026-05-26 | No file icons in tree | Pure text tree is faster to scan. Amber border provides all the affordance needed for active state. |
| 2026-05-26 | Add Catppuccin Latte as third theme | No other markdown viewer in this space has a light mode. Differentiation + bright-room usability. |
| 2026-05-26 | Initial design system created | /design-consultation based on README context + Claude subagent independent proposal. |
