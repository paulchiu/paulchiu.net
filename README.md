# paulchiu.net

My personal homepage, built like it's 1998: plain HTML, CSS and a little
JavaScript. No framework and no bundler.

## Layout

- `public/`: the site itself (`index.html`, `style.css`, `site.js`, images)
- `functions/hit.js`: the visitor counter, a Cloudflare Pages Function
- `migrations/`: the D1 schema for the counter
- `wrangler.toml`: Pages config and the D1 binding

## Deploys

Cloudflare Pages is connected to this repo. Every push to `main` runs
`npm run build` (which copies `public/` to `dist/`) and deploys `dist/` along
with `functions/`.

## Local development

Requires Node.js (see `.nvmrc`).

```bash
npm i
npm run db:migrate:local   # first time only
npm run dev                # http://localhost:8788
```

`npm run ci` checks formatting; `npm run format:fix` fixes it.

## Visitor counter

`POST /hit` counts a visit and returns the new total; `GET /hit` returns the
total. The page posts once per browser session. The count lives in the
`paulchiu-net-counter` D1 database and was seeded with the Web Analytics
visit total from May to October 2026. Schema changes go in `migrations/` and
are applied with `npm run db:migrate`.
