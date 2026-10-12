# 01 — HIGH — A Clerk failure hides the entire app behind a permanent full-viewport overlay

**Impact:** total. Every route renders the app _underneath_ an opaque "Loading Relay…" rectangle that
covers the viewport, so the product looks blank and nothing responds to a click. It also means the
documented local setup produces a dead app.

## Contract clauses

- `docs/design/system/states-feedback.md` — "Define default, hover, pressed, focus, selected, expanded,
  checked, disabled, loading, empty, no results, **error**, success, offline, stale, and sample/read-only
  states for each component."
- `docs/design/system/states-feedback.md` — "Recoverable errors retain user input and offer retry."
- `docs/design/system/overview.md` — "Every control and page defines default, hover, pressed,
  focus-visible, selected, disabled, loading, empty, no-results, **error**, success, and read-only states."

## Verified anchors

- `src/features/workspace/workspace-runtime.tsx:140` —
  `{!isAuthLoaded ? <AppLoadingStatus /> : null}`
- `src/lib/data-context.tsx:2569` —
  `isAuthLoaded: clerkLoaded && ready && (!isSignedIn || !convexAuthLoading),`
- `src/app/providers.tsx:65` — `const hasCloudConfig = hasConvexConfig && hasClerkConfig;`
- `src/app/providers.tsx:77` — `mode={hasCloudConfig ? "cloud" : "local"}`
- `src/features/routes/shared/app-feedback.tsx:85-93` — `AppLoadingStatus`, the overlay itself
  (`className="fixed inset-0 z-[1450] grid place-items-center bg-[var(--app-canvas)] …"`)

## Repro

```
cp .env.production .env.local      # as the README instructs
pnpm dev:next
# open http://localhost:3100/projects, wait 20s
```

Measured at 20 s (Playwright, 1440x900 and 390x844):

```
overlayPresent: true
overlayText: "Loading Relay…"
overlayRect: {x:0,y:0,width:1440,height:900}    # and {0,0,390,844} on mobile
clerkLoaded: false
backgroundContentRendered: true                 # the dashboard IS painted underneath
```

Console, twice:

```
Clerk: Production Keys are only allowed for domain "relay-app.cc.cd".
API Error: The Request HTTP Origin header must be equal to or a subdomain of the requesting URL.
```

Evidence: `renders/RELA-14/blocked-clerk-overlay-desktop.png`, `blocked-clerk-overlay-mobile.png`.

## What is actually wrong

`isAuthLoaded` requires `clerkLoaded`, which never becomes true when Clerk cannot initialise. The gate
has no timeout, no failure branch, no retry and no explanation, so any Clerk problem — outage, blocked
CDN, proxy, or the committed production key on a non-production origin — removes the whole UI. Note the
app is otherwise healthy: it has fully rendered, it is simply covered.

This is not a network problem. Clerk's JS returns 200
(`clerk.relay-app.cc.cd/npm/@clerk/clerk-js@6.39.0/dist/clerk.browser.js`), and serving the app over
`https://relay-app.cc.cd` through a temporary local TLS front removed the console error while the
overlay stayed up after 12 s. The gate is the domain/scheme binding of a production key.

## Fix direction

1. Give the gate a deadline. In `WorkspaceFrame`, run a timer while `!isAuthLoaded`; after ~8 s, stop
   covering the app and render a real error panel in place of `AppLoadingStatus`.
2. The panel needs: what failed, the Clerk/Convex error string if available, a **Retry** button that
   re-attempts, and a link to `/access` so a user with another workspace can still get in. It must be
   focusable and announced (`role="alert"`), per the accessibility contract's error rules.
3. Do not let a slow-but-working Clerk regress: the timer should only fire, never block a late success.
4. Separately, make the committed-config path bootable. Either the repo stops shipping a production
   Clerk key in `.env.production`, or the README's local instructions document removing it. Right now
   `pnpm dev` + copy-as-documented = dead app, which is also why every Playwright run in this repo is
   untrustworthy (see the audit report's Lesson).

## Acceptance criteria

- With `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` present but unusable, every workspace route becomes usable
  or shows an error panel **within 10 s**, with a working Retry and a link to `/access`.
- With Clerk working normally, the overlay appears and clears exactly as before — no added delay.
- A Playwright assertion exists that fails if a full-viewport `[role="status"]` overlay is still
  present after 10 s on `/projects`. (The current `e2e/helpers.ts` `openApp()` cannot catch this: it
  waits for `getByText("Loading workspace", { exact: true })`, a string that appears nowhere in `src`,
  so `toBeHidden()` passes on zero matches.)
- Keyboard focus can reach the error panel's Retry, and Escape/Tab behave.

## Out of scope

Do not redesign the loading skeleton. Do not change Clerk keys in `.env.production` without the owner's
agreement — flag it instead.
