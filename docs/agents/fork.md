# Fork: staying mergeable with upstream

This repository is a fork of `reactive-resume/reactive-resume` (remote `upstream`). Upstream is merged in
regularly, so every fork change is judged by one question first: **how will this merge next time?**

## Rules

1. **New files over edited files.** A file upstream does not have can never conflict. Fork features live in
   their own files and directories:
   - API: `packages/api/src/features/copilot/` (mounted once, as `copilot`, in `packages/api/src/routers/index.ts`).
     New fork procedures go under `copilotRouter` rather than adding another line to `routers/index.ts`.
   - Web: `apps/web/src/features/copilot/`, plus route files of their own under `apps/web/src/routes/`.
   - Schema: one file per concept under `packages/schema/src/resume/` (already exported by the `./resume/*`
     wildcard, so `package.json` is not edited).
   - DB: one file per table under `packages/db/src/schema/`, plus one `export *` line in `schema/index.ts`.
   - Browser extension: `apps/extension/`.
2. **When an upstream file must change, make the smallest additive hunk.**
   - Add lines; do not rewrite, reorder, rename or re-indent what is there. A wrapper that re-indents a block
     turns a one-line change into a conflict over the whole block: prefer a prop, an early `return`, a class,
     or a small component chosen above the JSX.
   - New props are optional and default to upstream's behaviour.
   - Mark the hunk with a `Fork:` comment so it is recognisable in a conflict.
   - Never refactor upstream code for the fork's convenience, including "reuse" clean-ups. If fork code needs
     something an upstream file keeps private, export it (one keyword) or keep a small copy in a fork file and
     say where it came from.
3. **Never hand-resolve generated files.** After a merge, take either side and regenerate:
   - `apps/web/locales/*.po` → `pnpm lingui:extract`
   - `docs/spec.json` → `pnpm docs:gen`
   - `apps/web/src/routeTree.gen.ts` → `pnpm dev:web` (or any Vite build)
   - `pnpm-lock.yaml` → `pnpm install`
4. **Migrations.** Fork migrations are folders of their own under `migrations/` and never edit an upstream
   one. After merging upstream migrations, run `pnpm db:generate`: it must report no changes. If it wants to
   re-create a fork table (upstream's newer snapshot does not know it), delete the generated folder and
   regenerate the fork migration so it is the newest, keeping its SQL idempotent for databases that already
   have the table.
5. **Do not change upstream behaviour, contracts or data shapes.** Extend beside them. The fork's HTTP
   surface (`/api/openapi` Copilot routes) is used by external clients and is kept stable separately.
6. **Dependencies.** Prefer what is already installed. A new dependency edits `package.json`,
   `pnpm-workspace.yaml` and the lockfile, three of the most frequently conflicting files.

## Upstream files the fork edits

Keep this list short and current. Each entry is a place a future merge can conflict.

| File                                                                                                                                                                        | Fork hunk                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/routers/index.ts`                                                                                                                                         | mounts `copilot`                                                                                                                             |
| `packages/db/src/schema/index.ts`                                                                                                                                           | exports `./information-bank`                                                                                                                 |
| `apps/web/src/routes/dashboard/-components/app-shell.tsx`                                                                                                                   | mounts `<CopilotNav />` (sidebar and rail)                                                                                                   |
| `apps/web/src/dialogs/schemas.ts`, `dialogs/resume/registry.tsx`                                                                                                            | registers the `resume.generate` dialog                                                                                                       |
| `apps/web/src/features/command-palette/pages/navigation.tsx`                                                                                                                | two commands: tailor, Information Bank                                                                                                       |
| `apps/web/src/features/documents/new-document-dialog.tsx` (+ test)                                                                                                          | "Tailor a resume to a job" tile                                                                                                              |
| `apps/web/src/features/resume/editor/write/entries.tsx`                                                                                                                     | optional `contentOnly` prop                                                                                                                  |
| `apps/web/src/features/resume/editor/write/rich-text-editor.tsx`                                                                                                            | optional `improve` prop                                                                                                                      |
| `apps/web/src/features/resume/editor/write/outline.tsx`                                                                                                                     | exports `ADD_LABELS`, `useSortSensors`                                                                                                       |
| `packages/schema/src/templates.ts`, `packages/pdf/src/templates/index.ts`, `packages/pdf/src/semantic/template-manifest.ts`, `apps/web/src/dialogs/resume/template/data.ts` | register the fork's `goldstar` template                                                                                                      |
| `packages/api/src/features/applications/ai.ts`                                                                                                                              | exports helpers the copilot feature reuses                                                                                                   |
| `packages/api/package.json`                                                                                                                                                 | one dependency for the copilot feature                                                                                                       |
| `.github/workflows/*`                                                                                                                                                       | upstream workflows removed, `release-image.yml` added. If upstream edits a removed workflow the merge reports modify/delete: keep it deleted |
| `AGENTS.md`                                                                                                                                                                 | the "Fork policy" section at the end                                                                                                         |

Check the real list at any time:

```sh
git fetch upstream
git diff --stat upstream/main -- . ':!apps/web/locales' ':!docs/spec.json' ':!pnpm-lock.yaml'
```

## Merging upstream

```sh
git fetch upstream
git merge upstream/main          # resolve hand-written conflicts; take either side of generated files
pnpm install
pnpm lingui:extract && pnpm docs:gen
pnpm db:generate                 # expect "no changes"
pnpm typecheck && pnpm exec turbo boundaries && pnpm lint && pnpm format:check
pnpm test
```
