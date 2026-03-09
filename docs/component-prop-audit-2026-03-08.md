# Component Prop Surface Audit (Class-First)

Date: 2026-03-08
Scope: `src/lib/components/**/*.svelte`

## Executive Summary

- Audited 55 custom components.
- Strict scoring applied to the 12 reusable primitives first; secondary scoring applied to domain orchestration components.
- Current customization contract is inconsistent: only 8/55 components support a `class` prop and only 2/55 support `...rest` attribute forwarding.
- Highest leverage changes are in form primitives (`FormInput`, `FormTextarea`, `FormSelect`): they currently expose large, manually enumerated prop surfaces but do not forward native attributes.

### Score Distribution

- `P0`: 3 components
- `P1`: 10 components
- `P2`: 7 components
- `P3`: 35 components

## Method

1. Parsed each component's `$props` signature.
2. Counted invocation usage across all `.svelte` files in `src/`.
3. Counted per-prop call-site usage frequency.
4. Classified props into categories: `data`, `behavior`, `styling`, `layout`, `callback`.
5. Applied rubric:

- `P0`: API complexity blocks common customization or drives call-site churn.
- `P1`: API is workable but has avoidable complexity or one-off style/layout coupling.
- `P2`: mostly fine, minor simplification opportunity.
- `P3`: no immediate action needed.

Notes:

- `children` usage is undercounted in frequency extraction because snippet body content is not an attribute.
- Category split is heuristic and intended for complexity trend analysis, not type-system truth.

## Full Matrix

| Component                 | Score | Props | Split (D/B/S/L/C) | Class | Rest | Uses | Primitive |
| ------------------------- | ----: | ----: | ----------------- | ----: | ---: | ---: | --------: |
| FormInput                 |    P0 |    16 | 5/10/1/0/0        |     Y |    N |   40 |         Y |
| FormTextarea              |    P0 |    12 | 4/6/1/1/0         |     Y |    N |    7 |         Y |
| FormSelect                |    P0 |    10 | 4/5/1/0/0         |     Y |    N |   13 |         Y |
| GalleryDetailViewer       |    P1 |    20 | 11/2/0/0/7        |     N |    N |    1 |         N |
| AdminPhotoCard            |    P1 |    16 | 8/2/0/0/6         |     N |    N |    3 |         N |
| AdminPhotosBulkPanel      |    P1 |    18 | 10/0/0/0/8        |     N |    N |    1 |         N |
| AdminPhotoCardCompact     |    P1 |     8 | 5/1/0/0/2         |     N |    N |    1 |         N |
| AdminPhotosFilterForm     |    P1 |    13 | 10/0/0/2/1        |     N |    N |    1 |         N |
| AdminButton               |    P1 |    10 | 3/3/3/1/0         |     Y |    Y |   58 |         Y |
| AdminCreateListLayout     |    P1 |    10 | 9/0/0/1/0         |     N |    N |    6 |         Y |
| FormField                 |    P1 |    10 | 6/2/2/0/0         |     Y |    N |   72 |         Y |
| PhotoTaxonomyEditor       |    P1 |    10 | 5/0/0/0/5         |     N |    N |    2 |         N |
| ZoomControl               |    P1 |     5 | 1/3/0/0/1         |     N |    N |    3 |         Y |
| AdminPhotoMetadataForm    |    P2 |     9 | 7/0/0/0/2         |     N |    N |    1 |         N |
| ThumbnailCropEditor       |    P2 |     7 | 7/0/0/0/0         |     N |    N |    1 |         N |
| AdminGalleryNav           |    P2 |     6 | 5/1/0/0/0         |     N |    N |    2 |         N |
| AdminPhotoImageManager    |    P2 |     6 | 4/0/0/0/2         |     N |    N |    1 |         N |
| CodeEditor                |    P2 |     6 | 2/3/0/1/0         |     N |    N |    2 |         N |
| MobileDropdownMenu        |    P2 |     5 | 3/0/0/1/1         |     N |    N |    2 |         Y |
| AdminThemeToggle          |    P2 |     0 | 0/0/0/0/0         |     N |    N |    2 |         Y |
| GalleryPreloader          |    P3 |     5 | 3/2/0/0/0         |     N |    N |    1 |         N |
| PhotoUploadZone           |    P3 |     5 | 5/0/0/0/0         |     N |    N |    1 |         N |
| SveditEditor              |    P3 |     5 | 1/2/1/1/0         |     N |    N |    2 |         N |
| AdminCard                 |    P3 |     4 | 1/0/2/1/0         |     Y |    Y |   14 |         Y |
| AdminPhotosPage           |    P3 |     4 | 3/1/0/0/0         |     N |    N |    2 |         N |
| GallerySettingsFormFields |    P3 |     4 | 2/1/0/1/0         |     N |    N |    2 |         N |
| AdminHeading              |    P3 |     3 | 1/0/1/1/0         |     Y |    N |   17 |         Y |
| AdminStatusMessage        |    P3 |     3 | 1/1/1/0/0         |     Y |    N |   10 |         Y |
| HomeSlideshow             |    P3 |     3 | 3/0/0/0/0         |     N |    N |    1 |         N |
| AdminSinglePhotoEditor    |    P3 |     2 | 1/1/0/0/0         |     N |    N |    1 |         N |
| CmsPageView               |    P3 |     2 | 1/1/0/0/0         |     N |    N |    2 |         N |
| Link                      |    P3 |     2 | 2/0/0/0/0         |     N |    N |    0 |         N |
| Callout                   |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Divider                   |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Emphasis                  |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Feature                   |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| GalleryColumns            |    P3 |     1 | 1/0/0/0/0         |     N |    N |    1 |         N |
| GalleryCoverage           |    P3 |     1 | 1/0/0/0/0         |     N |    N |    1 |         N |
| GalleryGrid               |    P3 |     1 | 1/0/0/0/0         |     N |    N |    1 |         N |
| GalleryRows               |    P3 |     1 | 1/0/0/0/0         |     N |    N |    1 |         N |
| GalleryScene              |    P3 |     1 | 1/0/0/0/0         |     N |    N |    1 |         N |
| GalleryTiles              |    P3 |     1 | 1/0/0/0/0         |     N |    N |    2 |         N |
| Heading                   |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Hero                      |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Image                     |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| List                      |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| ListItem                  |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| NodeCursorTrap            |    P3 |     1 | 0/1/0/0/0         |     N |    N |    0 |         N |
| Page                      |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Paragraph                 |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Quote                     |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Section                   |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| Strong                    |    P3 |     1 | 1/0/0/0/0         |     N |    N |    0 |         N |
| SveditPageRenderer        |    P3 |     1 | 1/0/0/0/0         |     N |    N |    1 |         N |
| Overlays                  |    P3 |     0 | 0/0/0/0/0         |     N |    N |    0 |         N |

## Prioritized Findings And Recommendations

### P0 Findings

#### 1) `FormInput` (`src/lib/components/FormInput.svelte`)

- Why overcomplicated:
  - 16 props and 40 call sites.
  - Multiple explicitly modeled native attrs are effectively dead in call sites (`required`, `invalid`, `describedBy`, `disabled` are `0/40`; `min`, `max`, `step` are `1/40` each).
  - Manual attr modeling creates maintenance burden and limits extensibility for legitimate native attrs not pre-modeled.
- Class customization status:
  - `class` exists and is sufficient for styling overrides (`4/40` usages).
  - Missing `...rest` prevents ergonomic forwarding of arbitrary DOM attrs (`aria-*`, `data-*`, `autocomplete`, `inputmode`, `pattern`, etc.).
- Recommended target API shape:
  - Keep semantic overrides: `invalid`, `describedBy`, optional `oninput`.
  - Use native input attribute typing + `...rest` forwarding for everything else.
  - Keep `class` merge strategy as-is.
- Migration notes:
  - Impact: high (40 call sites), but mostly compatibility-preserving if `...rest` is added before removing explicit props.
  - Order: add forwarding first; remove redundant explicit props only after `npm run check` confirms no breakage.

#### 2) `FormTextarea` (`src/lib/components/FormTextarea.svelte`)

- Why overcomplicated:
  - 12 props and 7 call sites for a thin wrapper.
  - Several props are unused at call sites (`required`, `invalid`, `describedBy`, `disabled` are `0/7`).
- Class customization status:
  - `class` exists (`1/7`), but no attribute forwarding.
- Recommended target API shape:
  - Mirror `FormInput` pattern: semantic overrides + native `textarea` attrs via `...rest`.
- Migration notes:
  - Impact: low-to-medium (7 call sites).
  - Safe to migrate in same phase as `FormInput` to unify form primitive contracts.

#### 3) `FormSelect` (`src/lib/components/FormSelect.svelte`)

- Why overcomplicated:
  - 10 props and 13 call sites.
  - Several explicit props have no observed usage (`required`, `invalid`, `describedBy`, `form`; `children` attr counting excludes snippet body).
- Class customization status:
  - `class` exists (`4/13`), but no `...rest` forwarding.
- Recommended target API shape:
  - Keep semantic overrides for context integration.
  - Forward native `select` attrs via `...rest`.
- Migration notes:
  - Impact: medium (13 call sites).
  - Perform with `FormInput/FormTextarea` for one standardized form API model.

### P1 Findings (Primitives)

#### 4) `FormField` (`src/lib/components/FormField.svelte`)

- Why overcomplicated:
  - 10 props and 72 call sites.
  - `helper` appears unused (`0/72`) while `hint` is used (`11/72`), suggesting duplicate API intent.
  - `required`/`optional`/`labelSrOnly` are valid but could be tightened around actual usage.
- Class customization status:
  - `class` is available and useful (`10/72`).
  - No `...rest` forwarding (limits attaching field-level attrs without wrapper div edits).
- Recommended target API shape:
  - Keep `label`, `id`, `hint`, `error`, `required`, `optional`, `labelSrOnly`, `class`, `children`.
  - Deprecate `helper` in favor of `hint`.
  - Optionally add container `...rest` forwarding.
- Migration notes:
  - Impact: high usage but low risk if deprecation-first.

#### 5) `AdminButton` (`src/lib/components/admin/AdminButton.svelte`, `src/lib/styles/admin-buttons.ts`)

- Why overcomplicated:
  - Good base contract (`class` + `...rest` exists). ~~Variant set included layout-specific style (`leftColumnFormSubmit`) that leaked page layout into primitive API.~~ **Done:** `leftColumnFormSubmit` removed; replaced with `submit` + call-site `class="mt-4"`.
  - Variant usage: `variant` overall is 45/58.
- Class customization status:
  - Sufficient and healthy; call sites already use `class` where needed.
- Recommended target API shape:
  - Keep semantic variants (`submit`, `danger`, `toggle`, etc.).
  - ~~Remove `leftColumnFormSubmit`; replace with `variant="submit"` + call-site class.~~ **Done.**
- Migration notes:
  - Impact: low (5 call sites).
  - Remove this variant early; easy confidence win.

#### 6) `AdminCreateListLayout` (`src/lib/components/admin/AdminCreateListLayout.svelte`)

- Why overcomplicated:
  - 10 props for a layout shell; several are sparsely used (`subtitle`, `actions`, `dataMessage`, `leading`, `overflow` each `<=1/6`).
  - `overflow` toggles between two structural layouts and is only used once.
- Class customization status:
  - No `class` / no `...rest`.
- Recommended target API shape:
  - Add `class` and optional container `...rest` for top-level layout control.
  - Replace boolean `overflow` with either:
    - explicit `layout?: 'stack' | 'split-scroll'`, or
    - composition via dedicated snippets/slots.
- Migration notes:
  - Impact: medium (6 call sites).
  - Keep `overflow` as backward-compatible alias for one release cycle if needed.

#### 7) `ZoomControl` (`src/lib/components/ZoomControl.svelte`)

- Why overcomplicated:
  - Small API, but no class forwarding means callers must wrap it to handle spacing/layout concerns.
- Class customization status:
  - Not possible directly (no `class`, no `...rest`).
- Recommended target API shape:
  - Add root `class?: string` and spread `...rest` onto root group container.
- Migration notes:
  - Impact: low (3 call sites).
  - Safe standalone change.

### P1 Findings (Secondary, Domain Components)

#### 8) `GalleryDetailViewer` (`src/lib/components/gallery/scene/GalleryDetailViewer.svelte` called from `src/lib/components/gallery/GalleryScene.svelte`)

- Why overcomplicated:
  - 20/20 props passed from a single parent call site.
  - High callback and navigation coordination creates call-site noise and harder local refactors.
- Class customization status:
  - Not relevant; this is not a style primitive.
- Recommended target API shape:
  - Group into typed prop objects: `state`, `navigation`, `actions`, `timings`.
- Migration notes:
  - Impact: low blast radius (single parent).
  - Refactor after primitive cleanup; behavior-sensitive component.

#### 9) `AdminPhotoCard` + `AdminPhotoCardCompact`

- Why overcomplicated:
  - `AdminPhotoCard`: 16 props across 3 call sites.
  - `AdminPhotoCardCompact`: 8 props at 1 call site (list mode removed 2026-03).
  - Large shared prop bundles indicate view-model style object opportunity.
- Class customization status:
  - Not a primary issue here.
- Recommended target API shape:
  - Introduce grouped props like `selection`, `taxonomy`, `presentation`, `events`.
- Migration notes:
  - Impact: medium; several interdependent admin flows.

#### 10) `AdminPhotosBulkPanel`, `AdminPhotosFilterForm`, `PhotoTaxonomyEditor`

- Why overcomplicated:
  - `AdminPhotosBulkPanel`: 18 props at one call site.
  - `AdminPhotosFilterForm`: 13 props at one call site.
  - `PhotoTaxonomyEditor`: 10 props across 2 call sites.
  - These are composition-heavy and good candidates for grouped typed objects.
- Class customization status:
  - Not the central risk.
- Recommended target API shape:
  - Introduce typed grouped objects (`filters`, `taxonomyDraft`, `selection`, `actions`, `scope`).
  - Keep callbacks explicit when they are side-effectful.
- Migration notes:
  - Impact: low-to-medium; mostly parent-child signature cleanup.

## Concrete Refactor Sequence

1. Primitive Contract Standardization

- `FormInput`, `FormTextarea`, `FormSelect`: add native attr forwarding (`...rest`) and keep semantic overrides.
- Preserve existing props initially for compatibility.

2. Primitive Surface Cleanup

- Remove/alias redundant props: `FormField.helper` -> `hint`.
- Add `class`/`...rest` to `ZoomControl` and `AdminCreateListLayout`.

3. Style Variant Simplification

- ~~Remove `AdminButton`'s `leftColumnFormSubmit` variant.~~ **Done.**
- ~~Update 5 call sites to semantic variant + class utilities.~~ **Done (4 call sites).**

4. Domain Signature Compaction

- Group prop bags in `GalleryDetailViewer`, `AdminPhotoCard`, `AdminPhotosBulkPanel`, `AdminPhotosFilterForm`, `PhotoTaxonomyEditor`.
- Prioritize single-parent components first.

5. Final API Tightening

- After compatibility window, remove explicit primitive props that are fully replaced by forwarded attrs.

## Refactor Verification Checklist

- `npm run check` passes after each phase.
- `npm run lint` passes.
- `npm run knip` passes.
- Confirm class overrides still apply at all current call sites.
- Confirm forwarded attrs reach DOM elements (`aria-*`, `data-*`, native attrs).
- Regression check high-touch flows:
  - auth forms
  - admin create/edit forms
  - admin photo management
  - gallery detail viewer navigation

## Assumptions

- Prioritize reusable primitives over domain components for strict simplification.
- Favor `class + ...rest` for customization; keep semantic props only when they model stable behavior.
- Preserve behavior first, then reduce prop surface in compatibility-safe increments.
