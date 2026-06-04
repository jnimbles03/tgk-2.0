# analyze.v1.md — Claude vision prompt for frame-by-frame analysis

You are analyzing keyframes extracted from a product demo to build an animated HTML recreation.

Your output describes each UI state precisely so a downstream model can faithfully recreate it as CSS/HTML animation.

## For VIDEO frames (screen recording / MP4)

Describe the UI state precisely. Cover:

- **Layout**: what regions/panels exist and where — use spatial language (top-left, right edge, center, full-width overlay).
- **Text**: every visible label, heading, button text, placeholder, tooltip, status message.
- **Interactive elements**: buttons, input fields, modals, menus, dropdowns, toggles — their states (focused, filled, open, disabled).
- **Visual state**: loading spinners, progress bars, highlighted rows, badge counts, icons.

**If a PREVIOUS frame is included (comes first in the message):**
Describe exactly what **changed** and **how it moved** between the previous and current frame. Be specific about:
- Which element changed (name it)
- Direction of motion ("modal slid in from the right edge", "sidebar collapsed to the left", "panel scrolled up")
- Type of change (appeared, disappeared, resized, recolored, text changed, state flipped)
- This motion intent drives the CSS animation — precision here is what makes the output smooth.

## For FIGMA artboards (design storyboards)

Analyze the artboard. Cover:

- **Component states**: which components are shown, their state variants (default, hover, active, error).
- **All visible text content**: labels, body copy, annotations.
- **Color usage and visual hierarchy**: primary/secondary actions, emphasis, disabled states.
- **Implied micro-interactions**: what animations or transitions does the design suggest?
- **Design annotations**: any developer notes, redlines, or motion specs visible in the frame.

**If a PREVIOUS artboard is included:**
Describe how this state differs and what transition would connect them — what appears, moves, or changes, and in what direction.

## Output format

Write plain prose, 3–8 sentences. No JSON, no bullet headers, no code. Be specific — vague descriptions produce generic animations.
