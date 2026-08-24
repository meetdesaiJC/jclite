import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// ──────────────────────────────────────────────────────────────────────
// Two rules carry the architecture described in CLAUDE.md. Everything
// else here is scaffolding for them.
//
//   1. Dependencies point inward. Prototypes may use the design system;
//      the design system may not reach back, and prototypes may never
//      reach sideways into each other.
//   2. No raw colours outside the token file. A hex written in a
//      component is a colour that a token change can never reach.
//
// Both were violated before the restructure, and both are cheap to
// re-violate by accident, which is why they are machine-checked.
// ──────────────────────────────────────────────────────────────────────

/** Files where a literal colour is content, not a design decision. */
const COLOUR_EXEMPT = [
  // Third-party brand marks. Salesforce blue is Salesforce's, not ours.
  "prototype-justcall-ai/src/icons/IntegrationLogos.tsx",
  // Storybook fixtures: demo content (a flag, a star rating), not shipped UI.
  "**/*.stories.tsx",
];

/**
 * Matches a colour literal anywhere in a string: "#fff", "#004ce6",
 * "bg-[#004ce6]", "linear-gradient(90deg, #fff 0%, ...)".
 *
 * Deliberately not anchored — the value is usually embedded in a longer
 * className or gradient string. `url(#gradientId)` is excluded by
 * requiring the run of hex digits to end at a word boundary and to be
 * exactly 3, 4, 6 or 8 long.
 */
/** Every prototype directory, minus the `prototype-` prefix. */
const PROTOTYPES = ["justcall-ai", "add-ons-flow"];

const HEX_COLOUR = String.raw`/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/`;

const NO_RAW_COLOUR = {
  selector: `Literal[value=${HEX_COLOUR}], TemplateElement[value.raw=${HEX_COLOUR}], JSXText[value=${HEX_COLOUR}]`,
  message:
    "Raw colour. Use a token: className=\"bg-brand\" or var(--color-brand). " +
    "New colours go in src/styles/globals.css — see CLAUDE.md §3.",
};

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "**/dist/**",
      "storybook-static/**",
      "node_modules/**",
      ".vercel/**",
      "scripts/icons/icons.manifest.json",
    ],
  },

  // Baseline for every TS/TSX file in the repo.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The codebase uses `any` sparingly and deliberately in a few
      // prototype spots; surfacing it as an error would be noise.
      "@typescript-eslint/no-explicit-any": "warn",
      // `cond ? doA() : doB()` as a statement is an existing idiom here.
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowTernary: true, allowShortCircuit: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // ── Rule 2: no raw colours ─────────────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx}", "prototype-*/src/**/*.{ts,tsx}"],
    ignores: COLOUR_EXEMPT,
    rules: { "no-restricted-syntax": ["error", NO_RAW_COLOUR] },
  },

  // ── Rule 1: dependencies point inward ──────────────────────────────
  // The design system is the base layer. If it needs something from a
  // prototype, the dependency is upside down.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/prototype-*/**", "../../prototype-*/**"],
              message:
                "The design system cannot import from a prototype — that inverts the " +
                "dependency. Move the shared code into src/ instead. See CLAUDE.md §1.",
            },
          ],
        },
      ],
    },
  },

  // One prototype may never reach into another. If both need it, it
  // belongs in the design system.
  //
  // Each prototype is given the explicit list of its siblings rather than a
  // negated glob — `prototype-!(self)` looks right but no-restricted-imports
  // does not honour extglob negation, so it silently matched nothing.
  ...PROTOTYPES.map((self) => ({
    files: [`prototype-${self}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: PROTOTYPES.filter((other) => other !== self).flatMap(
                (other) => [
                  `**/prototype-${other}/**`,
                  `../prototype-${other}/**`,
                  `../../prototype-${other}/**`,
                ],
              ),
              message:
                "Prototypes cannot import from each other. If two prototypes need this, " +
                "promote it to src/components/ and import it from @/components. " +
                "See CLAUDE.md §1.",
            },
          ],
        },
      ],
    },
  })),

  // Storybook CSF puts hooks inside `render: () => …`, which the rule cannot
  // recognise as a component. The stories are not shipped UI.
  {
    files: ["**/*.stories.tsx"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },

  // Config and tooling files sit outside the app layers.
  {
    files: ["*.config.{ts,js}", ".storybook/**", "scripts/**"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },
);
