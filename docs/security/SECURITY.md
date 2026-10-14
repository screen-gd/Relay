# Security Policy

## Security Model

- Clerk handles user authentication in the TanStack Start application.
- Convex functions derive server-side authorization from the authenticated Convex identity. Client-provided user identifiers must not be trusted for access decisions.
- Public client portal queries must return explicit client-safe projections rather than raw project, file, user, or team records.
- Internal notes, uploader IDs, team data, private assets, reference files, and other internal metadata must not be included in public portal responses.
- The application configures baseline response headers including frame, content-type, referrer, and browser-permission restrictions.

These controls describe the current implementation. They are not a claim of certification, regulatory compliance, or a formal security audit.

## Client Portal Protection

Client portals are public bearer links. Editors can additionally require a PIN or password, disable the link, set an expiry, or regenerate its token.

- Portal passwords are optional. Existing and newly created portals remain unprotected until an editor enables protection.
- Passwords are derived with PBKDF2-SHA-256 using a random 16-byte salt and 120,000 iterations.
- Convex stores only the derived hash, salt, and iteration count. Plaintext passwords are never written to the database.
- Hash material is excluded from editor and public query responses. Editors can only see whether protection is enabled.
- `getByToken` first fetches the matching `clientPortals` row so `portalAccessState` can check publication and expiry and `portalPasswordMatches` can verify `passwordHash`, `passwordSalt`, and `passwordIterations`. If verification fails, it returns only `{ access: "locked" }`; it does not query `portalDeliverables`, call `visibleProjectDeliverables`, or query `portalRevisions` or `portalEvents` until access is granted.
- Missing and incorrect credentials use the same locked response. Public revision submissions use the same password, enabled, and expiry checks.
- Removing protection deletes the stored hash, salt, and iteration count.
- The browser keeps an entered credential only in component memory for the current page session. It is not placed in the URL or browser storage.

Portal links and their passwords are still shared secrets. Use expiry and token regeneration when access should end, and avoid reusing account passwords as portal credentials.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately through the repository's GitHub security reporting interface. If private vulnerability reporting is unavailable, contact the repository owner privately through their GitHub profile.

Include:

- A description of the issue and its potential impact.
- Reproduction steps or a minimal proof of concept.
- The affected route, Convex function, or workflow.
- Any suggested mitigation, if known.

Do not include secrets, personal data, client files, or active exploit details in a public issue. Please allow the repository owner time to investigate before public disclosure.
