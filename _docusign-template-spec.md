# Docusign Interactive Discovery — Template Design Spec

**Purpose:** Establish a single, brand-true visual system for every interactive discovery asset (banking, insurance, wealth, etc.) so they read as Docusign marketing collateral rather than a collection of independently-styled prototypes.

**Canonical layout:** *linear workflow with click-to-expand nodes* — e.g. `Application → Doc Collection → Underwriting → Approval → Closing → Servicing`. Each node explodes into a side-by-side **current state vs. future state** comparison. Assets land directly on this layout — no landing card, no browser chrome, no scene-by-scene walkthrough.

**Source of truth for color & type:** `auto.html` — we pull the palette, DSIndigo font loads, and Iris logo treatment from it. We do **not** inherit its layout (scene-by-scene demo scenes). That layout is retired for this asset family.

**Source of truth for the canonical file:** `_template.html`. Copy it, rename it, edit the `steps` array, done.

---

## 1. What we have to work with

**Brand assets folder:** `Docusign, Inc-selected-assets/`

- **DSIndigo font family** (Light, Regular, Medium, SemiBold, Bold, LightItalic) in `.woff2 / .woff / .ttf / .otf` — Docusign's proprietary typeface.
- **DS Iris logo** (primary, secondary, both reversed) — the Docusign wordmark with the "starburst" Iris mark on the right.
- **DSIcon favicon set** — light-mode favicon in every common size (16 → 512).
- **`colors/colors.css`** — official palette, mapped to `.bf-background-*` / `.bf-color-*` utility classes.
- **Icon/illustration library** — hundreds of flat PNG/SVG spot illustrations (wallet, warning, video_recorder, window, etc.) suitable for section headers, empty states, and problem-statement graphics.

**Reference Docusign collateral (docusign.com):** confirmed use of the same palette (`#4C00FF`, `#130032`, `#CBC2FF`, `#FF5252`) and the DSIndigo family. `auto.html` is tracking current brand.

---

## 2. Core design tokens

### 2.1 Color palette (authoritative)

Drop these at the top of every discovery file as CSS custom properties. Names match Docusign's internal system.

| Token | Hex | Role |
|---|---|---|
| `--ds-cobalt` | `#4C00FF` | Primary action, primary brand accent |
| `--ds-inkwell` | `#130032` | Primary text, dark UI surfaces |
| `--ds-deep-violet` | `#26065D` | Gradient mid-stop, hover state for Cobalt |
| `--ds-mist` | `#CBC2FF` | Soft accent, selected states, tinted backgrounds |
| `--ds-poppy` | `#FF5252` | "Pain" / current-state accent, gradient warm stop |
| `--ds-ecru` | `#F8F3F0` | Warm off-white for light sections |
| `--ds-white` | `#FFFFFF` | Base surface |

**Usage rules**

- **Cobalt (`#4C00FF`)** is the only primary-button color. Never substitute indigo (`#6366f1`), purple (`#7c66ff`), or any other invented blue-violet.
- **Inkwell (`#130032`)** is the primary text color on light surfaces. Body text uses `rgba(19,0,50,0.65)` for secondary, `rgba(19,0,50,0.45)` for tertiary.
- **Mist** is for selected/hover tints and soft decorative washes — never as a primary CTA.
- **Poppy** is reserved for "current state" / pain-point accents and as the warm stop in brand gradients (Cobalt → Poppy). Do not use Poppy on CTAs.
- **Ecru** is the warm neutral for alternating background sections; `#FFFFFF` otherwise.

### 2.2 Signature gradient

Used on hero headers, landing cards, and Docusign-branded narrative bars:

```css
background: linear-gradient(150deg,
  var(--ds-inkwell)      0%,
  var(--ds-deep-violet) 30%,
  var(--ds-cobalt)      70%,
  #6B2FFF              100%);
```

Accent gradient (brand signature in the Iris mark): `linear-gradient(135deg, #FF5252 0%, #4B05FF 100%)`. Use sparingly — left-edge bars on narrative cards, underlines on hero headlines.

### 2.3 Typography

**Display / UI (Docusign-branded surfaces):** DSIndigo. Load from Docusign's Akamai CDN so every file has identical weights:

```css
@font-face {
  font-family: "DSIndigo";
  src: url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Regular.woff2") format("woff2");
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: "DSIndigo";
  src: url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Medium.woff2") format("woff2");
  font-weight: 500; font-display: swap;
}
@font-face {
  font-family: "DSIndigo";
  src: url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Semibold.woff2") format("woff2");
  font-weight: 600; font-display: swap;
}
```

Stack: `"DSIndigo", Helvetica, Arial, sans-serif`.

**Body / product UI:** Inter (via Google Fonts, weights 300–800). Stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

**Division of labor**

- DSIndigo → landing card, hero headlines, section titles, problem/pain screens, brand narrative bars, Docusign web-form modals.
- Inter → tables, data density, CRM-emulation surfaces (Redtail, Guidewire, Jack Henry, etc.), form inputs.
- **Never use Playfair Display.** It's on five of the existing files and is not a Docusign brand font. Remove.

**Type scale (branded surfaces)**

| Role | Size | Weight | Letter-spacing |
|---|---|---|---|
| Hero H1 | 30px | 600 | -0.5px |
| Section H2 | 28px | 600 | -0.5px |
| Card title | 17px | 600 | -0.02em |
| Pain-stat value | 42px | 700 | -1.5px |
| Body | 14px | 400 | 0 |
| Caption / tertiary | 11–12px | 400–500 | 0–0.5px |

### 2.4 Logo usage

- **Full wordmark:** `DS Iris Large Mark/DS Iris logo primary.svg` for light surfaces; `...reversed.svg` for dark/gradient backgrounds. Render at ~28–32px tall in headers, 40–48px on landing cards.
- **Favicon:** link the full `DSIcon favicon LightMode` set in `<head>` — at minimum 16, 32, 180 (apple-touch), 192, 512.
- **Co-branding pattern (TGK Capital + Docusign):** vertical divider (`.tgk-sep`) between marks, both at ~30px; reversed variant for dark chrome. Already implemented as `.tgk-brand` in `auto.html`.

### 2.5 Spacing, radii, shadows

| Token | Value |
|---|---|
| `--r-sm` | `8px` — buttons, inputs |
| `--r` | `12px` — cards |
| `--r-lg` | `16px` — browser chrome, large surfaces |
| Landing card | `20px` |
| Page max-width | `1420px` (browser chrome), `920px` (prose) |
| Section padding | `44px 36px` |

Shadows (layered): `--shadow-xs → --shadow-xl` as defined in `auto.html`. Hero / landing shadow signature: `0 30px 80px rgba(19, 0, 50, 0.35)`.

---

## 3. Canonical layout

Every discovery asset follows this top-to-bottom order. There is no landing card, no browser chrome, no story bar, no scene-by-scene demo. The viewer lands on the pipeline and clicks into it.

### 3.1 Page header

Centered, on the warm ecru page background.

- **Logo** — `./assets/iris/ds-iris-primary.svg`, 28px tall, centered.
- **Eyebrow** — `INTERACTIVE DISCOVERY`, 11px, 0.14em tracked, Cobalt.
- **H1** — `[Industry] — Current State vs. Future State`. DSIndigo 600, `clamp(28px, 3.2vw, 40px)`.
- **Subtitle** — one sentence in Inter 14px / Ink Soft, ≤ 640px width.

### 3.2 Legend

Three chips, centered, 11px uppercase / 0.1em tracked:

1. Docusign-powered step (Cobalt outline)
2. IAM product (Mist tint)
3. Point solution (Poppy tint — vendor we cannot displace)

### 3.3 Point-solutions bar

A horizontal card (`surface`, 14px radius) listing vendors in scope that we do **not** try to replace (LOS, core system, servicing platform, ID&V vendor, credit bureau, etc.). Each vendor is a Poppy-tinted `.point-chip`. Delete the whole section if no point solutions are in scope.

### 3.4 Swim lane — the pipeline

The main surface. A white card (20px radius) containing:

- **Lane header:** icon badge + lane title + subtitle + `← →ʎ` keyboard hint chip.
- **`.flow`:** horizontally scrolling row of `.node` buttons separated by `.connector` arrows.
- **Node:** 84px circle, 2px Cobalt border, white fill. Contains inline feather-style SVG icon (Cobalt, 32px), a step badge (Inkwell pill, top-right), and a label below (Inter 12px/600).
- **Endpoint node:** the terminal step. Filled Deep Violet with a small Poppy check badge bottom-right.
- **Active node:** filled Cobalt, white icon, Cobalt label.

Multi-lane assets (e.g. "policy lifecycle" + "claims lifecycle" for insurance) duplicate the whole `.swim-lane` block — each lane has its own header and its own `steps` array. Do not mix unrelated steps into one lane.

### 3.5 Modal panel — current vs. future

Clicking a node opens a centered modal over a blurred scrim.

- **Header:** step number (`Step 03 of 07`) + panel title + prev/next arrows + close.
- **Body:** two cards side-by-side.
  - `.state-card.current` — Poppy-tinted. Heading, 3–5 bullets (red dots), and a dashed-divider `card-point-solutions` block listing any non-displaceable vendors touched by this step.
  - `.state-card.future` — Cobalt-tinted. Heading, 3–5 bullets (Cobalt dots), and a row of Mist `iam-tag` chips naming the IAM products in play (Web Forms, eSignature, Navigator, Maestro, Document Generation, Identify, Extract, Notary, App Center, CLM, Payments).
- **Footer:** `ESC` to close, `← →` to navigate, plus a dotted step indicator.
- **Keyboard:** ESC closes, arrow keys navigate between steps, focus returns to the node on close.

### 3.6 Page footer

One line, centered: `Built by TGK Capital × Docusign · For discovery conversations only`.

---

## 4. Component library

| Component | Key classes | Notes |
|---|---|---|
| Page header | `.page-header` | Logo + eyebrow + H1 + subtitle. Centered. Ecru page background. |
| Legend | `.legend / .legend-item / .legend-swatch.{future,iam,point}` | Three chips. 11px uppercase. |
| Point-solutions bar | `.point-solutions-bar / .ps-label / .ps-chips / .point-chip` | Poppy-tinted chips. Delete section if empty. |
| Swim lane | `.swim-lane / .lane-header / .lane-icon / .lane-title / .lane-subtitle / .kbd-hint` | White card. Duplicate for multi-process assets. |
| Node | `.node / .node-circle / .node-icon / .node-step-badge / .node-label` | 84px circle, Cobalt border, inline SVG icon. `.node.endpoint` = Deep Violet fill + Poppy check badge. `.node.active` = filled Cobalt. |
| Connector | `.connector / .connector-line` | 44px line with arrowhead. Separates nodes. |
| Modal panel | `.panel / .panel-scrim / .panel-header / .panel-body / .panel-footer / .panel-nav / .panel-close` | Centered, 1080px max, scrim blur 6px. Opens on node click. |
| State card | `.state-card.current / .state-card.future / .state-label / .state-heading / .state-items` | Side-by-side, Poppy vs Cobalt tint, ≤5 bullets each. |
| IAM tag | `.iam-tag` | Mist tint, Cobalt check-svg prefix, Deep Violet text. One per IAM product. |
| Step-card point solutions | `.card-point-solutions / .ps-mini-label / .ps-mini-chips` | Dashed-divider block inside the `current` card. Only render if the step has point solutions. |

---

## 5. Data model

The template is data-driven. All node + panel content lives in a `steps` JSON array at the bottom of the file. Never hand-edit node markup.

```jsonc
{
  "icon":    "user",              // key into the icon library
  "label":   "Application",       // shown under the node
  "heading": "Application intake",// shown in the panel title
  "endpoint": true,               // optional — styles last node distinctly
  "current": {
    "heading": "Static PDF forms emailed back and forth",
    "items":   ["...", "...", "..."],
    "points":  ["[LOS / CRM]"]
  },
  "future": {
    "heading": "Dynamic Web Form pre-filled from the LOS",
    "items":   ["...", "...", "..."],
    "tags":    ["Web Forms", "Navigator"]
  }
}
```

**Rules of thumb**

- 4–8 nodes per lane. More than 8 and the flow gets unreadable; split into two lanes.
- 3–5 bullets per state. The panel is scan-friendly, not a doc.
- Endpoint node (`"endpoint": true`) is reserved for the terminal step.
- `current.points` lists non-displaceable vendors touched at that step. `future.tags` lists IAM products that replace/augment them.

---

## 6. Iconography — strict rules

**No emoji. Ever.** Not in nodes, not in chips, not in narration, not in headers, not as placeholders.

All icons are inline feather-style SVG:

- Stroke `currentColor`, `fill: none`, `stroke-width: 1.7`, round caps and joins.
- 24×24 viewBox.
- Defined once in the `icon-library` JSON block at the bottom of the template. Reference by key from the `steps` array. When you need a new icon, add it to the library, don't inline it in content.

**Current icon library keys** (keep this list in sync with the `icon-library` block in `_template.html`):
`user`, `users`, `building`, `document`, `signature`, `shield-check`, `bank`, `phone`, `mail`, `inbox`, `handshake`, `checklist`, `calculator`, `search`, `card`, `chart-up`, `clock`, `warning`, `check`, `spark`, `workflow`, `folder`, `database`, `flag`.

**Flat PNG illustrations** from the Docusign asset library (`wallet.png`, `video_recorder.png`, etc.) are reserved for future use cases that need hero imagery — not for inline pipeline nodes.

---

## 7. Voice / content conventions

- **H1s** are short and declarative. `[Industry] — Current State vs. Future State`.
- **Node labels** are 1–2 words, title case. `Application`, `Doc Collection`, `Underwriting`.
- **Current-state headings** describe the pain bluntly. `"Manual KYC across three systems"`, not `"Legacy verification workflow"`.
- **Future-state headings** describe the lift concretely. `"Inline ID&V tied to the agreement"`, not `"AI-powered verification experience"`.
- **Bullets** are outcome-oriented, ≤ 90 chars. No filler. No marketing adverbs ("seamlessly", "intelligently").
- **IAM tags** match Docusign product names exactly. `Web Forms`, `eSignature`, `Maestro`, `Navigator`, `Document Generation`, `Identify`, `Notary`, `CLM`, `App Center`, `Payments`, `Extract`.

---

## 8. Current files — status vs. this spec

| File | Folder | Status | Work needed |
|---|---|---|---|
| `_template.html` | `TGK 2.0/` | ✅ Canonical template | Single source of truth for new assets. |
| `auto.html` | `TGK 2.0/` | 🟡 Palette reference only | Keep for color/font reference. Its scene-walkthrough layout is **retired** for this asset family. |
| `banking-deposits.html` | `TGK 2.0/` | ❌ Off-brand | Dark `#0a0a0f`, Playfair, indigo `#6366f1`. Re-skin against `_template.html`. |
| `insurance-life.html` | `TGK 2.0/` | ❌ Off-brand | Cream + Playfair + invented purple. Re-skin. |
| `insurance-pc.html` | `TGK 2.0/` | ❌ Off-brand | Cream + Playfair + `#3D3BF3`. Re-skin. |
| `wealth-onboarding.html` | `TGK 2.0/` | ❌ Off-brand | Navy + brown + Playfair. Re-skin. |
| `index.html`, `index-playbook.html` | `TGK 2.0/` | Unreviewed | Audit after reconciliation. |
| `disco-bank.html` | `TGK2.0/` | ❌ Off-brand | Dark + indigo + Playfair. Re-skin. |
| `disco-insurance.html` | `TGK2.0/` | ❌ Off-brand | Cream + Playfair + `#3D3BF3`. Re-skin. |
| `disco-wealth.html` | `TGK2.0/` | ❌ Off-brand | Navy + `#4A00E0` + Playfair. Re-skin. |
| `disco-land.html` | `TGK2.0/` | ❌ Off-brand | Dark + `#7c66ff` + Playfair. Re-skin. |
| `index.html` (TGK2.0) | `TGK2.0/` | Unreviewed | Audit. |

**Common drift patterns to fix everywhere:**

1. Swap Playfair Display / system serifs → DSIndigo.
2. Swap invented purples (`#6366f1`, `#7c66ff`, `#3D3BF3`, `#4A00E0`, `#8b7355`) → `#4C00FF` Cobalt.
3. Swap dark `#0a0a0f` / cream `#FAFAF8` backgrounds → warm ecru `#F7F4F1` per `_template.html`.
4. Add full DSIndigo `@font-face` block + Inter import.
5. Add DSIcon favicon link set.
6. Replace home-grown logos with `./assets/iris/ds-iris-primary.svg` (light surface).
7. Scrub **all emoji** — replace with the inline feather-style SVG icon library.
8. Normalize the `steps` array to the canonical JSON schema in §5.

---

## 9. Proposed next steps

1. **Reconcile existing files** against `_template.html`, in order: wealth-onboarding → insurance-pc → insurance-life → banking-deposits → disco-wealth → disco-insurance → disco-bank → disco-land. We can batch the index pages at the end. Each file should end up with the same shell (header, legend, point-solutions bar, swim lane, modal) and a populated `steps` array.
2. **Capture per-industry instructions** from teammates so additional assets can be scaffolded from `_template.html` without re-litigating the layout.
3. **Retire the scene-walkthrough pattern.** `auto.html` stays for palette/font reference only; no new assets use its layout.

---

*Last updated: 2026-04-18. Owner: Jimmy (Patrick) Meyer. Canonical file: `_template.html`.*
