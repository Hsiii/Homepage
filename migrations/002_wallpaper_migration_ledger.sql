create table if not exists homepage_wallpaper_migrations (
    user_id text primary key,
    object_key text not null unique,
    source_provider text not null check (source_provider = 'vercel-blob'),
    target_provider text not null check (target_provider = 'r2'),
    sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    size_bytes integer not null check (size_bytes > 0),
    copied_at timestamptz not null default now(),
    verified_at timestamptz,
    switched_at timestamptz,
    rolled_back_at timestamptz
);
