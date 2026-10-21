# Divine Wisdom Ubuntu deployment

Prepared for freezenest, 103.207.183.11: 4 vCPU, 8 GB RAM, 80 GB SSD. Not deployed yet. SSH username/key access, Ubuntu version and domain are pending.

This is a separate Compose project; it does not change the Windows production stack. Start with one render worker. Postgres and Redis have no public ports; the dashboard binds to server loopback for initial SSH-tunnel access.

## Server prerequisites

Install Docker Engine and the Compose plugin using the official Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/ . Confirm the Ubuntu version is supported. Keep SSH available; do not change the firewall until the actual SSH port/access is confirmed.

Copy the application source into a server directory such as `/opt/divine-wisdom`. Exclude local `.env`, node_modules, .next, .git and unrelated production media from the initial source transfer. Provider credentials are configured privately afterward. Do not copy the entire Windows render disk to an 80 GB server.

## First startup

From the repository root on Ubuntu:

```sh
cp deploy/ubuntu/.env.server.example deploy/ubuntu/.env.server
chmod 600 deploy/ubuntu/.env.server
# Fill .env.server privately before starting.
docker compose --env-file deploy/ubuntu/.env.server -f deploy/ubuntu/compose.yaml config --quiet
docker compose --env-file deploy/ubuntu/.env.server -f deploy/ubuntu/compose.yaml build app
docker compose --env-file deploy/ubuntu/.env.server -f deploy/ubuntu/compose.yaml up -d db redis app
```

Use an SSH tunnel from the owner's computer, replacing USERNAME:

```sh
ssh -L 3000:127.0.0.1:3000 USERNAME@103.207.183.11
```

Open http://localhost:3000 and sign in with the configured owner password. Change the tunnel port and APP_ORIGIN together if port 3000 is already in use locally. Inspect app health/login before enabling workers:

```sh
docker compose --env-file deploy/ubuntu/.env.server -f deploy/ubuntu/compose.yaml up -d worker youtube-worker
docker compose --env-file deploy/ubuntu/.env.server -f deploy/ubuntu/compose.yaml ps
```

Migrations run through existing image commands. Rendering temporary files and checkpoints persist under the media volume. Benchmark one authorized representative job and inspect disk/RAM before expanding concurrency.

## Existing projects and YouTube connection

A fresh server does not contain local projects, scripts' production state, encrypted provider profiles, media or YouTube OAuth tokens. Plan database plus media plus selected production-directory migration together, and preserve the encryption key for encrypted records. Back up before migration; never overwrite a working database without a recovery plan. Avoid simultaneously operating the same migrated queue from Windows and Ubuntu. Reconnect Google OAuth when moving from localhost to a domain if callback configuration requires it.

The app worker executes queued jobs and the YouTube worker handles authorized uploads. They do not independently write new weekly scripts or replace this chat's local guidance automation. A server-side weekly planner/model integration is a separate implementation stage. Existing private videos must not become public merely because workers start.

## HTTPS and weekly releases

Once a domain points to the server, install/configure the HTTPS reverse proxy, set the exact APP_ORIGIN and Google callback, and verify owner login/OAuth again. Keep database and Redis internal. Apply the confirmed M/W/F shloka, Saturday complete chapter and 4–5 question Shorts cadence through authorized weekly manifests; release times still need to be chosen.

Keep completed outputs/source backups in separate storage. Monitor disk space before each render; retain source/checkpoints until final verification and a backup exist. Do not use `docker compose down -v`, which deletes persistent project data.

## Validation status

Compose configuration will be checked locally without printing resolved secrets. Remote build, health, rendering benchmark and OAuth are unverified until server access is provided. No paid generation or YouTube publishing is performed by this preparation.
