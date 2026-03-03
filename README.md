# Sentec SMT Assistant

Web assistant for SMT workflows, including:

- Fuji mounter material and slot checking
- Panasonic mounter material and slot checking
- Pre-production and post-production helper flows
- Mounter-related file upload and file management pages

## Tech stack

- Vue 3 + Vite
- TypeScript (mixed TS/JS project)
- Pinia + Vue Router
- Naive UI + AG Grid
- Vitest + Playwright
- OpenAPI-generated API client (`openapi-typescript-codegen`)

## Runtime and environment

### Requirements

- Node.js 18+
- npm (comes with Node.js)

### Environment files

The project currently includes these files:

- `.env.development`
- `.env.staging`
- `.env.production`

Variables currently defined:

- `VITE_APP_TITLE`
- `VITE_BACKEND_BASE_URL`

Note:

- API requests in generated client default to `OpenAPI.BASE = "/api"` (`src/client/core/OpenAPI.ts`).
- In practice, frontend and backend are expected to be behind a reverse proxy route at `/api`.

## Local development

1. Install dependencies:

```sh
npm install
```

2. Start Vite dev server:

```sh
npm run dev
```

3. Open app in browser:

```text
http://localhost:5175/smt
```

Notes:

- Vite `base` is `/smt`, so routes are under `/smt/*`.
- If API calls fail locally, verify that `/api` is correctly proxied to backend.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build with default mode |
| `npm run build:staging` | Build for staging mode |
| `npm run build:production` | Build for production mode |
| `npm run preview` | Preview built app locally |
| `npm run lint` | Run ESLint on `.vue/.js/.ts` files |
| `npm run lint:fix` | Run ESLint and auto-fix fixable issues |
| `npm run test` | Run Vitest |
| `npm run test:unit` | Run Vitest with `jsdom` environment |
| `npm run coverage` | Run Vitest coverage |
| `npm run generate` | Regenerate API client from OpenAPI spec |

## API client regeneration

To regenerate `src/client` from backend OpenAPI spec:

```sh
npm run generate
```

This command uses:

```text
http://localhost/api/openapi.json
```

Make sure backend spec endpoint is reachable before running.

## Testing

### Unit tests (Vitest)

```sh
npm run test
```

or

```sh
npm run test:unit
```

### E2E tests (Playwright)

This repo contains Playwright tests under `tests/e2e`.

Recommended flow:

1. Start app server (and backend if tests need real APIs).
2. Run Playwright manually:

```sh
npx playwright test
```

Current `playwright.config.ts` notes:

- `baseURL` is `http://127.0.0.1`
- `webServer` auto-start is not enabled
- HTML report is enabled

## Lint and code quality

- ESLint is enabled for Vue + TS + JS files.
- `npm run lint` is currently configured to report warnings and fail on errors.
- Existing codebase may still produce warnings in some files; treat this as incremental cleanup work.

## Project structure (high level)

```text
src/
  application/      use cases and app-level workflows
  domain/           core domain logic and rules
  infra/            infrastructure adapters and integrations
  infrastructure/   repository-level infrastructure code
  ui/               UI workflows, composables, grid adapters
  pages/            route-level Vue pages and page components
  router/           route definitions and navigation guards
  stores/           Pinia stores
  client/           generated OpenAPI client
```

## Main routes

The app is mounted under `/smt` and includes:

- `/smt/fuji-mounter`
- `/smt/fuji-mounter/:mounterIdno/:workOrderIdno`
- `/smt/panasonic-mounter`
- `/smt/panasonic-mounter/:mounterIdno/:workOrderIdno`
- `/smt/panasonic-mounter-production/:productionUuid`
- `/smt/fuji-mounter-production/:productionUuid`
- `/smt/file-upload`
- `/smt/file-manager`

## Reverse proxy (Caddy)

Current `Caddyfile` behavior:

- `/api/*` -> backend `:8000`
- all other routes -> frontend `localhost:5175`

This is the expected topology for staging/production and can also be reused locally.

## Deployment

### Provision in staging machine

```sh
# Refer to Sentec-Web README to provision machine first.
# Install Node.js 18+

cd /sentec-app/
git clone ssh://root@200.0.0.226:23/102573/SMT-Assistant.git
cd /sentec-app/SMT-Assistant/
git checkout --track origin/staging

npm install
npm run build:staging

# Provision other Sentec apps if needed:
# - Sentec Start
# - GE Warehouse Dashboard
# - SMT Assistant
# - WMS (Soda)
# - WMS-Web (Soda-Web)

# Start Caddy service
```

### Update staging deployment

```sh
cd /sentec-app/SMT-Assistant/
git checkout staging
git pull origin staging

npm install
npm run build:staging

sudo systemctl restart caddy.service
```

---

### Provision in production machine

```sh
# Refer to Sentec-Web README to provision machine first.
# Install Node.js 18+

cd /sentec-app/
git clone ssh://root@200.0.0.226:23/102573/SMT-Assistant.git
cd /sentec-app/SMT-Assistant/
git checkout --track origin/production

npm install
npm run build:production

# Provision other Sentec apps if needed:
# - Sentec Start
# - GE Warehouse Dashboard
# - SMT Assistant
# - WMS (Soda)
# - WMS-Web (Soda-Web)

# Start Caddy service
```

### Update production deployment

```sh
cd /sentec-app/SMT-Assistant/
git checkout production
git pull origin production

npm install
npm run build:production

sudo systemctl restart caddy.service
```

## Troubleshooting

### App opens blank or wrong path

- Confirm you are opening `/smt` path, not only `/`.

### API returns 404 during local dev

- Confirm `/api` reverse proxy exists and points to backend.
- Confirm backend is running and reachable from frontend host.

### Playwright test cannot access app

- Ensure app server is already started before running `npx playwright test`.
- If needed, align `baseURL` in `playwright.config.ts` with your local host/port.
