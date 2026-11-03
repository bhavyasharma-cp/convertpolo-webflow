# Brand Case Studies template — sections removed 2026-11-03

Removed from the Brand Case Studies template page (`6ad85dcffcc7c76175a7d2df`) at the client's
request: everything after the four step panels. The page now ends with `section_bbs-steps`,
then the footer.

| Section | Element id | Held |
|---|---|---|
| `section_bbs-gallery` | `c5148ee0-08d3-21f5-3b22-f93bd2454820` | the four-image collage |
| `section_bbs-brand` | `724a2c1f-1091-b014-d20b-fca840826a1f` | Brand Strategy copy + the four colour swatches |
| `section_bbs-type` | `9bbd821a-8f5a-0f62-df24-35016e097878` | the typography specimen panel |

**Why.** The Karma & Luck design has no palette block and no type specimen, and its collage
in Figma is the KNEETOES collage reused as placeholder art — so all three sections had either
the wrong brand's imagery or nothing at all. Rather than carry empty panels, the client chose
to cut the page at step 4.

**The CMS fields still exist** and are simply no longer rendered: `gallery-1---box`,
`gallery-2---tote`, `gallery-3---product`, `gallery-4---billboard`, `brand-strategy-2`,
`palette-colour-1`…`4`, `typography-image`. Their values are intact, so rebuilding the sections
is a layout job, not a content one. The KNEETOES values are in
`kneetoes-brand-item-backup.json`; the static `/kneetoes` page still shows all three sections
as originally designed, which is the closest thing to a visual reference.

**Note on `brand-strategy-2`:** that copy *was* genuine Karma & Luck content from Figma. It is
no longer shown anywhere. If the Brand Strategy panel is ever wanted back, the text is already
in the item.
