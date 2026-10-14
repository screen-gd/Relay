# Run the app on TanStack Start

The app moved from Next.js App Router to TanStack Start on Vite. Relay renders in the browser with Convex and Clerk and used no Server Components, Server Actions or server data loading, so Next added a server model the app did not use. TanStack Start gives type-checked routes, params and search params, and one Vite toolchain shared with Vitest.

Vercel hosts the app through Nitro, which is Vercel's supported path for TanStack Start. `vite build --mode cloudflare` keeps an optional Cloudflare Worker build. The marketing site in `website/` stays on Next.js and Cloudflare.

The `/__clerk` Frontend API proxy runs as request middleware in `src/start.ts`. Other requests still skip Clerk on the server. Public settings use `VITE_*` names and are inlined at build time.

Nitro 3 was still tagged beta and TanStack Start 1.0 was days old at the time of the move, so the install pins the last release candidate (1.168.60). Upgrade to 1.169 or later once it has been out for a week.
