# Dependency audit

Snapshot: October 2, 2026. Command: `pnpm audit --prod --json` from the workspace root (includes the app and marketing workspace).

The audit reports **18 findings: 2 critical, 6 high, 7 moderate and 3 low**. These are installed-package findings, including repeated advisories for different installed versions; they are not 18 independent defects in Relay’s code.

| Package         | Installed versions           |                      Findings | Patch target              | Where used                                                               |
| --------------- | ---------------------------- | ----------------------------: | ------------------------- | ------------------------------------------------------------------------ |
| Next.js         | App 16.3.5; marketing 16.3.3 |                    2 critical | 16.3.6 or later           | App and marketing framework                                              |
| Undici          | 7.29.0                       | 10: 2 high, 5 moderate, 3 low | 7.29.1 or later           | OpenNext → Wrangler → Miniflare (Cloudflare build/local-preview tooling) |
| brace-expansion | 2.1.4; 5.0.9                 |         6: 4 high, 2 moderate | 2.1.7 and 5.0.12 or later | OpenNext → glob/minimatch (build tooling)                                |

## Exposure and remediation

- **Next.js:** the advisory concerns remote code execution in `next/og`’s `ImageResponse`. A source search found no `ImageResponse`, `next/og`, or dynamic Open Graph image route in Relay’s app or marketing code. The metadata uses a static social-preview image. This reduces the known exposure to that particular feature; it does not replace updating both framework versions.
- **Undici:** the findings cover denial of service, TLS certificate-validation bypass, cross-user cookie disclosure, response splitting, and unsafe caching. Exploitation depends on the affected WebSocket, retry, cache or connection-pool feature being used. Relay has no direct Undici imports; the installed vulnerable version comes through Miniflare. Update the Cloudflare tooling chain or use a narrowly scoped patched-version override if the parent packages have not updated.
- **brace-expansion:** crafted brace/glob expressions can consume excessive CPU or exhaust the stack. These versions enter through OpenNext build tools; no direct application import was found. Update the parent glob/minimatch dependencies or preserve each major-version line with narrowly scoped overrides.

No vulnerable version was changed as part of the launch-copy update. A remediation change should refresh the lockfile, rerun the production audit, app/marketing builds, and Cloudflare adapter/preview validation.

## Advisory references

### undici

- [undici vulnerable to Denial of Service via unhandled error in WebSocket permessage-deflate decompression](https://github.com/advisories/GHSA-3wwx-pv8p-q78v)
- [undici vulnerable to Denial of Service via orphaned RetryHandler response body](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x)
- [undici vulnerable to downstream response splitting via retry interceptor](https://github.com/advisories/GHSA-r53p-7pc4-xj5r)
- [undici vulnerable to Denial of Service via unrequested WebSocket subprotocol](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5)
- [undici vulnerable to Denial of Service via unbounded decompression of compressed responses](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm)
- [undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j)
- [undici vulnerable to response truncation via oversized chunked responses in the dump interceptor](https://github.com/advisories/GHSA-2gqq-gqf2-x968)
- [undici vulnerable to TLS certificate validation bypass via dropped connect options in BalancedPool](https://github.com/advisories/GHSA-w293-vg96-wgc3)
- [undici vulnerable to caching and replay of unsafe HTTP method responses](https://github.com/advisories/GHSA-8436-99hf-9mmv)
- [undici vulnerable to Denial of Service via WebSocketStream unclean close](https://github.com/advisories/GHSA-rx4f-c7p8-82vq)

### brace-expansion

- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7)
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)

### next

- [Next.js: Remote Code Execution in next/og ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
