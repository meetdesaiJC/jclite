# Agent Assist — working rules

Design-system-backed prototyping repo for JustCall AI. One component library,
many prototypes. The prototypes are **demo artefacts built over weeks of design
work** — treat them as production. Never refactor a prototype "while you're in
there."

---

## 1. The one rule: dependencies point inward

```
prototypes/*  ──▶  src/ (design system)  ──▶  src/styles/globals.css (tokens)
```

| From | May import | Must never import |
|---|---|---|
| `src/components/*` | other `src/`, `@/lib`, tokens | anything in `prototype-*/` |
| `prototype-justcall-ai/` | `@/components/*`, `@/lib/*`, its own files | **another prototype** |
| `prototype-add-ons-flow/` | `@/components/*`, `@/lib/*`, its own files | **another prototype** |

Sideways imports between prototypes are the failure mode this repo is being
restructured to kill. If prototype A needs something from prototype B, that
thing is a **design-system component** — promote it to `src/components/`, don't
reach across.

As of the Phase 2 cleanup there are **zero** cross-prototype imports. Keep it
that way — `grep -rn "prototype-" prototype-*/src src --include='*.tsx'` should
return nothing.

---

## 2. Design system first

Before writing any UI in a prototype:

1. **Check `src/components/`** for what you need. 23 components exist — Alert,
   Avatar, Badge, Banner, Button, Checkbox, Chip, Counter, Dropdown,
   GlobalHeader, Icon, InputField, Modal, Radio, Sidenav, Sidesheet, Table,
   Tabs, Tag, Toggle, Tooltip.
2. **If it exists, use it.** Import from `@/components/<Name>`. Do not
   re-implement a button, do not wrap it in something that re-styles it.
3. **If it doesn't exist and is reusable** (any second prototype could want it),
   build it in `src/components/<Name>/` with a `.stories.tsx`, then consume it.
4. **If it is genuinely one-off** composition for this prototype, it lives in
   the prototype.

The test for step 3 vs 4: *would a different prototype plausibly want this?* A
profile menu, an empty state, a page header — yes, design system. "The knowledge
import wizard's step 3" — no, prototype.

New design-system component checklist:
- `src/components/<Name>/<Name>.tsx` + `index.ts` + `<Name>.stories.tsx`
- variants via `class-variance-authority` (see `Button.tsx` for the pattern)
- `cn()` from `@/lib/utils` for class merging
- exported from `src/index.ts`
- zero hardcoded colors (see §3)

---

## 3. Token law — no raw colors, ever

**Never write a hex, `rgb()`, or `hsl()` in a `.tsx` or `.css` file.** Not in
components, not in prototypes. No `bg-[#004ce6]`, no `style={{ color: "#667085" }}`.

The only file that may contain raw color values is
`src/styles/globals.css`.

Two narrow exemptions: SVG assets under `assets/` (though prefer `currentColor`
so icons inherit), and literal *content* colors in story fixtures — a flag red,
a third-party brand logo. Neither is a UI decision, so neither is a token.

Colors are consumed as Tailwind utilities generated from tokens:
`bg-brand`, `text-foreground`, `border-line`, `text-muted-foreground`,
`bg-error-subtle`, `shadow-200`, `text-heading-xl`.

### Adding a color

Three tiers in `src/styles/globals.css`, and you add to the *shallowest* one
that fits:

| Tier | Block | Example | When |
|---|---|---|---|
| **Primitive** | `@theme static` | `--color-blue-500: #2e90fa` | A new raw palette step from Figma. Rare. |
| **Semantic** | `@theme` | `--color-brand: var(--color-blue-...)` | A *role*: brand, error, border, disabled. Prefer these everywhere. |
| **Component** | `@theme` | `--color-badge-pink`, `--color-tooltip-dark-bg` | Only when one component needs a value no semantic role covers. |

**Component tokens must reference a primitive or semantic token, not a new hex.**

```css
/* ✅ */  --color-coach-red: var(--color-error);
/* ❌ */  --color-coach-red: #d92d20;   /* silently duplicates --color-error */
```

Every token in `globals.css` now derives this way, so changing one primitive
ripples. Verify it still holds after editing tokens — override a primitive in
devtools and check its dependents move:

```js
document.documentElement.style.setProperty('--color-red-600', '#00a651')
```

`--color-error`, `--color-destructive`, `--color-status-dnd` and
`--color-coach-red` should all follow. If one doesn't, it is re-typing a hex.

### Existing semantic tokens — check here before inventing one

`background` `foreground` `muted` `muted-foreground` `border` `ring` `primary`
`primary-foreground` `secondary-bg` `destructive` `brand` `brand-hover`
`brand-subtle` `line` `surface-hover` `disabled-bg` `disabled-fg` `error`
`error-hover` `error-subtle` `success` `warning` `info` + `-secondary`/`-border`
variants, `control-border` `control-disabled-bg`, `avatar-{indigo,purple,pink,orange,grey,bluegrey}-{bg,fg}`,
`status-{available,ooo,on-call,wrap-up,dnd}`, `badge-*`, `tag-*`, `tooltip-dark-*`,
`error-icon`, `ai` + `ai-{surface,border,gradient-from,gradient-to}`,
`sidenav-{bg-from,bg-to,accent,item-active,label,card,balance}`,
`header-icon-hover`, `notification-badge`, `avatar-brand-bg`,
`dialer-surface`, `editor-toolbar`

Typography: `text-heading-{lg,xl,xxl,xxxl}` · `text-paragraph-{sm,md,lg}` ·
`text-label-{xs,sm,md,md-semi}` — each sets size + line-height + weight
together. Don't pair them with `font-semibold`/`leading-*`; that fights the token.

Radius: `rounded-sm|md|lg`. Elevation: `shadow-100`…`shadow-600`,
`shadow-ai-100`…`shadow-ai-600`.

### Prototype-local CSS

`prototype-*/src/styles.css` imports the design system, then may add
**motion/keyframes only**. Do not declare new `--color-*` there — a token
defined in a prototype can never be reused, so the next prototype re-invents it.
Color tokens belong in `src/styles/globals.css` even when only one prototype
uses them today.

---

## 4. Where things go

| What | Where |
|---|---|
| Reusable component | `src/components/<Name>/` |
| Shared hook | `src/components/<Name>/use*.ts`, or `src/lib/` |
| Tokens | `src/styles/globals.css` |
| Token documentation stories | `src/tokens/*.stories.tsx` |
| Generated icon components | `src/components/Icon/icons.generated.tsx` (**generated**) |
| Icon SVG source | `src/icons/svg/{slug}/{16,20,24}.svg` |
| Prototype screen / page | `prototype-*/src/` |
| Prototype fixtures | `prototype-*/src/*Data.ts` |
| Prototype-only asset | `prototype-*/src/assets/` |
| Raw Figma exports (build input) | `icon-library/`, `illustrations/` |
| Icon tooling | `scripts/icons/` |

---

## 5. Icons

Never hand-edit `src/components/Icon/icons.generated.tsx` — it is generated and
your change will be overwritten.

```bash
npm run icons:sync-used   # pull → clean → generate
```

Consume as components: `import { IconSearch } from "@/components/Icon"` then
`<IconSearch size={20} />`. Sizes 16/20/24 are distinct drawings with different
stroke weights, not one SVG scaled — pass the size that matches your layout.

---

## 6. Traps — read before deleting anything

- **`vite.config.ts` at the repo root looks unused. It is not.** No npm script
  references it, but `.storybook/main.ts` declares no `viteFinal`, so
  `@storybook/react-vite` auto-loads the root Vite config. It is the only source
  of Storybook's `@` alias and Tailwind plugin. Deleting it breaks every story.
- **`npm run typecheck` does not cover the prototypes.** `tsconfig.json` has
  `"include": ["src"]`. A prototype can be badly broken and typecheck stays
  green. Always run the builds too.
- Each prototype has its own `vite.config.ts` with its own `root` and port.
  The root config is not their parent.
- **`no-restricted-imports` ignores extglob negation.** A pattern like
  `**/prototype-!(justcall-ai)/**` looks correct, matches nothing, and fails
  silently — the rule appears to pass. `eslint.config.js` lists each
  prototype's siblings explicitly instead. If you add a third prototype, add it
  to the `PROTOTYPES` array there; nothing else needs changing.
- After changing a lint rule, prove it fires. Paste a violation in, confirm the
  error, then remove it. A rule that matches nothing is worse than no rule,
  because it reads as a passing gate.

---

## 7. Verify before saying it works

`typecheck` alone is not evidence — it only covers `src/`. Run the full gate,
which is the same set CI runs:

```bash
npm run verify
```

That is `lint` + `typecheck` + both prototype builds + Storybook. Individually:

```bash
npm run lint            # architecture rules: boundaries + no raw colours
npm run typecheck       # src/ only
npm run build           # justcall-ai prototype
npm run build:add-ons   # add-ons prototype
npm run build-storybook
```

`npm run lint` is the machine-checked version of §1 and §3. It currently
reports 0 errors and 8 `exhaustive-deps` warnings — pre-existing, deliberately
left alone, since changing effect dependencies in working prototype code is how
prototypes break. Keep errors at zero; don't let the warning count grow.

For visual changes, actually open the prototype and look at it. Dev servers are
declared in `.claude/launch.json` (`justcall-ai` :5679, `add-ons` :5678, plus alt
ports for running variants side by side). Use a preview tool, not a bare
`vite` in the background.

Refactors that should be behavior-neutral: compare the built asset hashes before
and after. Identical `index-*.js` / `index-*.css` filenames means genuinely
zero change.

---

## 8. House style

- Comments explain *why*, not *what*. Match the density of surrounding code —
  this repo comments design intent ("so the categories read as siblings rather
  than as one long queue") and that is worth preserving.
- TypeScript is strict, with `noUnusedLocals` / `noUnusedParameters`. Dead
  variables fail the build.
- `import * as React from "react"`, function components, named exports.
- Tailwind utilities in `className`. Inline `style` only for genuinely dynamic
  values (computed positions, measured widths).
