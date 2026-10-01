# Operational notes

- The verified Compose stack uses host ports 55432 and 56379 because other applications occupied the usual PostgreSQL/Redis ports. Container services use their normal internal ports. Keep `.env` host URLs consistent with Compose port overrides.
- Production source remains owned by root while media/test output belongs to the node user. Vitest's bundled config loader writes beside its config, so use `docker compose exec app npm test -- --configLoader native` for container checks.
- On Windows, PowerShell native-command stderr can be reported as an error even after a successful Docker build. Check the build's final image result and preserve its exit code when redirecting logs.
- App and worker must share the media volume, database, Redis and encryption configuration. Moving an existing development database into Compose also requires copying its media objects; database rows alone are insufficient.
- An ambiguous paid retry creates a separate reserved generation while retaining the original potentially charged record. Cancelling a submitted request does not free its budget reservation. Saved output is checkpointed before importing or applying it.
- Browser console history can include earlier development hot-reload failures. Judge production errors on a fresh browser tab rather than accumulated daemon history.

These notes come from the implementation and verification session on September 30, 2026.
