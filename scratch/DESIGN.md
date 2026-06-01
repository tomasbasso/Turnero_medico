# Design System Specification: Premium Clinical Aesthetic (Turnero Médico)

## 1. Overview & Creative North Star
**Creative North Star: "The Modern Clinical Sanctuary"**
This design system moves away from cold, sterile, or overly complex hospital software. It embraces a warm, premium, human-centric clinical aesthetic that evokes reassurance, clarity, and trust. 

 hierarchy is defined by fluid spacing and soft depth rather than rigid lines. We use soft slate backgrounds, glowing teals, and semi-transparent glassmorphic surfaces to create an interface that feels alive, clean, and state-of-the-art.

---

## 2. Color & Surface Architecture
The color scheme leverages the therapeutic quality of teals paired with clean slate whites.

### Color Palette
*   **Primary (Theme Seed):** `#0d9488` (Deep clinical teal) — Represents trust, professionalism, and depth.
*   **Accent:** `#14b8a6` (Vibrant turquoise) — Used for focused active states, highlights, and micro-animations.
*   **Background Canvas:** `#f8fafc` (Ultra-soft slate white) — Provides a clean, spacious, high-contrast background.
*   **Card/Surface:** `#ffffff` (Pure white) — Stands out gracefully against the slate canvas.
*   **Text Primary:** `#0f172a` (High-definition slate dark) — Deep charcoal for high-contrast legibility (WCAG AA).
*   **Text Secondary:** `#64748b` (Muted slate gray) — For labels, metadata, and supporting text.
*   **Status Indicators:**
    *   *Success:* `#10b981` (Emerald Green)
    *   *Warning:* `#f59e0b` (Amber Orange)
    *   *Error:* `#ef4444` (Coral Red)
    *   *Completed:* `#64748b` (Slate Muted)

### Surface Hierarchy & Nesting
To make the UI feel modern and premium, we enforce the **No Harsh Borders Rule**:
*   Do not draw solid 1px dark borders to define sections.
*   Boundaries are defined by shifting backgrounds (e.g., `#ffffff` cards on a `#f8fafc` canvas) and soft shadows.
*   **The Ghost Border Fallback:** For focused inputs or subtle elements, use `#0d9488` or `#e2e8f0` at a maximum of 40% opacity.

### Glassmorphism & Depth
*   For the Booking Wizard cards, apply a beautiful glassmorphic treatment: `background: rgba(255, 255, 255, 0.75)`, a backdrop filter `backdrop-blur: 12px`, and a very subtle inner white highlight. This keeps the application feeling light, breathing, and premium.

---

## 3. Typography: The Modern clinical Scale
We pair the geometric elegance of **Outfit** (headings) with the ultimate clarity of **Inter** (body data and forms).

*   **Display & Headlines (Outfit):** Use for hero slogans, step titles, and large card headings. It has a bold, optimistic, and welcoming structure.
*   **UI Controls & Form Elements (Inter):** Use for inputs, lists, table content, and chips. Inter's exceptional legibility ensures error-free input for patient records, DNI numbers, and medical times.
*   **Contrast Target:** Always maintain a minimum contrast ratio of 4.5:1 (WCAG AA compliance) for all interactive and text elements.

---

## 4. Shapes, Borders & Elevation
A consistent rounding scheme ensures a friendly yet precise architectural feel.

*   **Border Radius:**
    *   `12px` (Large) — All main containers, modal dialogs, and booking wizard cards.
    *   `8px` (Medium) — Form text fields, button components, and filter selectors.
    *   `999px` (Full) — Status chips, badges, tag indicators, and step progress circles.
*   **Elevation (Shadows):**
    *   *Soft Ambient Shadow (Cards):* `0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.03)`
    *   *Elevated Shadow (Modals & Focus):* `0 20px 25px -5px rgba(13, 148, 136, 0.08), 0 8px 10px -6px rgba(13, 148, 136, 0.05)` (warm clinical teal shadow tone).

---

## 5. Interaction Patterns & Components

### Buttons & Call to Actions (CTAs)
*   **Primary Button:** Background gradient of `#0d9488` to `#14b8a6` at a 135-degree angle. Text in white. Hover state adds a soft glow (`box-shadow: 0 0 12px rgba(20, 184, 166, 0.4)`).
*   **Secondary Button:** Transparent background, primary teal text (`#0d9488`), and a thin ghost border of `#0d9488` at 30% opacity.
*   **Active States:** Highlight active navigation, selected doctor, or selected time slot with `#0d9488` border and accent background overlay.

### Form Inputs
*   Use floating labels style.
*   Focus transition: Border changes from neutral slate to `#0d9488` teal with a subtle teal glow outline.

---

## 6. Do's and Don'ts

### Do
*   **Do** use ample white space (`padding: 24px` or more on cards) to evoke cleanliness and calm.
*   **Do** right-align all numeric values (DNI, Phone) in lists/tables for rapid vertical scanning.
*   **Do** highlight current wizard step in the top progress bar with `#14b8a6` turquoise.

### Don't
*   **Don't** use generic stark colors (like pure `#000` black or basic bright blue).
*   **Don't** use thick solid black lines to partition pages.
*   **Don't** overcrowd content. Let elements breathe to make booking an appointment a stress-free experience.
