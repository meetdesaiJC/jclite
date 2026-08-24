# Agent Assist

Design-system-backed prototypes for JustCall AI — scripts, checklists, live
guidance, and the JustCall AI shell.

One component library in `src/`, consumed by every prototype. Change a token
once and it lands everywhere.

## Getting started

```bash
npm install
npm run dev
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | JustCall AI prototype (:5679) |
| `npm run proto:add-ons` | Add-ons / billing flow prototype |
| `npm run storybook` | Design system component explorer (:6006) |
| `npm run typecheck` | Type-check `src/` — note: **not** the prototypes |
| `npm run build` | Production build of the JustCall AI prototype |
| `npm run build:lib` | Build the design system as a package |
| `npm run icons:sync-used` | Re-sync icons from Figma → generated components |

## Layout

```
src/                        Design system — components, tokens, icons
  components/               23 components, each with a Storybook story
  styles/globals.css        All design tokens (primitive → semantic → component)
  icons/svg/                Icon sources, 16/20/24
  tokens/                   Token documentation stories
prototype-justcall-ai/      Agent Assist prototype (setup + in-call)
prototype-add-ons-flow/     Add-ons, billing, call logs prototype
scripts/icons/              Figma → SVG → React icon pipeline
icon-library/               Raw Figma exports (build input)
illustrations/              Raw illustration exports (build input)
```

## Stack

- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — tokens via `@theme`, no config file
- **Vite 7**, **Storybook 9**

## Contributing

Read [CLAUDE.md](CLAUDE.md) first. The short version:

1. Build components in `src/` first, then compose them in prototypes.
2. Never write a raw hex — only `src/styles/globals.css` holds color values.
3. Prototypes never import from each other.

## Related

The Design System 2.0 source repo lives separately at
`github.com/meetdesaidesign/Design-System`.
