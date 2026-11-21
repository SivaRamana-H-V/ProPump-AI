# Rules, Conditions & Guardrails — Neo-Swiss Industrial Precision

This document defines mandatory rules, conditional logic, anti-patterns, and acceptance criteria for AI agents generating UI, layouts, branding, or copy under the `neo-swiss-industrial-precision` skill.

---

## 1. Non-Negotiable Core Rules (Hard Constraints)

### Rule 1: Color Discipline
- **MUST** use Pure White (`#FFFFFF`) as the dominant primary background for hero and editorial sections.
- **MUST** restrict Signal Orange (`#F04A1D`) to no more than **10%–15%** of visible viewport area (primary CTA, brand geometric motifs, active indicators, and focal artwork).
- **NEVER** introduce secondary competing accent colors (no blues, purples, teals, or neon greens).
- **NEVER** use multi-color mesh gradients, dark-mode neon glows, or pastel rainbow palettes.

### Rule 2: Geometric Sharpness
- **MUST** keep primary and secondary rectangular CTA buttons sharp (`border-radius: 0px` to `2px`).
- **NEVER** use pill-shaped buttons (`border-radius: 9999px`) for main navigation or primary CTAs.
- Circular geometry (`border-radius: 50%`) is **ONLY** permitted for:
  - Orbital text showreel badges
  - Media play buttons / icons
  - Brand graphic motifs mapped onto physical/3D surfaces

### Rule 3: Typography Restraint & Hierarchy
- **MUST** use a clean Neo-Grotesk Sans-Serif across the entire interface (maximum 1 primary typeface + optional 1 monospace for technical metadata like `// Since 2020`).
- **MUST** keep hero display headlines in `400` (Regular) or `500` (Medium) weight with tight negative tracking (`-0.04em` to `-0.05em`).
- **NEVER** use `800`/`900` extra-bold display weights, serif fonts, handwritten scripts, or wide letter-spacing on large headlines.
- **MUST** apply `font-variant-numeric: tabular-nums` to all KPI numbers and operational data.

### Rule 4: Spatial Overlap & Legibility
- When placing a central 3D/cutout hero artifact over split display typography:
  - **MUST** preserve at least **75% visual legibility** of every letterform.
  - **MUST** render a grounded, soft ambient shadow beneath/behind the floating artifact so it feels physically suspended in a lit studio rather than flatly pasted.
  - **NEVER** place body paragraphs or clickable links behind the central artifact.

### Rule 5: Mandatory Empathy Counterweight
- Every high-precision hero or landing section **MUST** include at least **one human warmth signal** alongside industrial/data elements:
  - A real, well-lit, approachable human portrait (e.g., specialist card), AND
  - Collaborative, first-person-plural CTA copy (e.g., *"Let's move your freight"*, *"Let's build together"*).
- **NEVER** create a hero composed purely of cold machinery/abstractions and rigid corporate jargon.

---

## 2. Conditional Logic (IF / THEN Adaptation Rules)

| Condition (`IF`) | Required Agent Action (`THEN`) |
| :--- | :--- |
| **IF** the target industry is **not logistics** (e.g., SaaS, FinTech, Robotics, Architecture, Supply Chain AI) | Retain the exact Swiss white canvas, `#0E0E10` + `#F04A1D` palette, split diagonal headline, KPI rail, and Human Trust Card—swap only the central 3D hero artifact to an iconic, tactile object from the target domain (e.g., precision hardware module, architectural monolith, tactile physical card/device). |
| **IF** no 3D render or transparent PNG asset is available | Use a high-contrast studio cutout photograph with neutral metallic/white tones, apply a crisp geometric `#F04A1D` graphic motif overlay, and cast a realistic CSS/SVG ambient shadow on the `#FFFFFF` canvas. |
| **IF** viewport width drops below `1024px` (Tablet / Mobile) | Collapse the diagonal split headline into a clean stacked top display lockup above the central artifact; convert the right KPI rail into a compact 3-column horizontal proof bar; ensure primary `#F04A1D` CTA spans full width (`width: 100%`) below the hero artifact; hide or dock the floating Human Trust Card cleanly below the fold without overlapping text. |
| **IF** the user requests a Dark Section (e.g., Footer or Contrast Band) | Invert strictly to Carbon Black (`#0E0E10`) canvas, Pure White (`#FFFFFF`) typography, Steel Gray (`#525866`) hairlines, and preserve Signal Orange (`#F04A1D`) for primary actions. Never use navy or muddy dark gray. |
| **IF** a metric lacks verified user data | Use clearly marked placeholder tokens (e.g., `[99%]`, `[4.9/5]`, `[100+]`) and prompt the user to supply authentic operational stats—never fabricate deceptive claims for production launches. |
| **IF** the user asks for dense enterprise data tables or dashboards | Maintain the crisp `#FFFFFF` canvas, `1px solid #E4E7EC` architectural gridlines, tabular numerals, and Signal Orange strictly for status alerts or primary row actions. |

---

## 3. Strict Anti-Patterns (Explicit Prohibitions)

The AI agent is strictly **PROHIBITED** from generating:
1. **Bento-Box Clutter:** Do not wrap every hero metric, badge, and headline in thick gray rounded boxes. Metrics and headlines must float directly on open white space.
2. **Generic Tech Clichés:** No glowing purple gradients, floating glassmorphism blobs, abstract wireframe globes, or AI sparkle icons.
3. **Heavy Drop Shadows on UI Buttons:** Buttons must remain flat, crisp, and architectural (`box-shadow: none`). Only the 3D physical hero artifact and subtle floating human card receive realistic studio shadows.
4. **Verbose Hero Paragraphs:** Do not write 4-line marketing paragraphs inside the hero fold. Rely on the 2-word split headline, crisp proof metrics, and high-clarity CTA.
5. **Stock Corporate Stiffness:** No stiff handshake photos, faceless silhouettes, or passive bureaucratic copy (*"Click here to learn more about our solutions"*).

---

## 4. Accessibility & Technical Conditions

- **Color Contrast Compliance:**
  - `#0E0E10` on `#FFFFFF` (Ratio ~19.4:1 — WCAG AAA Pass).
  - `#FFFFFF` on `#F04A1D` (Use bold/medium weight `>= 14px` or darken hover to `#D63B12` to maintain strong legibility and AA large-text/UI compliance).
  - `#525866` on `#FFFFFF` (Ratio ~7.1:1 — WCAG AA/AAA Pass).
- **Reduced Motion Condition:**
  - **MUST** wrap orbital badge rotation and 3D suspension float animations inside `@media (prefers-reduced-motion: no-preference)`.
- **Semantic HTML & Layering:**
  - Split headlines (e.g., `"Precision"` and `"Delivery"`) **MUST** remain a single semantic `<h1>` (using styled `<span>` elements for top-left and bottom-right positioning) so screen readers and SEO crawlers read one cohesive headline.

---

## 5. Pre-Output Quality Assurance (QA) Checklist

Before delivering any generated design, code, or copy, the AI agent **MUST** verify every condition below:

- [ ] **Whitespace Ratio:** Does at least 55% of the hero viewport remain clean `#FFFFFF` negative space?
- [ ] **Color Purity:** Are `#FFFFFF`, `#0E0E10`, `#F04A1D`, and cool steel grays the *only* UI colors used?
- [ ] **Sharp Geometry:** Are primary and secondary CTAs sharp-cornered (`0px`–`2px`)?
- [ ] **Diagonal Typography:** Does the display headline use regular/medium Neo-Grotesk weight with tight negative tracking (`-0.04em`) and clear z-axis interaction with the focal object?
- [ ] **Triple Reassurance:** Are Competence Proof (metrics), Visual/Social Proof (ratings/showreel), and Human Empathy (specialist portrait + warm CTA) all present?
- [ ] **Voice Check:** Does the copy sound confident, concise, and collaborative rather than salesy or robotic?
- [ ] **Responsive Safety:** Does the layout gracefully un-overlap and stack cleanly on mobile screens without clipping text?