# ADR 001: Type Annotation Policy — Adopt TypeScript

**Status:** Proposed
**Date:** 2026-06-24

## Context

GE3 previously used Flow for static type annotations. Flow had not run successfully for years: the annotation gap
needed to be addressed.

Three approaches were considered:

- **update flow annotations** -- Initial work with a few dozen files indicated with the latest versions of flow
    would require the addition of hundreds of obfuscating annotations in the code to keep the error count
    from being overwhelming. In addition, flow adoption has tapered off in recent years while the product
    has become specialized around the React framework and the needs of very large projects.
- **@ts-check + JSDoc** — no build step, source files stay plain JS, incremental per-file adoption
- **TypeScript** — requires a build step, but cleaner syntax, better tooling, and the current industry standard

## Decision

Adopt TypeScript proper.

**File layout:**

- `docs/` — no longer the source of record; contains files and links to files with markdown documentation
    - `docs/PageTemplate.html` -> `html/PageTemplate.html`
    - `docs/ShowGAPCode.html` -> `html/ShowGAPCode.html`
    - `docs/*.html.md` -> `./*.html`
    - `docs/ge3.css.md` -> `style/ge3.css`
- `ts/*.ts` — typescript source code with embedded markdown (previously `docs/*.js.md`)
- `ts/*.d.ts` — interface definitions
- `js/*.js, *.js.map` — tsc output (real files: ES6 modules, source maps; ); remains committed to
-
html, style

**Build:**

- `tsc` is driven from `make` or npx tsc --watch
- The existing GitHub Actions workflow (currently sets version numbers) is extended to run tsc on deploy
- No bundler needed — project is small enough that ES6 module load performance is adequate

**Type migration:**

- Flow annotations removed as part of the TypeScript adoption
- Initial pass can use JSDoc-style annotations in `.ts` files; inline TypeScript types (`param: Type`) adopted incrementally
- THREE.js types come from THREE's own `.d.ts` files (it is now TypeScript-native)

## Rationale

**Why TypeScript over @ts-check:** TypeScript gives cleaner inline syntax, better IDE refactoring support (rename, find-references), and is what the ecosystem targets. @ts-check would have delivered ~85% of the benefit with more friction.

**Risk assessment:** The original objection to TypeScript (fear that Microsoft might abandon it or change it enough to drag GE down, as Qt changes did to GE2) does not apply with the same force today:

1. TypeScript's output is plain JavaScript. It is a development-time tool, not a runtime dependency. If TypeScript were abandoned or made a breaking change, the options are: pin to the last good version indefinitely, or strip type annotations mechanically and fall back to plain JS. Neither is catastrophic.
2. Qt was a runtime dependency — when it changed, GE2 broke at runtime and required rewriting to keep working. TypeScript has no equivalent leverage at runtime.
3. The TypeScript ecosystem is now too large for abandonment to be a realistic scenario. Node.js 22+ ships `--strip-types`, moving TypeScript toward platform-level support.

## Alternatives Considered

- **update flow annotations** Rejected for the same reason GE no longer passes flow tests: the current flow would require the addition of too many fixes (awkward JS code, type coercions, $FlowFixMe, etc.) to be worth the effort.
- **@ts-check + JSDoc:** Rejected in favor of TypeScript for cleaner syntax and stronger tooling. Would have avoided a build step but at the cost of verbose JSDoc and slightly weaker IDE integration.
- **No type checking:** Rejected. The Flow experience showed that an untyped large codebase accumulates hard-to-find errors.

## Consequences

- A build step (`tsc`) run from `tsc --watch`, or run manually from `make` when setting `VERSION` on deploy
- `ts/` created to hold `.ts` source files and `.d.ts` interface definitions created by `tsc`
- `js/` transitions from symlinks to tsc output; committed to git so deployment requires no server-side build
- Type annotation migration from Flow to TypeScript is incremental and does not block other work
- Create tsconfig.json, remove .flowconfig, flow-typed
