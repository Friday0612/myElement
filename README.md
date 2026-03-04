# Toy Element

Toy Element is a Vue 3 + TypeScript component library demo project, organized with a pnpm monorepo.

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Vitest
- Storybook
- VitePress
- pnpm workspace + lerna-lite

## Project Structure

```text
.
©À©¤ packages/
©¦  ©À©¤ core/          # library entry package: `toy-element`
©¦  ©À©¤ components/    # component source code
©¦  ©À©¤ hooks/         # reusable hooks
©¦  ©À©¤ utils/         # utility functions
©¦  ©À©¤ theme/         # styles
©¦  ©À©¤ locale/        # i18n resources
©¦  ©À©¤ play/          # local playground (Vite app)
©¦  ©¸©¤ docs/          # VitePress docs site
©À©¤ libs/             # internal build/doc plugins
©À©¤ pnpm-workspace.yaml
©¸©¤ package.json      # workspace scripts
```

## Requirements

- Node.js: `v18.17.0` (see `.nvmrc`)
- pnpm: recommended v10+

## Quick Start

```bash
pnpm install
```

Then build library packages once before running the playground:

```bash
pnpm build
```

Start local playground:

```bash
pnpm dev
```

## Common Commands

### Development

```bash
pnpm dev            # run packages/play
pnpm story          # run Storybook (component showcase)
pnpm docs:dev       # run VitePress docs site
```

### Build

```bash
pnpm build          # build hooks + core library
pnpm build:dev      # watch mode build for library
pnpm docs:build     # build docs
```

### Test

```bash
pnpm test
pnpm test-utils
pnpm test-hooks
pnpm test-comp
```

## Why `pnpm build` before `pnpm dev`?

`packages/play/src/main.ts` imports `toy-element` directly:

```ts
import ToyElement from "toy-element"
```

The `toy-element` package entry (`packages/core/package.json`) points to `dist/*` files. After a fresh clone, `dist` does not exist yet, so dependency scanning fails.

Run `pnpm build` first to generate `dist`, then `pnpm dev` can resolve the package entry.

## Troubleshooting

### 1) `CERT_HAS_EXPIRED` from `r2.cnpmjs.org`

Switch registry and reinstall:

```bash
pnpm config set registry https://registry.npmjs.org/
npm config set registry https://registry.npmjs.org/
pnpm install --frozen-lockfile --registry=https://registry.npmjs.org/
```

If lockfile still contains old tarball URLs, replace `https://r2.cnpmjs.org/` with `https://registry.npmjs.org/` in `pnpm-lock.yaml`.

### 2) `Failed to resolve entry for package "toy-element"`

Run:

```bash
pnpm build
pnpm dev
```

## Notes for New Contributors

Recommended daily workflow:

1. `pnpm install`
2. `pnpm build` (or `pnpm build:dev` in another terminal)
3. `pnpm dev`
4. `pnpm test`

If you modify docs:

- preview with `pnpm docs:dev`
- build check with `pnpm docs:build`
