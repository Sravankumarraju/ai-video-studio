# Project backup

Git stores the application source, production scripts, tests, deployment templates,
and sanitized delivery records in `docs/deliveries/`.

The following remain local and are not restored by cloning the repository:

- `data/`: production media, project state, database files, and encrypted upload sessions.
- `output/`, `.tmp/`, `test-output/`: generated exports and temporary files.
- `.env` and environment-specific files: credentials and encryption keys.
- `node_modules/`, `.next/`, Python caches, coverage, and logs.

Back up production data and media separately to private storage. Preserve the
original encryption key securely alongside a database backup; do not commit it.
Environment templates ending in `.example` may be tracked.

The existing GitHub remote is public. A Git source backup is not a complete backup
of the local studio or its video assets.
