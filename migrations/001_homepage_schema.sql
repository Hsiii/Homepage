create table if not exists user_bookmarks (
    user_id text primary key,
    categories jsonb not null check (jsonb_typeof(categories) = 'array'),
    version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists user_wallpapers (
    user_id text primary key,
    url text not null,
    download_url text not null,
    pathname text not null,
    content_type text not null,
    size_bytes integer not null check (size_bytes > 0 and size_bytes <= 33554432),
    width integer not null check (width > 0 and width <= 5120),
    height integer not null check (height > 0 and height <= 5120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table user_wallpapers
    add column if not exists storage_provider text,
    add column if not exists object_key text;

update user_wallpapers
set
    storage_provider = coalesce(storage_provider, 'vercel-blob'),
    object_key = coalesce(object_key, pathname)
where storage_provider is null or object_key is null;

alter table user_wallpapers
    alter column storage_provider set not null,
    alter column object_key set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'user_wallpapers_storage_provider_check'
    ) then
        alter table user_wallpapers
            add constraint user_wallpapers_storage_provider_check
            check (storage_provider in ('vercel-blob', 'r2', 'local'));
    end if;
end $$;

create unique index if not exists user_wallpapers_object_key_idx
    on user_wallpapers (object_key);
