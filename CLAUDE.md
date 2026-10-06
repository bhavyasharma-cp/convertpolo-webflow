# ConvertPolo 3.0 — Webflow Build

Rebuilding convertpolo.com (currently WordPress) in **Webflow**, matching the Convertpolo 3.0
Figma file exactly. The design is final: match it, do not reinterpret it.

Non-developers must be able to build new pages after launch, so every section is a
**Webflow component with properties**, never a one-off layout.

---

## Sources of truth

| What | Where |
|---|---|
| Design | Figma file `ilR0e7FUzxMXN2TgwhvSgm` (Convertpolo 3.0), section **DEV READY** (`123:6106`) |
| Home (desktop) | `117:3974`; card states `117:4585`, `117:5263` |
| Home (mobile) | `123:6107` |
| Full-screen menu | `1:12991` |
| Intro loader sequence | `1:10975` → `1:11076` |
| Webflow site | `convertpolo-3-0` (Designer: convertpolo-3-0.design.webflow.com) |

Read sizes, colours and timings from Figma; never estimate them. Prototype timings
(Smart Animate durations, easings) are readable through the Figma Plugin API (`reactions`).

---

## Working with the Webflow MCP

- Designer tools only work while the Webflow Designer is open in the browser **with the
  Webflow MCP Bridge App running** (press E in the Designer → Apps). If a Designer call
  fails, ask the user to check that first.
- Build one section at a time and verify each against the Figma screenshot before moving on.
- **After every change or fix, republish to staging yourself without asking** — Webflow
  subdomain only (`convertpolo-3-0.webflow.io`), never a custom domain — then tell the user to
  hard refresh (Ctrl + Shift + R). The Designer's Preview does not run custom code unless
  "Enable custom code?" is switched on.
- **Never publish to production / a custom domain, change the domain, change hosting/billing, or
  delete pages, components or CMS collections without asking first.**
- Three developers work in the Designer in parallel. Only one person edits a given page at a
  time; confirm which page is free before editing it.

---

## Class naming — Client-First (Finsweet)

All styling follows **Client-First**. Do not invent a second system.

- Custom classes: `[folder]_[element]`, e.g. `home-hero_card`, `header_logo`, `service-card_title`.
- Utility classes: Client-First utilities (`padding-global`, `container-large`,
  `padding-section-large`, `heading-style-h1`, `text-size-medium`, `button`, `is-secondary`).
- Combo classes for variants start with `is-`: `service-card_component is-active`.
- No styling on bare tags beyond the base styles; no `!important`.

## Design tokens

- Colours, font sizes, spacing and radii are **Webflow variables**, created from the Figma file.
- Styles reference variables, never raw hex or px values that a variable already covers.

## Breakpoints

- Figma provides **1440 desktop** and **390 mobile**. Build desktop first, then Webflow's
  991 / 767 / 478 breakpoints.
- Tablet scales proportionally between the two Figma designs unless the designer says otherwise.

---

## Animation

Two layers, decided per animation:

1. **Webflow Interactions** (GSAP-powered) for simple motion: reveals, statement headlines,
   hovers, marquees, menu open/close, card expand.
2. **Custom GSAP code in this repo** for what Interactions cannot do: the infinity sequence
   (CRO page), the circle sequence (Landing Page Optimization page) and the intro loader.

Custom code rules:

- One file per animation in `scripts/` (e.g. `scripts/infinity-sequence.js`).
- Repo `bhavyasharma-cp/convertpolo-webflow` is **private**, so jsDelivr cannot serve it.
  Cloudflare Pages deploys `scripts/` on every push to `main`; Webflow loads each file with one
  `<script>` tag from the Pages URL. Webflow's custom-code boxes are capped (~10,000 chars
  site-wide, ~5,000 per page), so code never lives inside Webflow.
- Webflow already loads GSAP core (3.15.0, from `cdn.prod.website-files.com/gsap/`); never load a
  second copy. Plugins come from the same path and version.
- Loading: the Webflow-registered inline script **CPAnimations** (id `cpanimations`) injects
  ScrollTrigger and the Pages-hosted files in order. It is applied per page with
  `set_page_scripts` (the API cannot write the site-wide or freeform custom-code boxes on this
  site). To add an animation: add its URL to the loader's list, bump the loader version, and
  apply it to the pages that need it. Scripts must wait for `window.gsap` — Webflow injects it late.
- Scripts find their section by a data attribute, never by class: `data-cp="infinity"`,
  `data-cp="circle"`, `data-cp="intro"`. Each script initialises every instance on the page,
  so editors can reuse the component anywhere.
- Animate only `transform` and `opacity`. Respect `prefers-reduced-motion`: show the final
  still state.
- A failing script must never break the page: guard every query, wrap risky code in
  `try/catch`, log with `console.debug`.

---

## CMS collections

Blog posts · Case studies · Testimonials · Team · Jobs · Services. Content is migrated from the
WordPress site by CSV import. Keep existing URLs or add 301 redirects.

## Plan (4 weeks, 3 developers)

| | Weeks 1–2 | Week 3 | Week 4 |
|---|---|---|---|
| Dev 1 — Animation | Infinity sequence | Circle sequence, intro loader | QA + launch |
| Dev 2 — CMS & content | Collections, CMS templates, import | Forms → CRM, redirects, SEO | QA + launch |
| Dev 3 — Pages & UI | Design system, header/footer, ~20 section components | Assemble all pages | QA + launch |

## Open decisions (check before building the affected part)

- Step sequences: driven by scroll, by the ‹ › buttons, or both
- Intro loader: every visit or once per session
- Languages: keep the live site's 10 or drop
- Footer phone: +91 8910262986 (Figma) or +91 7338623107 (live)
- Audit-form leads: email only, or which CRM
