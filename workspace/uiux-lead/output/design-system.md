# Harmony Physio — Design System

Owner: UI/UX Lead · Status: Phase 1 + Phase 2 (full patient flow) ready for Milestone 1 client review · Last updated 22 Sep 2026

Penpot file **"New File 1"** `45145cff-4092-8110-8008-ac5896951a11`

| Page | Page ID |
|---|---|
| Design System | `bb6d782d-f1e9-8037-8008-ad149a6918c4` |
| Patient Booking | `bb6d782d-f1e9-8037-8008-ad17834b5d34` |
| Patient Account | `bb6d782d-f1e9-8037-8008-ad2209647079` |

### Design System page

| Board | ID | Size |
|---|---|---|
| Colour | `bb6d782d-f1e9-8037-8008-ad15159b6639` | 1336 × 1515 |
| Contrast & Accessibility | `bb6d782d-f1e9-8037-8008-ad15eff3eac9` | 980 × 1834 |
| Typography & Spacing | `bb6d782d-f1e9-8037-8008-ad1651f4b183` | 980 × 1912 |
| Components | `bb6d782d-f1e9-8037-8008-ad16d8677f0c` | 1080 × 1480 |
| Components II — Forms & navigation | `bb6d782d-f1e9-8037-8008-ad1d3d4dd299` | 1080 × 2119 |

### Patient Booking page

| Board | ID | Size |
|---|---|---|
| Step 1 Service / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad1e2ccd8fdf` | 1440 × 1358 |
| Step 1 Service / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad1e5d8cf861` | 390 × 1395 |
| Step 2 Clinician / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad1ec0b463d7` | 1440 × 1235 |
| Step 2 Clinician / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad1f14078bb3` | 390 × 1343 |
| Step 3 Slot selection / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad17a076d1c1` | 1440 × 868 |
| Step 3 Slot selection / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad1876fcf719` | 390 × 945 |
| Step 3 — No slots this week / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad180f4a921f` | 1440 × 1002 |
| Step 3 — No slots this week / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad18f11cdf01` | 390 × 1071 |
| Step 4 Your details / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad1f65540dbe` | 1440 × 2391 |
| Step 4 Your details / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad1fdacdd3b3` | 390 × 2843 |
| Step 5 Confirm / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad2025b81445` | 1440 × 2032 |
| Step 5 Confirm / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad20a6c2af53` | 390 × 2188 |
| Confirmed / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad211536e574` | 1440 × 1336 |
| Confirmed / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad21c9e9be67` | 390 × 1631 |

### Patient Account page

| Board | ID | Size |
|---|---|---|
| Sign in / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad2222cdc5b5` | 1440 × 840 |
| Sign in / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad2230200c3a` | 390 × 855 |
| Sign in — Wrong credentials / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad22244f2a39` | 1440 × 956 |
| Sign in — Wrong credentials / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad22321473f6` | 390 × 988 |
| Patient dashboard / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad22bfb0aaeb` | 1440 × 1653 |
| Patient dashboard / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad23abef1b81` | 390 × 1943 |
| Dashboard — New patient, no history / Desktop 1440 | `bb6d782d-f1e9-8037-8008-ad235767f4ed` | 1440 × 978 |
| Dashboard — New patient, no history / Mobile 390 | `bb6d782d-f1e9-8037-8008-ad2417f131a8` | 390 × 1625 |

Penpot local library: **46 colours**, **14 typographies**, **13 components**, **2 active token sets** (`harmony-primitives`, 75 tokens; `harmony-semantic`, 43 tokens).

An empty page named "Page 1" remains in the file. The Penpot plugin API (2.18.0) exposes `penpot.createPage` and `penpot.openPage` but **no page-removal method**, and `Page` has no `remove()`. It has to be deleted by hand in the Penpot UI.

---

## 1. The colour problem, and how it is solved

The mandated brand palette is four light pastels:

| Brand colour | Hex | Contrast vs white | Contrast vs black |
|---|---|---|---|
| Primary / periwinkle | `#9FA1FF` | 2.33:1 | 9.02:1 |
| Primary light | `#B5BAFF` | 1.84:1 | 11.43:1 |
| Sky accent | `#AEE2FF` | 1.39:1 | 15.12:1 |
| Mint accent | `#D9F9DF` | 1.13:1 | 18.57:1 |

None of the four reaches 3:1 against white, so none can be body text, a link colour, a focus ring, or a lone border. Two consequences drive the whole system:

1. **The pastels are used as fills and surfaces, with dark ink on top.** The primary button is `peri-400` filled with `ink-900` text (7.76:1), not white text on a saturated indigo. This keeps the brand colour visible at full strength while comfortably clearing AA.
2. **Darker derived steps do the interactive work.** `peri-600` (`#5050CE`) is the link, focus-ring and strong-boundary colour at 6.21:1 on white. `peri-700` is the pressed/hover text.

Every ramp is hue-anchored to the brand. Neutrals are tinted toward hue 238–240 so greys sit with the periwinkle; danger sits at hue 348° (violet-leaning crimson, not a stock alert red); warning sits at hue 32° and is muted rather than a saturated orange.

---

## 2. Primitive colour tokens

Token set `harmony-primitives` · token names `color.<family>.<step>` · Penpot library colours use the path `Family / family-step`. The step numbering matches Tailwind's convention, so these drop straight into `theme.extend.colors` in `apps/web/tailwind.config.ts`.

### Periwinkle — brand
| Token | Hex | Notes |
|---|---|---|
| `color.peri.50` | `#F0F0FF` | Ghost/secondary button hover wash |
| `color.peri.100` | `#E0E1FF` | Brand badge surface, avatar surface, current-step chip |
| `color.peri.200` | `#C7C8FF` | Subtle brand border |
| `color.peri.300` | `#B5BAFF` | **Mandated brand light** |
| `color.peri.400` | `#9FA1FF` | **Mandated brand primary** — primary button fill, selected slot |
| `color.peri.450` | `#8B8DF7` | Primary button hover |
| `color.peri.500` | `#7375E8` | Primary button pressed |
| `color.peri.600` | `#5050CE` | Link, focus ring, selected-state border |
| `color.peri.700` | `#3F3CAA` | Link hover, secondary/ghost button label |
| `color.peri.800` | `#353181` | Brand badge text |
| `color.peri.900` | `#29255B` | Reserved (dark surfaces, later phase) |

### Ink — neutrals
| Token | Hex | Notes |
|---|---|---|
| `color.ink.50` | `#F8F9FC` | Page background |
| `color.ink.100` | `#EEEFF6` | Sunken surface, disabled fill, neutral badge |
| `color.ink.200` | `#DFE1EC` | Card hairline, divider |
| `color.ink.300` | `#C8CADA` | Decorative divider, disabled border |
| `color.ink.400` | `#9C9EB4` | Decorative only — **never text, never a boundary** (2.64:1) |
| `color.ink.450` | `#8D8EA5` | **Interactive boundary** — lightest neutral clearing 3:1 |
| `color.ink.500` | `#71738E` | Placeholder, disabled label |
| `color.ink.600` | `#52536F` | Muted / helper text |
| `color.ink.700` | `#363654` | Secondary text |
| `color.ink.800` | `#23233E` | Reserved |
| `color.ink.900` | `#141429` | Body text, headings |
| `color.base.white` | `#FFFFFF` | Raised surface |

### Sky — informational
`color.sky.50` `#E5F6FF` · `color.sky.100` `#AEE2FF` (**mandated**) · `color.sky.500` `#1F77AD` · `color.sky.600` `#11598D` · `color.sky.700` `#0C426E`

### Mint — success
`color.mint.50` `#EFFDF2` · `color.mint.100` `#D9F9DF` (**mandated**) · `color.mint.200` `#AEE0BE` · `color.mint.500` `#2F935E` · `color.mint.600` `#1D7247` · `color.mint.700` `#155B3A`

### Rose — danger (hue 348°)
`color.rose.50` `#FFEBEE` · `color.rose.100` `#FDD8DE` · `color.rose.200` `#F4B9C3` · `color.rose.500` `#CB2A4A` · `color.rose.600` `#A71B37` · `color.rose.700` `#85142B`

### Amber — warning (hue 32°)
`color.amber.50` `#FFF7E5` · `color.amber.100` `#FDEAC4` · `color.amber.200` `#F5CC84` · `color.amber.500` `#B6690C` · `color.amber.600` `#935106` · `color.amber.700` `#743D06`

---

## 3. Semantic tokens

Token set `harmony-semantic` — every entry is an alias onto a primitive, so a re-theme changes one layer.

| Token | → primitive |
|---|---|
| `surface.page` | `color.ink.50` |
| `surface.raised` | `color.base.white` |
| `surface.sunken` | `color.ink.100` |
| `surface.brand-subtle` | `color.peri.50` |
| `surface.brand` | `color.peri.400` |
| `surface.brand-strong` | `color.peri.600` |
| `surface.info-subtle` | `color.sky.100` |
| `surface.success-subtle` | `color.mint.100` |
| `surface.danger-subtle` | `color.rose.100` |
| `surface.warning-subtle` | `color.amber.100` |
| `surface.disabled` | `color.ink.100` |
| `text.primary` | `color.ink.900` |
| `text.secondary` | `color.ink.700` |
| `text.muted` | `color.ink.600` |
| `text.on-brand` | `color.ink.900` |
| `text.on-dark` | `color.base.white` |
| `text.disabled` | `color.ink.500` |
| `text.link` | `color.peri.600` |
| `text.link-hover` | `color.peri.700` |
| `text.success` | `color.mint.700` |
| `text.danger` | `color.rose.700` |
| `text.warning` | `color.amber.700` |
| `text.info` | `color.sky.700` |
| `border.subtle` | `color.ink.200` |
| `border.default` | `color.ink.300` |
| `border.strong` | `color.ink.450` |
| `border.brand` | `color.peri.600` |
| `border.danger` | `color.rose.500` |
| `border.focus` | `color.peri.600` |
| `action.primary.bg` | `color.peri.400` |
| `action.primary.bg-hover` | `color.peri.450` |
| `action.primary.bg-pressed` | `color.peri.500` |
| `action.primary.text` | `color.ink.900` |
| `action.secondary.bg` | `color.base.white` |
| `action.secondary.border` | `color.peri.600` |
| `action.secondary.text` | `color.peri.700` |
| `action.secondary.bg-hover` | `color.peri.50` |
| `action.ghost.text` | `color.peri.700` |
| `action.ghost.bg-hover` | `color.peri.50` |
| `action.disabled.bg` | `color.ink.100` |
| `action.disabled.text` | `color.ink.500` |
| `focus.ring` | `color.peri.600` |
| `focus.offset` | `color.base.white` |

> `text.secondary` and `text.muted` were originally aliased to `ink-600`/`ink-500`. They were moved up one step after measurement: `ink-500` on the `ink-50` page background is **4.39:1**, which fails 4.5:1. `ink-500` is now placeholder/disabled only.

---

## 4. Measured contrast

All ratios computed with the WCAG 2.1 relative-luminance formula. Targets: **4.5:1** body text (SC 1.4.3), **3:1** non-text UI boundaries and focus indicators (SC 1.4.11, 2.4.11).

### Text pairs (target 4.5:1)
| Use | Pair | Ratio | Result |
|---|---|---|---|
| Body text | ink-900 on white | **18.07:1** | PASS |
| Body text on page | ink-900 on ink-50 | **17.17:1** | PASS |
| Secondary text | ink-700 on white | **11.59:1** | PASS |
| Muted / helper text | ink-600 on ink-50 | **7.06:1** | PASS |
| Placeholder | ink-500 on white | **4.62:1** | PASS |
| Link | peri-600 on white | **6.21:1** | PASS |
| Link hover | peri-700 on white | **8.61:1** | PASS |
| Button primary label | ink-900 on peri-400 | **7.76:1** | PASS |
| Button primary hover | ink-900 on peri-450 | **6.24:1** | PASS |
| Button primary pressed | ink-900 on peri-500 | **4.68:1** | PASS |
| Button secondary label | peri-700 on white | **8.61:1** | PASS |
| Text on sky surface | ink-900 on sky-100 | **13.02:1** | PASS |
| Text on mint surface | ink-900 on mint-100 | **15.98:1** | PASS |
| Badge — success | mint-700 on mint-100 | **7.17:1** | PASS |
| Badge — danger | rose-700 on rose-100 | **7.53:1** | PASS |
| Badge — warning | amber-700 on amber-100 | **7.35:1** | PASS |
| Badge — info | sky-700 on sky-100 | **7.49:1** | PASS |
| Badge — neutral | ink-700 on ink-100 | **10.10:1** | PASS |
| Badge — brand | peri-800 on peri-100 | **8.59:1** | PASS |
| Disabled label | ink-500 on ink-100 | **4.03:1** | **FAIL — exempt, see below** |

### Non-text pairs (target 3:1)
| Use | Pair | Ratio | Result |
|---|---|---|---|
| Input / control border | ink-450 on white | **3.21:1** | PASS |
| Input border on page bg | ink-450 on ink-50 | **3.05:1** | PASS |
| Focus ring | peri-600 on white | **6.21:1** | PASS |
| Error border | rose-500 on white | **5.29:1** | PASS |
| Divider | ink-300 on white | **1.63:1** | decorative — exempt (SC 1.4.11 applies only to boundaries required to identify a control) |
| **Pastel as lone boundary** | peri-400 on white | **2.33:1** | **FAIL — prohibited, see below** |

### Phase 2 additions — new pairings, measured

Introduced when the rest of the patient flow was built. Same method, same targets.

| Use | Pair | Ratio | Result |
|---|---|---|---|
| Inactive tab label, select chevron | ink-600 on white | **7.43:1** | PASS |
| Text on a selected card (peri-50 wash) | ink-900 on peri-50 | **16.02:1** | PASS |
| Card meta text on peri-50 | ink-600 on peri-50 | **6.59:1** | PASS |
| Card body text on peri-50 | ink-700 on peri-50 | **10.27:1** | PASS |
| Info alert body | ink-700 on sky-50 | **10.46:1** | PASS |
| Success alert body | ink-700 on mint-50 | **11.04:1** | PASS |
| Warning alert body | ink-700 on amber-50 | **10.86:1** | PASS |
| Danger alert body | ink-700 on rose-50 | **10.13:1** | PASS |
| Alert title, any tint | ink-900 on the -50 tints | **15.81 – 17.22:1** | PASS |
| Checkbox tick | white on peri-600 | **6.21:1** | PASS |
| Consent "given" tick | white on mint-600 | **5.92:1** | PASS |
| Disabled clinician tag | ink-600 on ink-200 | **5.70:1** | PASS |
| Disabled clinician card text | ink-500 on ink-100 | **4.03:1** | exempt (SC 1.4.3, inactive component) |
| Avatar initials | peri-800 on peri-100 | **8.59:1** | PASS |
| Active tab underline | peri-600 on white | **6.21:1** | PASS |

**Two new boundary limits found and designed around:**

- **ink-450 on peri-50 = 2.84:1** and **ink-450 on ink-100 = 2.80:1** — both below the 3:1 required by SC 1.4.11. Rule added: `border.strong` (ink-450) is only valid on **white or ink-50**. On a peri-50 wash the boundary is peri-600; on an ink-100 sunken surface the control moves to white. No control in any screen breaks this.
- **ink-500 on ink-200 = 3.55:1** — passes 3:1 for boundaries but fails 4.5:1 for text. It is used for boundaries only.


### Pairs that failed, and what was done

**1. Disabled label — ink-500 on ink-100, 4.03:1.**
WCAG 1.4.3 explicitly exempts text that is part of an inactive user-interface component. Kept, because a disabled control that meets full contrast does not read as disabled. Mitigated: the disabled state is never colour-alone — the control also loses its border, loses its shadow, gets `cursor: not-allowed`, and carries `aria-disabled="true"`. Documented on the Contrast board in Penpot.

**2. peri-400 as a lone boundary — 2.33:1 on white.**
Not accepted — it is a design rule instead. The brand pastel is never used as a lone border, outline or sole state signal. Every peri-400 filled surface sits against an `ink-450` or `peri-600` boundary, and the focus ring is always `peri-600`. The selected time slot in the booking screen therefore carries a 2px `peri-600` border on top of its `peri-400` fill.

**3. amber-500 (`#B6690C`) on white — 4.19:1.**
Caught during derivation, before it shipped anywhere. Warning text uses `amber-600` (6.14:1) or `amber-700` (8.70:1). `amber-500` is border/icon only.

**4. ink-500 on ink-50 page background — 4.39:1.**
Caught during derivation. `text.muted` was re-aliased from `ink-500` to `ink-600` (7.06:1).

### Focus ring construction
The ring is `peri-600`, 3px, with a 2–3px `#FFFFFF` offset between the ring and the control. Measured against the surrounding page (white or `ink-50`) the ring is 6.21:1 / 5.90:1 — comfortably past the 3:1 required by SC 2.4.11. The white offset is what makes the ring legible when it wraps a `peri-400` button, where a ring-on-fill measurement would only be 2.67:1.

---

## 5. Type scale

Typeface: **Inter** (`gfont-inter` in Penpot; already wired into `apps/web` as `--font-inter`). A 1.25 modular scale rounded to whole pixels, line heights snapped to the 4px grid.

| Token | Size / line-height | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| `display` | 40 / 48 | 700 | −0.02em | Confirmation and marketing headers. Drops to 32/40 below 768px |
| `h1` | 32 / 40 | 700 | −0.015em | One per screen |
| `h2` | 24 / 32 | 600 | −0.01em | Section headers |
| `h3` | 20 / 28 | 600 | −0.005em | Card titles |
| `body-lg` | 18 / 28 | 400 | 0 | Lead paragraphs, patient-facing |
| `body` | 16 / 24 | 400 | 0 | Default. Never below 16px on patient-facing screens |
| `body-strong` | 16 / 24 | 600 | 0 | Inline emphasis |
| `body-sm` | 14 / 20 | 400 | 0 | Dense clinician tables, metadata |
| `caption` | 13 / 18 | 400 | 0 | Timestamps, footnotes. Smallest size in the system |
| `label` | 14 / 20 | 600 | +0.005em | Form field labels |
| `button` | 16 / 24 | 600 | +0.005em | Default control label |
| `button-sm` | 14 / 20 | 600 | +0.005em | Compact controls, 36px |
| `overline` | 12 / 16 | 600 | +0.08em, uppercase | Eyebrow labels. Never a sentence |
| `numeric-lg` | 20 / 28 | 600 | 0 | Times and prices — 09:30, £68.00 |

Font-size tokens are also registered as `font.size.*` in `harmony-primitives`.

---

## 6. Spacing, radius, elevation

**Spacing — 4px base.** Token names map 1:1 onto Tailwind spacing units (`space-4` = Tailwind `p-4` = 16px).

`space.0` 0 · `space.1` 4 · `space.2` 8 · `space.3` 12 · `space.4` 16 · `space.5` 20 · `space.6` 24 · `space.8` 32 · `space.10` 40 · `space.12` 48 · `space.16` 64 · `space.20` 80

Everything below 16px is a multiple of 4; everything at or above 16px is a multiple of 8.

**Radius.** `radius.sm` 4 · `radius.md` 8 · `radius.lg` 12 · `radius.xl` 16 · `radius.full` 999
Buttons and inputs share `radius.md`; cards use `radius.lg`; badges use `radius.full`.

**Border width.** `border.hairline` 1px · `border.thick` 2px · `border.focus` 3px

**Elevation.** Near-black at very low opacity. No coloured or glowing shadows.
- `shadow-1` — `0 1px 2px rgba(20,20,41,.06)` — cards at rest
- `shadow-2` — `0 2px 8px rgba(20,20,41,.08)` — hovered/raised cards, popovers
- `shadow-3` — `0 8px 24px rgba(20,20,41,.10)` — modals, sticky bars

---

## 7. Component inventory

Thirteen Penpot library components, all built on flex layouts so they size from content.

### Phase 1 — `Components` board

| Component | Library path | States drawn |
|---|---|---|
| Button — Primary | `Button / Primary` | Default, Hover, Pressed, Disabled, Focus |
| Button — Secondary | `Button / Secondary` | Default, Hover, Pressed, Disabled, Focus |
| Button — Ghost | `Button / Ghost` | Default, Hover, Pressed, Disabled, Focus |
| Text input | `Input / Text field` | Default, Focused, Error, Disabled — each with label + helper/error text |
| Status badge | `Badge / Status` | Confirmed, Awaiting payment, Cancelled, Telehealth, Completed, New patient |
| Card | `Card / Appointment` | Appointment card and clinician card specimens |

### Phase 2 — `Components II — Forms & navigation` board

| Component | Library path | States drawn |
|---|---|---|
| Checkbox | `Form / Checkbox` | Unchecked, Checked, Focus, Error, Disabled — with label and description |
| Radio | `Form / Radio` | Unselected, Selected, Focus, Disabled |
| Select | `Form / Select` | Default, Focus, Disabled |
| Selectable card | `Form / Selectable card` | Unselected, Selected |
| Tabs | `Navigation / Tabs` | 4 tabs, one active |
| Avatar | `Media / Avatar` | sm 32px, md 40px, lg 56px |
| Alert | `Feedback / Alert` | Info, Success, Warning, Danger |

**Button.** 48px tall, 12/20 padding, `radius.md`, `button` typography. Small size drops to 8/14 and `button-sm` (36px tall).

**Text input.** Label above — never placeholder-as-label. Helper or error text below. 48px field, 12/14 padding, `radius.md`, `ink-450` 1px border. Focused: `peri-600` 2px border plus focus ring. Error: `rose-500` 2px border, `rose-700` message beginning with the word "Error", and `aria-invalid`. Three signals, so colour is never alone.

**Checkbox.** 20px box inside a 44px touch target. 2px border when checked or in error. Label *and* description are both part of the clickable label. Never pre-ticked — this component exists mainly to carry granular GDPR consent.

**Radio.** Selected state is a 6px ring rather than a filled dot, so the shape difference survives greyscale and does not depend on the fill colour reading as "on".

**Select.** The chevron is two rotated rectangles, not a font glyph and not an emoji.

**Selectable card.** A radio in card clothing, used for service and clinician choice. Selected changes three things at once: 2px `peri-600` border, `peri-50` wash, and the filled radio ring.

**Tabs.** Active tab: 3px `peri-600` underline and `peri-700` label. Inactive: `ink-600` on white (7.43:1) over a 1px `ink-200` rule. Labels shorten on mobile (Upcoming / Past / Docs / Consent) so all four fit inside 358px rather than scrolling off-screen.

**Avatar.** Initials only. No photographs of clinicians or patients are stored, which keeps the component out of GDPR scope entirely.

**Alert.** Tinted surface, hairline border, 3px accent bar. The bar is a non-colour shape cue, and the title always states the condition in words.

**Card.** White surface, 1px `ink-200` hairline, `radius.lg`, `shadow-1`, 20px padding. The hairline separates; the shadow only lifts the card off the `ink-50` page. Interactive cards gain a 2px `peri-600` border on hover — never a colour wash.

---

## 8. The patient flow

Every screen exists at desktop 1440 and mobile 390. Data maps to the real API contract and Prisma schema — `scheduledAt`, `durationMinutes` (45 and 30, both valid multiples of 15 per the POST `/api/appointments/` rule), `clinicianId`/`clinicianName`, `type: IN_PERSON | TELEHEALTH`, `status`, `nhsNumber`, `medicalAlerts`, `gpPractice`, `preferredLanguage`, `requiresInterpreter`, `consentGivenAt`/`consentVersion`, and amounts in pence rendered as £68.00.

Content is real UK clinical copy throughout: Harmony Physio, 14 Boyce's Avenue, Clifton, Bristol BS8 4AA · 0117 496 0182 · patient Amara Okonkwo, 42 Cotham Hill, Bristol BS6 5QR, 07700 900142 · clinicians Nadia Karim MCSP (HCPC PH104728), Tom Whitfield MCSP (PH098311), Callum Doherty MCSP (PH121944), Priya Raghunathan MCSP (PH115206) · GP practice Whiteladies Health Centre · UK dates ("Tue 29 Sep 2026").

### Step 1 — Service selection
In-person vs video appointment as a radio pair, then six real appointment types as selectable cards with duration and price: Initial assessment 45 min £68.00, Follow-up treatment 30 min £48.00, Extended follow-up 45 min £62.00, Post-operative rehabilitation 45 min £72.00, Sports injury assessment 45 min £72.00, Women's health physiotherapy 45 min £72.00. An info alert routes NHS-referred patients to the phone, because NHS-funded appointments are booked by the referring practice. Desktop carries a "what happens next" aside; mobile carries a sticky bar with the running selection.

### Step 2 — Clinician selection
A "First available clinician" option sits above the named list and shows the earliest slot across the team. Four clinician cards carry avatar, name, discipline, MCSP membership, HCPC registration number, next available slot, a real bio and specialism tags. Priya Raghunathan is drawn in the **unavailable** state — she is a pelvic health physiotherapist, so she cannot take an initial musculoskeletal assessment, and the card says so and tells the patient how to reach her. The aside explains how to verify an HCPC number on the public register.

### Step 3 — Date and time
Week navigator, a 7-day selector with per-day slot counts, morning and afternoon slot groups with booked times greyed and non-interactive, and a running summary aside. Empty state at both widths: "No slots available this week" names the next real opening (Thu 8 Oct, 14:15) and offers three routes out — jump to that date, join the cancellation list, or switch clinician / telehealth / phone.

### Step 4 — Your details
New-vs-returning patient choice, then four fieldsets: your details, clinical details, access and communication, and consent. The NHS number field is drawn in its **error** state ("Error: an NHS number must be 10 digits. Leave blank if you do not have one to hand."), reusing the Phase 1 error pattern. The access fieldset is labelled as being asked under the Equality Act 2010 and the NHS Accessible Information Standard, and states that interpreters are free.

**Consent — the DTAC-critical part.** Presented in its own fieldset with a 2px `peri-200` border so it reads as distinct. Six separate checkboxes, **every one unticked**:
- *Required to book* — "I have read the privacy notice" (v2.1, 14 August 2026), whose description states that clinical records are held under **UK GDPR Article 9(2)(h) — provision of health care**, not consent, and kept for 8 years after the last appointment.
- *Optional, each a separate consent* — share a summary with my GP · email reminders · SMS reminders · anonymised outcome scores · clinic news and health advice (explicitly labelled as marketing and explicitly separate from reminders).

Nothing is bundled, nothing is pre-ticked, and the fieldset states that withdrawing is as easy as giving. An info alert names the subject-access, rectification and erasure routes, the DPO address and the ICO.

### Step 5 — Review and confirm
"Nothing is booked until you press confirm", with the 10-minute slot hold stated. Four review blocks each with their own "Change" link: appointment, your details, what you consented to (every consent listed with Given / Not given, so the patient sees the negatives too), and payment. Payment offers pay-at-the-clinic, pay now by card (stating that card details go to Stripe's own form and Harmony Physio never sees the number), or invoice my insurer. A "what to bring and what to expect" block gives real clinical detail. The cancellation policy is a warning alert, not fine print.

### Booking confirmed
Reference HP-2026-04817, appointment detail, add-to-calendar and view-in-account actions, a four-point timeline of what happens and when, and a "what we have sent" aside that honestly says the SMS was **not** sent because the patient did not consent to it. An account-ready callout explains the password-setting link.

### Sign in — default and wrong credentials
Centred card. Email and password, stay-signed-in, forgotten-password entry point, and a clear "you do not need an account to book" route for new patients. The error state shows a danger alert — "We could not sign you in" — that deliberately does not say which field was wrong, states the remaining attempts and the 15-minute lockout, and puts both fields in the error border state.

### Patient dashboard — populated and empty
Populated: next-appointment hero with add-to-calendar / reschedule / cancel, tabs (Upcoming, Past appointments, Documents, Consent), two more upcoming appointments including one **Awaiting payment**, three past appointments including a real **Missed** entry with the £24.00 charge, a documents list with a new exercise programme, and an aside with quick actions, a consent summary showing On/Off per consent, the patient's details and a data-rights card with a "Download my data" action.

Empty state for a brand-new patient with no history: "You have no appointments yet", a first-booking CTA and the clinic phone number, a "what you will find here" explainer, a "finish your profile" card naming the two genuinely missing fields (GP practice, medical alerts) while making clear neither blocks booking, and a consent card that states plainly that no optional consents have been given and none is required.

---

## 9. Rules this system enforces

1. The four brand pastels are surfaces and fills only. They never carry text and never act as a lone boundary or a sole state signal.
2. Every text-bearing pair is measured, not assumed. New pairs get a measured ratio before they ship.
3. `border.strong` (ink-450) is only valid on white or ink-50. On peri-50 the boundary is peri-600; on ink-100 the control moves to white.
4. No state is communicated by colour alone — error, success, disabled and selected each carry at least one non-colour signal (wording, border weight, shape, ARIA).
5. Consent is never pre-ticked, never bundled, and always granular. Optional consents are visibly separated from the one required item, and marketing is separated from service messages.
6. 4px rhythm everywhere. No arbitrary sizes.
7. Body text never drops below 16px on patient-facing screens; 13px `caption` is the floor anywhere.
8. Focus is always visible, always `peri-600`, always with a white offset.
9. Empty states always name a cause and offer at least one real route forward.
10. No gradients, no glassmorphism, no emoji as icons, no decorative illustration.

---

## 10. What is finished, and what is not

### Finished
- Full design system: tokens, colour, contrast, type, spacing, 13 library components.
- **Entire patient flow at both breakpoints** — booking steps 1, 2, 3, 4 and 5; the step-3 empty state; the booking-confirmed screen; sign in with its wrong-credentials state; and the patient dashboard with its new-patient empty state. 22 screen boards in total.

### Not started — out of scope for this phase, by instruction
Telehealth (waiting room, in-call UI, post-call); the entire clinician-facing side (diary, patient list, EHR Lite SOAP notes, clinical safety alerts); billing and admin (invoices, Stripe Elements screens, insurer claims, reporting); the GDPR admin layer (RBAC management, audit log viewer, right-to-erasure workflow); and the clinic's public marketing site.

### Known gaps inside the patient flow
- Only the **Upcoming** dashboard tab has its panel drawn. The Past appointments, Documents and Consent tabs are reachable in the design but their dedicated full-page panels are not separate boards — representative content for all three is shown inline on the Upcoming view instead.
- **Forgotten-password and password-reset screens** are not drawn. The entry point exists on sign in; the flow behind it does not.
- **Reschedule and cancel flows** are not drawn. The buttons exist on the dashboard and the confirmation screen; the confirmation dialogs behind them do not.
- **Message the clinic** is a button on the dashboard with no screen behind it.
- The **account-locked** state (after the attempts run out) is described in the error copy but not drawn.
- No **date-picker** component — the booking flow uses day chips and slot buttons, so one was not needed. If a free-form date field appears later it will need building.
- No dark mode, no motion specification, no breakpoints between 390 and 1440.
- The **Tailwind theme is still untouched**: `apps/web/tailwind.config.ts` and `apps/web/app/globals.css` still hold the scaffold's placeholder sky/teal palette. Tokens are named to drop straight in, but that edit has not been made.
- An empty **"Page 1"** remains in the Penpot file. The plugin API has no page-removal method; it needs deleting by hand in the Penpot UI.
