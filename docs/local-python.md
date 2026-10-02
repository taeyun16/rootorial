# Local Python runtime and validation

Rootorial runs **real Pyodide 0.27.7 (CPython 3.12.7)** in the existing shared Web
Worker. The runtime, standard library, package lockfile, NumPy 2.0.2, Matplotlib
3.8.4 and their dependency closure are served from the app's own static assets.
There is no runtime CDN fallback and no mock Python interpreter.

## Prepare once, then execute locally

Node >=22.13.0 and `tar` are required. Windows includes `tar.exe`.

```powershell
npm ci
npm run python:prepare -- --download
npm run python:check
npm run dev:python
```

Open <http://127.0.0.1:3212/admin/preview/curricula/>. Port 3212 is loopback only.
Existing servers on 3000/3201 are unaffected. If needed, use the ordinary Vite
CLI with another free loopback port after `python:check`.

**Initial preparation needs an authorized network**, not an offline guarantee.
`npm ci` obtains the pinned core from the official npm registry.
The explicit `--download` step gets the matching official GitHub release:
<https://github.com/pyodide/pyodide/releases/tag/0.27.7>. The upstream archive is
about **389 MB**, but only the required package files are extracted; the served
runtime and 13 package files total about **26.8 MB**. No jsDelivr requests are
made by the preparation script. Do not use mirrors or change browser/network
security settings if an official source is blocked.

With an already authorized local copy of the official distribution, no download
is needed:

```powershell
npm run python:prepare -- --from 'C:\path\to\pyodide'
```

Pass the extracted `pyodide` directory containing `pyodide-lock.json` and the
required wheels. Core assets come from the exact pinned npm dependency. The
source lockfile must be byte-identical to the official npm lockfile. Each wheel
must pass its upstream SHA-256 check, including all transitive dependencies.
This command assumes `npm ci` has already succeeded or its dependencies are
available locally.

After the first successful preparation:

```powershell
npm run python:prepare
npm run dev:python
npm run test:e2e:python
npm run build
```

Plain `python:prepare` reuses the local validated package cache **without network
requests**. `python:check`, development, browser Python execution of the supplied
lessons, and building use prepared local assets; they do not fetch runtime or
package files externally. The browser still needs to reach the local app server.
This does not promise a fully offline app: arbitrary edited Python can use
network APIs, and other app features and tooling may need network access.

The supplied lesson imports need NumPy and Matplotlib. Additional known
Pyodide packages are requested only from the same local base and fail with an
asset message if absent; unknown modules produce ordinary Python import errors.
There is no automatic PyPI/micropip installation path for lessons. Adding a
supported package requires updating `LESSON_PACKAGES`, preparing and validating
its full dependency closure, and testing actual browser execution.

## Integrity, caching and licensing

- `public/python-runtime/` and `work/` are ignored by Git. Do not commit the
  distribution archive, WASM, wheels, generated manifests, or credentials.
- Prepared runtime URLs include the exact version and a hash of file hashes,
  lengths and package selection. `manifest.json` is fetched with
  `cache: "no-store"`; its pointer is published only after all files validate.
  New versions/package changes select a new URL. Stop/restart creates a new
  worker/interpreter. After a version change, reload existing browser tabs.
- `npm run build` checks that the prepared manifest, core files and every package
  match the pinned dependency before Vite copies them into `dist/client`.
  Preparation never runs implicitly as a build-time network download.
- License/provenance notices, the original npm README and the official Pyodide
  license accompany served assets. Wheels are copied unmodified, preserving
  their bundled licenses and `.dist-info` metadata. Pyodide's MPL-2.0 npm license
  does not replace CPython or dependency licenses.
- No SharedArrayBuffer, cross-origin isolation or CSP relaxation is needed:
  stop terminates the existing dedicated worker. If a hosting environment adds
  CSP, it must permit its same-origin worker/scripts/connects and WebAssembly
  compilation as documented by Pyodide. WASM must be served as
  `application/wasm`. Current loopback Vite serving is verified.
- This change covers the app's local serving path. The separate private preview
  proxy has its own asset allowlist and is not modified or verified here.

Official deployment and API references:
[Downloading and deploying](https://pyodide.org/en/0.27.7/usage/downloading-and-deploying.html),
[JavaScript API](https://pyodide.org/en/0.27.7/usage/api/js-api.html).

## Real execution E2E

`npm run test:e2e:python` validates prepared assets, applies only local E2E D1
migrations, and starts an isolated loopback rehearsal on 3212. No Clerk setup,
credentials, remote database changes or deployment are needed.
An already running compatible rehearsal server on 3212 is reused.
Install the browser matching the project Playwright version on an authorized
network when necessary, or select an already installed Chromium browser:

```powershell
$env:ROOTORIAL_PYTHON_BROWSER_CHANNEL = 'chrome' # or 'msedge'
npm run test:e2e:python
```

The dedicated tests execute actual WASM Python and cover:
NumPy and both Matplotlib vector charts; stdout/stderr and expression results;
Python errors and recovery; predictions and stale edited/in-flight results;
infinite-loop stop and a clean restart; missing local assets and recovery;
unprepared packages without CDN fallback.

Each fresh browser context rejects external HTTP requests and asserts **zero
attempted external requests**. Network evidence is attached as
`python-network.json` to the HTML report at
`playwright-report/python/index.html`, including successful local WASM/wheel
responses. A rejected external attempt fails the test; it is never counted as
offline success. Failure cases inject only local asset request failures, never
a Python result or interpreter substitute.

To rerun the two existing Python regressions on separate loopback ports:

```powershell
$env:ROOTORIAL_REHEARSAL_URL = 'http://127.0.0.1:3212'
$env:ROOTORIAL_PYTHON_BROWSER_CHANNEL = 'chrome'
npx playwright test --config playwright.python-regression.config.ts
```

The public anonymous server uses 3213 and the rehearsal uses/reuses 3212.
