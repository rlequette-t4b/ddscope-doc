# DDScope — UI Tests (Playwright)

Tests end-to-end against the live CommWise app URL.

---

## Prerequisites

- Node.js installed
- Dependencies installed: `npm install`
- Playwright browsers installed: `npx playwright install`

---

## Configuration

Copy `.env.example` to `.env` at the root and fill in the values:

```
DDSCOPE_URL=https://commwise.b2wise.com/mcp-apps/mcp-apps-c3/mcp-c3-ddscope/
```

Optional — use your existing Chrome profile (see Auth section below):
```
CHROME_USER_DATA_DIR=C:\Users\<you>\AppData\Local\Google\Chrome\User Data
CHROME_PROFILE_DIR=Default
```

---

## Authentication model

By default, UI tests open the app directly at `DDSCOPE_URL`.

No auth setup is required when CommWise keeps your session active in the
browser context used by Playwright.

Optional: if you need to capture a dedicated storage state for troubleshooting,
run:

```bash
npm run test:ui:setup -- --headed
```

This uses `tests/ui/auth/setup.spec.js` as a manual helper and is not part of
the default UI run.

---

## Running tests

| Command | Description |
|---|---|
| `npm run test:ui` | Run all UI tests (headless) |
| `npm run test:ui:headed` | Run all UI tests with browser visible |
| `npm run test:ui:setup -- --headed` | Run optional manual auth helper |
| `npx playwright test tests/ui/smoke.spec.js` | Run only the smoke test |

---

## Fixture and sample loading policy

When a UI test must load data from `fixtures/` or `samples/`, always use the
shared helper in `tests/ui/helpers/open-project.js`.

Do not automate the toolbar Open button or native file chooser for those tests.
Use the helper so tests load JSON via the dedicated test-mode backdoor
(`?dds_test=1` + `window.__playwright_load_project__`).

Required pattern in tests:

```javascript
import path from 'path';
import { openProject } from '../helpers/open-project.js';

const filePath = path.resolve('fixtures/project-empty.json');
await openProject(page, filePath);
```

This rule is mandatory for new fixture/sample loading tests and for updates to
existing ones.

---

## Test structure

```
tests/ui/
├── auth/
│   ├── setup.spec.js        ← Optional manual auth helper
│   └── .auth/
│       └── user.json        ← Optional saved session (gitignored)
├── map/
│   └── node-drag.spec.js    ← Node drag and position persistence
├── panels/
│   └── node-panel.spec.js   ← Node panel edit → canvas update
└── smoke.spec.js            ← App shell loads correctly
```

---

## Troubleshooting

**`ENOENT: tests/ui/auth/.auth/user.json`** — This only matters if you
explicitly use storage state in a local experiment. The default configuration
does not require this file.

**`Target page, context or browser has been closed`** — The selector waited for
does not exist in the page, or a redirect closed the context before the selector
was found. Check that the app is reachable at `DDSCOPE_URL`.

**Chrome profile conflict** — If using Option B and Chrome is still open,
Chrome will refuse to start with the same profile. Close Chrome completely
before running the setup.
