# Isolated Workers, Vite and D1 verification

Run these commands from the repository root on Windows PowerShell or Linux.
Node >=22.13 is required (CI uses 22.13; cloud verification used 24.19).

```text
npm ci
npm run python:prepare -- --download
npm run check
npm run check:e2e
npm run check:runtime
npm test
npm run test:runtime
```

`python:prepare` downloads the official Pyodide 0.27.7 release and verifies
package hashes against the pinned npm lock manifest. An offline alternative is
`npm run python:prepare -- --from DIRECTORY` with the official distribution.
No Windows caches, `.wrangler` state or secrets need to be copied.

`test:runtime` requires a current production build (`npm test` includes it).
It runs the production progress repository on actual local workerd/D1 through a
separate Worker fixture, then the Vite application, then the built production
Worker using a dedicated local configuration. It checks save/read, malformed
input, repeated writes, user separation, older resume updates, restart
persistence and a fresh database. CLI SQL queries inspect the same D1 state.
It also checks the content-preview write prohibition, absence of the fixture
route in the app, absence of test identity code in the production bundle, and
rejection of the fixture's identity header by built account server functions.

The fixture's two synthetic user IDs test repository isolation. They do **not**
simulate or replace Clerk authentication. Successful signed-in account progress,
Clerk metadata import and browser-to-account sync remain outside this test.
The fixture is only in `tests/runtime`, with its own entrypoint and config; the
production application has no authentication bypass.

## Interactive local development

```text
npm run local:runtime -- migrate
npm run local:runtime -- serve
```

Open `http://127.0.0.1:3220/admin/preview/curricula/`. Stop the server before
running the integration suite. In another terminal, or after stopping it:

```text
npm run local:runtime -- query "SELECT COUNT(*) AS n FROM learning_completions"
```

The default state is `work/local-runtime/state`. Migration, Vite and SQL queries
all use it; restarting `serve` preserves it. To choose another state directory,
set `ROOTORIAL_LOCAL_STATE` under `work/local-runtime` in each terminal:

```powershell
$env:ROOTORIAL_LOCAL_STATE = 'work/local-runtime/my-experiment'
```

```sh
export ROOTORIAL_LOCAL_STATE=work/local-runtime/my-experiment
```

The automated tests always create fresh named directories and print their paths.
They retain the databases for inspection. Those directories are ignored by Git.
Do not run suites concurrently: runtime tests reserve 3220/3221/3223; browser
tests reserve 3220. No existing preview server is reused. The browser modes run
sequentially: two independent workerd processes must not own the same persisted
D1 directory simultaneously.

## Browser verification

Install the matching browser into a writable directory:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/work/playwright"
node node_modules/@playwright/test/cli.js install chromium
npm run test:runtime:browser
```

```sh
export PLAYWRIGHT_BROWSERS_PATH="$PWD/work/playwright"
node node_modules/@playwright/test/cli.js install chromium
npm run test:runtime:browser
```

The suite reuses the existing local-learning and Python specs, plus public-route
protection checks, with two isolated Vite modes reusing one migrated local D1
directory sequentially. It never imports the Clerk E2E setup. Python tests assert that browser
runtime and package traffic stays on the local origin.

If a matching browser download is unavailable, an explicitly chosen system
browser can provide supplementary evidence using `ROOTORIAL_BROWSER_EXECUTABLE`
(absolute executable path). Record its version; this is not matching-browser
validation. Reports are in `playwright-report/runtime-learning`,
`playwright-report/runtime-public` and the corresponding `test-results/runtime-*`
directories. Use `-- --project public-boundary` to rerun only the public check.

## Isolation and limits

The launcher selects Cloudflare environment `integration` and Vite mode
`content-preview` (or `e2e-anonymous` for public-route checks), binds loopback,
disables remote Vite bindings, passes `--local` to every Wrangler operation, and
uses dedicated configs containing no production database ID, routes, queues,
cron jobs or secrets. It passes an allowlist of platform/proxy variables to child
processes, disables dotenv/process-env imports in Wrangler, and uses a separate
Vite env directory. Environment or secret files next to the test configs cause
startup to fail. Local runtime mode rejects production builds.

These are local test tools, not deployment tools. Do not expose the repository
test fixture through a proxy. `npm run deploy` and remote migration scripts are
unrelated and must not be used for this workflow. Ordinary `npm run test:e2e`
creates real Clerk users and is intentionally excluded.

Cloud environments may lose processes on suspension/recreation; rerun `serve`.
Saved environment persistence of databases and downloaded tools depends on the
host. No always-on service or remote access is established by this setup.

CI currently calls the build without preparing ignored Python assets. A fresh CI
checkout needs the documented preparation step before its existing build jobs;
this change does not alter CI workflows.

## Cloud verification, 2026-10-02

The source handover was verified at `1929cc5ab153dbe27b0f9c655f30f0f4d475b574`.
Linux x86_64 with Node 24.19.0/npm 11.9.0 installed the lockfile successfully.
Official Pyodide assets passed verification (13 packages, 26,788,952 bytes).
On this proxy-based host, asset preparation needed Node's
`NODE_USE_ENV_PROXY=1`; that is an environment-specific setup detail.

- Existing `npm test`: 588 passed, including its typecheck/build and content checks.
- New launcher isolation tests: 2 passed; runtime and E2E typechecks passed.
- Actual workerd/D1 and built production rejection suite: passed, independently
  repeated by a read-only QA agent; persisted SQLite rows were independently read.
- Supplemental system Chromium 151.0.7922.173: 15/16 browser tests passed,
  including all 11 real Python tests and four local-learning tests.
- The remaining public-route test times out retrieving the public vectors page
  after its protected-route checks. It also fails when run alone with a single
  Vite server. A separate manual server returned the public vectors page normally;
  the trigger is unresolved. The assertion remains intact, and the browser suite
  exits unsuccessfully rather than skipping it.
- Matching Playwright Chromium 149/build1228 and its headless shell downloads
  were blocked by the host proxy (`403 Domain forbidden`). Matching-browser,
  Windows execution and real Clerk account integration remain unverified.

Wrangler/Vite attempted optional `Request.cf` metadata fetches, which failed and
fell back to a placeholder. No remote bindings, remote D1 operations, deployments
or real Clerk-user creation were used. Local evidence logs and retained databases
are under ignored `work/local-runtime/`; the setup can regenerate them elsewhere.
