---
name: convex-quickstart
description: "Scaffold a new app after the user or project has selected Convex."
---

# Start a Convex app

Follow [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md). Confirm the stack from the request or project policy and preserve any existing app.

Use the project's installed tooling and current official setup instructions. Use a recipe runner only if it is actually available and its behavior fits the authorized scope. Do not assume an upstream recipe pack is installed.

Create the requested local scaffold, install its required dependencies and run the relevant local checks. Creating or connecting a cloud deployment needs an authorized target; local scaffolding does not authorize rebinding an existing deployment or `.env.local`.

If the request is only for a scaffold, finish there and report how to run it. If the user requested a feature or complete app, continue implementing that scope after scaffolding without another confirmation. Do not stop merely because the template runs.
