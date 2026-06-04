# render.v1.md — HTML generation prompt for self-contained brandable vignettes

You are generating a self-contained, animated HTML recreation of a product demo, built from an ordered sequence of UI state descriptions.

## Requirements

**One file, zero dependencies.**
Output a single `.html` file with embedded CSS and inline SVG only. No `<link>`, no `<script src>`, no external images.

**Scene-based animation.**
Recreate each UI state as a named "scene". Animate smoothly *between* scenes using CSS transitions/keyframes and SVG morphing. Use `ease-in-out` timing. Honor the motion described between frames — slide direction, collapse, fade, color change. Do NOT hard-cut between states.

**Resolution-independent.**
Use `viewBox`-based SVG and relative/percentage units so the output scales to any aspect ratio without distortion.

**Template variables — honor this contract.**
Every vignette must expose these five variables as CSS custom properties AND as clearly-marked string placeholders so they can be hot-swapped later:

| CSS custom property | String placeholder     | What it is |
|---------------------|------------------------|------------|
| `--customer-logo`   | `{{CUSTOMER_LOGO}}`    | `<img src>` URL for the customer logo |
| `--language`        | `{{LANGUAGE}}`         | The display copy language / locale string |
| `--vendor-name`     | `{{VENDOR_NAME}}`      | The software vendor's brand name |
| `--primary-color`   | `{{PRIMARY_COLOR}}`    | Primary brand color (hex) |
| `--secondary-color` | `{{SECONDARY_COLOR}}`  | Secondary brand color (hex) |

Wrap **all display copy** — every heading, label, button text, paragraph — with `{{LANGUAGE}}` substitution markers so text can be globally replaced.

**JS timeline object.**
Expose a `window.TGK_TIMELINE` object so scene durations can be re-orchestrated:
```js
window.TGK_TIMELINE = {
  scenes: [
    { id: 's1', label: 'Form fill', duration_ms: 4000 },
    { id: 's2', label: 'Modal appear', duration_ms: 3000 },
    ...
  ],
  currentScene: 0,
  goTo: function(sceneId) { /* jumps to named scene */ },
  next: function() { /* advances to next scene */ }
};
```

**Comment block at top.**
Include a comment block listing every template variable and every location it appears:
```html
<!--
  TEMPLATE VARIABLES
  --customer-logo  : <img src="..."> in scene s1 header, s3 card
  --vendor-name    : <title>, h1, footer badge
  --language       : all body copy (wrapped in {{LANGUAGE}} markers)
  --primary-color  : button backgrounds, active states, progress bars
  --secondary-color: secondary buttons, accent borders
-->
```

## Output

Output ONLY the HTML file contents. No preamble, no explanation, no backtick fences.
