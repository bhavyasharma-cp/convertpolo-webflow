# Case studies — current state (2026-11-03)

The site was reduced to a short, curated set of case studies. This file records what is
live, what was removed, and the open questions.

## What is live

| Study | Collection | Item id | URL |
|---|---|---|---|
| Karma & Luck | Brand Case Studies `6ad85dcffcc7c76175a7d2d9` | `6ad86dd886e394a0d055014d` | `/brand-case-studies/karma-and-luck` |
| Beyond By Vera | Case Studies (CRO) `6ad85c3e7553c7d8884b6223` | `6ad86767f7124286cf3cf2b1` | `/casestudies/beyond-by-vera` |
| AnotherSole | Case Studies (CRO) | `6ad8641a7816268cf0485589` | `/casestudies/anothersole-product-discovery-improvement` |
| MyRivaaz | Case Studies (CRO) | `6ae9d04b43d07be10c13a069` | `/casestudies/myrivaaz` |

Four studies, not the three originally scoped — AnotherSole was kept at the client's
request. Site CMS item count is 48 of the free plan's 50.

## What was removed

Deleted CMS items (irreversible; full field data backed up here first):

- Theater — `theater-cro-item-backup.json`
- TryEvolv — `tryevolv-cro-item-backup.json`

AnotherSole was backed up too (`anothersole-cro-item-backup.json`) before the decision
changed; the item itself is still live.

Two standalone static pages duplicated case-study content and are now **drafts**, so they
no longer publish:

- `/anothersole` — page `6acf6bfc73a569eae769eb08`
- `/kneetoes` — page `6ad33cc9eed7843699f7fde5`

Neither the Data API nor the Designer API can delete a page, so the actual deletion has to
be done by hand in the Designer. Until then they still exist there. Note that `/kneetoes`
is the last visual reference for the three sections cut from the brand template — see
`bbs-template-removed-sections.md` before deleting it.

## Gotchas found while doing this

**`bulk_update_pages` silently drops `draft`.** It returns `200` with `draft: false` and
changes nothing. `update_page_settings`, one page per call, applies it correctly.

**Stat values must not include a leading `+`.** The CRO template renders a dedicated
`study-stat_plus` element before every stat, so a value of `+35.08%` comes out as
`++35.08%`. Store `35.08%`.

**Empty screen fields still render the phone shells.** `experiment-N---screen-1/2` left
null do not hide the phone mockups — the page shows empty phone outlines. Beyond By Vera
has this on all three experiments (see below).

**The result-image slot is width-driven, not fixed.** It renders at 1180 wide with auto
height, `object-fit: fill`, so images of different aspect ratios all work. The help text's
"1180x532" is a guide, not a constraint.

**The desktop design nodes are not page specs.** `1:11565` (CRO) and `1:11585` (brand) are
single 1440x1024 entry-animation boards carrying lorem ipsum, not full-page layouts. The
full-page specs are the mobile nodes — `1:2354` (CRO, 390x5347) and `1:2453`
(brand, 390x8260).

## Open questions

**1. Brand design still shows the three removed sections.** The brand mobile spec
`1:2453` still ends with the gallery collage, Brand Strategy + logo panel + colour palette,
and the Typography specimen — all using KNEETOES placeholder art. The built page
intentionally stops after step 04, per `bbs-template-removed-sections.md`. The design and
the build disagree; the build was not changed either way. Decide whether the Figma file
should be updated to match, or the sections rebuilt.

**2. Beyond By Vera is missing all six control/variation screens.** Its page renders empty
phone shells. The screens exist in the content Figma file (board `519:2069`) but are
composited rather than single images, so extracting them needs per-case decisions:

| Experiment | Control | Variation |
|---|---|---|
| 01 Sticky Add to Cart | `519:2161` (image 351) | `534:2` — base `519:2196` plus scrollbar slivers `519:2197`–`519:2202` and bar `519:2208` |
| 02 Cart Drawer | `519:2172` (image 350) | `519:2176` (image 341) |
| 03 Cart Recovery Popup | `519:2149` (image 353) with popup overlay `519:2153` (image 352) | `519:2147` (image 342) |

Some of these are bare screenshots and some have the phone frame baked in, which would
double up inside the template's own phone mockup. Not attempted — needs a decision.

**3. MyRivaaz experiment 01 loses a stat.** Its Figma board gives experiment 01 two stats
(`+35.08%` Add-to-Cart and `49.64%` Bestsellers category clicks), but the template renders
only one stat card for experiment 01 by design — the collection has no
`experiment-1---stat-2-*` fields. The Add-to-Cart stat is the one shown; the Bestsellers
figure is not on the page. Add the fields, or accept the cut.

**4. MyRivaaz experiment 03 has no phone screens.** Its control and variation in Figma
(`519:1873` / `519:1876`) are desktop-width panels, but the template's screen slots are
portrait phone mockups. Left empty, so experiment 03 shows two empty phone shells.

**5. MyRivaaz publish date is a placeholder.** Set to 2026-11-03 (the build date) because
the content file carries no date. It drives the order of the Case Studies grid.

**6. The Karma & Luck listing card shows no stats.** The Case Studies grid card pulls its
two figures from the CRO collection's Overall impact fields, which the Brand collection
does not have, so the brand card renders with an empty stat row.

## How MyRivaaz was built

Copy came from `figma-content-a.json` (page `MyRivaaz`, board `519:1760`). Images were
exported from that board rather than captured from the live store:

- Hero — node `519:1765` at scale 4, cropped to the slot's 1149x746 ratio, 2298x1492 JPEG
- Result panels — each experiment has **two** tables in Figma (a Primary and a Secondary
  metric) against the template's one slot, so the pair was composited into a single tall
  image preserving Figma's order and gap
- Screens — experiment 01 `519:1846` / `519:1849`, experiment 02 `952:1746` / `952:1747`,
  exported at scale 3 and resized to 700px wide (about 3x the 235px slot)
