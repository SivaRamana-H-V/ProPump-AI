---
name: neo-swiss-industrial-precision
description: >
  Design, copywriting, and front-end execution skill modeled after Neo-Swiss Industrial
  Minimalism. Combines gallery-white architectural whitespace, oversized tight-tracked
  grotesk typography, 3D z-axis focal layering, high-contrast Signal Orange accents,
  transparent proof metrics, and empathetic human-first micro-touchpoints.
version: 1.0.0
domain: Brand Systems, UI/UX Architecture, High-Trust B2B & Tech-Enabled Operations
---

# Design System Skill: Neo-Swiss Industrial Precision

## 1. Visual Theme & Design Language Overview
This design language is **Neo-Swiss Industrial Precision**—a deliberate synthesis of Swiss editorial grid rigor, physical-world industrial realism, and warm human accountability.

- **Core Aesthetic Pillars:**
  1. **Gallery-Grade Negative Space:** Over 55% of the viewport remains pure white canvas to signal clarity, control, and zero operational clutter.
  2. **Architectural Sharpness:** Razor-sharp rectangular geometry (`0px`–`2px` radii on primary controls) communicates mechanical accuracy and engineering discipline.
  3. **Dimensional Layering (2.5D/3D Depth):** Oversized editorial typography sits *behind* a tactile central 3D hero artifact, creating immediate spatial drama without relying on decorative gradients or noisy backgrounds.
  4. **Signal-Driven Focus:** A monochrome foundation (Pure White + Carbon Black + Brushed Steel Gray) is pierced by a single high-energy **Signal Orange** accent reserved strictly for action, brand identity, and focal highlights.
  5. **Human Empathy Anchor:** Cold precision is intentionally balanced by real human photography, collaborative microcopy, and verifiable performance metrics.

---

## 2. Color Palette & Token Architecture

Follow a strict **75 / 15 / 10 Visual Balance**: 75% White & Light Metallic Neutrals, 15% Carbon Black Ink, 10% Signal Orange.

### Primary & Brand Tokens
| Token Name | Hex Code | Role & Usage |
| :--- | :--- | :--- |
| `--color-canvas` | `#FFFFFF` | Primary viewport background; clean studio surface. |
| `--color-canvas-subtle` | `#F4F5F7` | Outer frame, recessed panels, soft card backdrops. |
| `--color-ink-primary` | `#0E0E10` | Oversized display headlines, primary black buttons, logo base, KPI numerals. |
| `--color-accent-signal` | `#F04A1D` | Primary conversion CTA, brand geometric motifs, play indicator, active states. |
| `--color-accent-hover` | `#D63B12` | Hover/pressed state for Signal Orange interactive elements. |
| `--color-accent-soft` | `#FF6A3D` | Warm backdrop highlights (e.g., portrait card accents, 3D graphic wraps). |

### Industrial Neutral Tokens
| Token Name | Hex Code | Role & Usage |
| :--- | :--- | :--- |
| `--color-steel-light` | `#E4E7EC` | Hairline dividers, subtle borders, 3D metallic highlights. |
| `--color-steel-mid` | `#98A2B3` | Technical metadata (`// Since 2020`), orbital badge text, muted icons. |
| `--color-ink-secondary` | `#525866` | Navigation links, KPI descriptive labels, secondary body copy. |
| `--color-shadow-ambient` | `rgba(14, 14, 16, 0.14)` | Realistic grounded drop shadows cast by floating 3D artifacts. |
| `--color-glass-overlay` | `rgba(255, 255, 255, 0.72)` | Frosted translucent overlay for centered media/play triggers (`backdrop-filter: blur(12px)`). |

---

## 3. Typography System

Typography carries the architectural weight of the interface. Avoid overly thick/heavy display weights; precision comes from **massive scale paired with regular-to-medium stroke weight and tight tracking**.

### Font Family Stack
- **Primary Display & UI Sans:** `'Neue Haas Grotesk Display Pro'`, `'Helvetica Now Display'`, `'Inter'`, `'Satoshi'`, `sans-serif`
- **Technical / Metadata Accent (Optional):** `'JetBrains Mono'`, `'IBM Plex Mono'`, `monospace` (for subtle markers like `// Since 2020`)

### Typographic Scale & Rules
| Role | Desktop Size | Weight | Line Height | Letter Spacing | Alignment & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display Split** | `clamp(4.5rem, 11vw, 9.5rem)` | `400`–`500` | `0.90` | `-0.045em` | Diagonal split framing (Top-Left + Bottom-Right). Sentence case. |
| **Section Headline** | `clamp(2.5rem, 5vw, 4.5rem)` | `500` | `1.02` | `-0.03em` | Left-aligned with clean grid anchor. |
| **KPI Numerals** | `clamp(1.75rem, 2.5vw, 2.25rem)` | `600` | `1.05` | `-0.02em` | `font-variant-numeric: tabular-nums;` Right-aligned in hero rail. |
| **KPI Labels / Micro** | `0.75rem` (`12px`) | `400` | `1.4` | `0.01em` | Muted neutral (`--color-ink-secondary`). |
| **Navigation Links** | `0.875rem` (`14px`) | `400`–`500` | `1.2` | `-0.01em` | Clean horizontal spacing (`gap: 32px`–`48px`). |
| **CTA Button Text** | `0.8125rem` (`13px`) | `500` | `1.0` | `0.01em` | Concise, action-oriented, paired with thin directional arrow (`->`). |
| **Orbital / Stamp Text** | `0.625rem` (`10px`) | `500` | `1.0` | `0.14em` | Uppercase circular SVG text path around media triggers. |

---

## 4. Spatial Layout, Positioning & Z-Axis Choreography

The hero layout operates on a **12-column Swiss architectural grid** with intentional **diagonal eye-flow** and **4 distinct z-index planes**.

### Viewport Positioning Blueprint (Hero Section)
1. **Top Utility Bar (Header):**
   - **Far Left:** Geometric brand mark (interlocking slanted black and orange parallelograms conveying forward motion) + crisp logotype.
   - **Center-Left:** Minimalist 4-item text navigation (`About us`, `Services`, `FAQ`, `Reviews`). No dropdown clutter or icons.
   - **Far Right:** Solid Carbon Black sharp-cornered CTA (`Contact us`).
2. **Diagonal Headline Framing (Layer 1 — `z-index: 10`):**
   - **Upper-Left Quadrant:** First half of the value proposition (e.g., `"Precision"`), anchored near the left margin.
   - **Lower-Right Quadrant:** Second half of the value proposition (e.g., `"Delivery"`), anchored near the bottom-right margin.
   - *Design Intent:* Forces the eye across the central artifact from top-left to bottom-right in a dynamic diagonal sweep.
3. **Central Focal Artifact (Layer 2 — `z-index: 20`):**
   - A hyper-realistic 3D physical product or operational symbol suspended in space (e.g., shipping container on steel rigging).
   - **Boundary Breaking:** Structural attachment elements (cables/crane hook) originate directly from the top viewport edge (`top: 0`), visually passing over the header space to create physical realism.
   - **Overlap Rule:** The 3D artifact intentionally occludes 15%–25% of the bottom strokes of the top-left word and top strokes of the bottom-right word—while keeping every word effortlessly legible.
   - **Branded Integration:** Brand geometry (bold orange circle/stripes) is mapped physically onto the 3D surface rather than pasted as a flat UI sticker.
4. **Peripheral Micro-Modules (Layer 3 — `z-index: 30`):**
   - **Mid-Left Rail:** Subtle heritage/credibility stamp (`// Since 2020`) stacked vertically above a circular rotating-text showreel button with a centered Signal Orange play triangle.
   - **Bottom-Left Anchor:** Primary Signal Orange rectangular CTA button (`Let's get your cargo ->`).
   - **Upper-Right Floating Card:** Compact horizontal Human Trust Card featuring the mini brand mark, short specialization text, and a warm, smiling real-person portrait against an orange accent backdrop.
   - **Mid-Right Proof Rail:** Vertically stacked, right-aligned quantitative trust metrics (`99%`, `4.9/5`, `100+`) with concise 2–3 word labels beneath each number.
   - **Center Media Trigger (Optional):** Large translucent frosted-glass play icon floating cleanly over the hero object's center of gravity.

---

## 5. Component Specifications

### Primary Action Button (Signal Orange)
- **Background:** `#F04A1D` | **Text:** `#FFFFFF`
- **Border Radius:** `0px` to `2px` (sharp industrial cut)
- **Padding:** `14px 24px`
- **Structure:** Conversational action label + right-aligned thin arrow (`->`) that nudges `+4px` on hover.

### Secondary Utility Button (Header Black)
- **Background:** `#0E0E10` | **Text:** `#FFFFFF`
- **Border Radius:** `0px` to `2px`
- **Padding:** `12px 24px`
- **Hover State:** Transitions smoothly to `#F04A1D` (or subtle opacity/underline micro-shift).

### Human Trust Card (Floating Empathy Widget)
- **Container:** `#FFFFFF` surface, `1px solid #E4E7EC`, subtle elevation shadow `0 12px 32px rgba(14, 14, 16, 0.06)`, `border-radius: 6px`.
- **Internal Split:** Left 55% = micro brand mark + concise 2-line promise + muted sub-caption. Right 45% = crisp, high-key studio portrait of a real, approachable team member set on a `#F04A1D` / `#FF6A3D` architectural background.

### Metric Proof Stack
- **Layout:** Single vertical column, `gap: 24px`, right-aligned (`text-align: right`).
- **Format:** Big bold metric (`99%`, `4.9/5`, `100+`) on line 1; muted 12px label on line 2. No icons, boxes, or card borders around individual stats—let the numbers float cleanly on white space.

### Motion & Interaction Feel
- **Physics:** Weighted, mechanical, yet fluid—like calibrated industrial hydraulics (`cubic-bezier(0.22, 1, 0.36, 1)`).
- **Subtle Ambient Motion:** Gentle pendulum/suspension float on the hero 3D artifact; slow continuous `20s linear infinite` rotation on the circular showreel text badge; crisp `200ms` transitions on UI buttons.

---

## 6. Brand Values, Positioning & Empathy Framework

### Brand Positioning
- **Archetype:** *The Master Engineer & Reliable Partner* (Modern, tech-forward operational leader).
- **Market Stance:** Rejects bloated corporate bureaucracy and loud, gimmicky marketing. Projects quiet mastery: *"We handle massive complexity so your experience feels effortless."*

### Core Brand Values
1. **Uncompromising Precision:** Measured outcomes over vague promises (`99% On-time performance`).
2. **Radical Clarity:** Clean whitespace mirrors transparent pricing, live tracking, and clear communication.
3. **Kinetic Momentum:** Forward-leaning diagonals, action verbs, and suspended motion evoke progress and speed.
4. **Human Accountability:** Behind every heavy system, container, or algorithm is a real, smiling specialist ready to help.

### Tone of Voice & Copywriting Guidelines
- **Voice Attributes:** Assured, concise, collaborative, jargon-free, grounded.
- **Empathy Through Microcopy:**
  - *Cold/Robotic (Avoid):* `"Submit Freight Inquiry"`, `"Enterprise Logistics Solutions"`, `"Request Quote Now"`.
  - *Empathetic/Collaborative (Use):* `"Let's get your cargo ->"`, `"Precision Delivery"`, `"Logistics Enhanced"`.
- **Empathy Through Proof:** Respect the user's anxiety around high-stakes operations (missed deadlines, lost shipments, hidden failures). Proactively relieve anxiety right in the hero fold by surfacing **three reassurance layers simultaneously**:
  1. **Competence Proof:** Hard numbers (`99%`, `100+`).
  2. **Social Proof:** Peer validation (`4.9/5 Customer ratings`) + visual proof (`Watch a showreel of our results`).
  3. **Human Proof:** A visible, welcoming specialist card signaling immediate human support.

---

## 7. Agent Execution Workflow
When tasked with designing or building a page/product using this skill:
1. **Anchor the Palette:** Initialize CSS variables strictly from Section 2.
2. **Establish the Grid & Negative Space:** Build a clean white architectural canvas before adding any media or UI.
3. **Craft the Split Headline:** Distill the brand promise into 2 punchy words (1 Top-Left, 1 Bottom-Right) that read diagonally across the focal centerpiece.
4. **Integrate the 3D/Physical Focal Subject:** Place one bold, hyper-clear subject in the center with realistic lighting/cast shadow and subtle text overlap.
5. **Balance Precision with Empathy:** Always pair quantitative proof metrics with a human warmth touchpoint (portrait card + collaborative CTA phrasing).
6. **Verify Against Rules:** Run every output through `RULES_AND_CONDITIONS.md` before final delivery.