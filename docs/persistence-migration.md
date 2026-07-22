# Homepage persistence migration

This runbook moves Homepage from Neon and Vercel Blob to standard PostgreSQL and
Cloudflare R2 without deleting either source. Run it from a trusted host with the
repository checkout and inject credentials through the environment or a secret
manager. Never paste credentials into shell history, logs, Git, or this document.

## Safety model

- Database copying is additive/upserting and never drops or truncates data.
- Object copying never deletes Vercel Blob objects.
- R2 serving begins only after every legacy object has a byte-for-byte SHA-256
  match and a migration-ledger record.
- Rollback changes metadata only for objects recorded in that ledger, after
  re-reading and hashing the Vercel source.
- Keep Neon, Vercel Blob, their credentials, and the last known-good deployment
  until the acceptance and rollback criteria below have passed.

Take provider-native backups or snapshots before the copy. Record the backup IDs
in the private operations log, not in Git.

## 1. Provision targets

Create an empty PostgreSQL database reachable by the Homepage runtime. Create a
private R2 bucket and an R2 API token scoped to Object Read & Write for only that
bucket. Set these secret environment variables on the trusted migration host:

```text
SOURCE_DATABASE_URL
TARGET_DATABASE_URL
WALLPAPER_READ_WRITE_TOKEN (or BLOB_READ_WRITE_TOKEN)
R2_ENDPOINT
R2_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

Use the account-specific S3 endpoint in `R2_ENDPOINT`, including `https://`.
Provider resource IDs and secret values remain outside the repository.

## 2. Prepare and copy PostgreSQL

Apply schema migrations to the target, inspect both sides, copy, and compare
ordered row digests. Supply `DATABASE_URL` only to the migration command:

```bash
DATABASE_URL="$TARGET_DATABASE_URL" bun run db:migrate
bun run db:copy -- plan
MIGRATION_CONFIRM_COPY=copy-homepage-data bun run db:copy -- copy
bun run db:copy -- verify
```

`verify` must report `"matches":true`. The digests include Clerk user IDs,
bookmark JSON, versions, wallpaper metadata, and timestamps, but the command
prints only counts and digests—not user IDs or connection strings.

For the final cutover, briefly stop writes or place Homepage in the platform's
maintenance mode, rerun `copy` and `verify`, then point the runtime
`DATABASE_URL` at the target. Restart and verify signed-in bookmark reads and a
bookmark update before allowing writes normally.

## 3. Copy and cut over wallpaper objects

Use the target database as `DATABASE_URL`. The copy writes R2 objects and the
private database migration ledger, then immediately compares the complete source
and target bytes:

```bash
bun run wallpapers:migrate -- plan
MIGRATION_CONFIRM_OBJECT_COPY=copy-wallpapers-to-r2 \
  bun run wallpapers:migrate -- copy
bun run wallpapers:migrate -- verify
MIGRATION_CONFIRM_R2_SWITCH=serve-wallpapers-from-r2 \
  bun run wallpapers:migrate -- switch
```

After the switch, set `WALLPAPER_STORAGE_PROVIDER=r2` for new uploads, restart,
and rerun `verify`. Existing rows retain their Vercel Blob URLs for rollback,
while the application serves their provider-neutral keys through its
authenticated endpoint.

## 4. Acceptance criteria

Do not retire a source provider until all of these remain true through the agreed
observation window:

- Database verification reports matching row counts and digests at cutover.
- Wallpaper verification reports every migration-ledger object verified.
- `/api/health` is healthy on the production hostname.
- A signed-in production check can read and update bookmarks.
- A signed-in production check can view, upload, download, replace, and remove a
  wallpaper; replacement and removal are tested only with disposable test data.
- Application logs contain no database, R2, authentication, or wallpaper errors.
- The team has rehearsed the metadata rollback below and can redeploy the last
  known-good image.

Only after those criteria pass may an operator separately delete Neon/Vercel
resources and revoke their credentials in the provider consoles.

## 5. Rollback

If R2 reads fail but PostgreSQL is healthy, keep the new application deployed and
switch only migrated rows back after verifying the Vercel originals:

```bash
MIGRATION_CONFIRM_R2_ROLLBACK=serve-migrated-wallpapers-from-vercel-blob \
  bun run wallpapers:migrate -- rollback
```

Set `WALLPAPER_STORAGE_PROVIDER=vercel-blob` for new uploads, restart, and verify
the signed-in wallpaper flow. The command does not touch R2 objects or rows that
were created only after the R2 cutover.

If the target PostgreSQL fails, restore the previous runtime configuration with
the Neon connection string and redeploy the last known-good image. Before doing
so, stop writes and reconcile any rows changed after cutover; the database copy
tool intentionally never performs an automatic reverse overwrite.
