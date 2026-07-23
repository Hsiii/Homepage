create table public.user_bookmarks (
    user_id uuid primary key references auth.users (id) on delete cascade,
    categories jsonb not null check (jsonb_typeof(categories) = 'array'),
    version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.user_wallpapers (
    user_id uuid primary key references auth.users (id) on delete cascade,
    object_key text not null unique,
    content_type text not null check (
        content_type in ('image/jpeg', 'image/png', 'image/webp')
    ),
    size_bytes integer not null check (
        size_bytes > 0 and size_bytes <= 33554432
    ),
    width integer not null check (width > 0 and width <= 5120),
    height integer not null check (height > 0 and height <= 5120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_bookmarks enable row level security;
alter table public.user_wallpapers enable row level security;

revoke all on public.user_bookmarks from anon;
revoke all on public.user_wallpapers from anon;
grant select, insert, update, delete on public.user_bookmarks to authenticated;
grant select, insert, update, delete on public.user_wallpapers to authenticated;

create policy "Users read their bookmarks"
on public.user_bookmarks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their bookmarks"
on public.user_bookmarks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their bookmarks"
on public.user_bookmarks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their bookmarks"
on public.user_bookmarks
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read their wallpaper metadata"
on public.user_wallpapers
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their wallpaper metadata"
on public.user_wallpapers
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their wallpaper metadata"
on public.user_wallpapers
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their wallpaper metadata"
on public.user_wallpapers
for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'wallpapers',
    'wallpapers',
    false,
    33554432,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their wallpaper objects"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = 'homepage-assets'
    and (storage.foldername(name))[2] = (select auth.uid())::text
);

create policy "Users create their wallpaper objects"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = 'homepage-assets'
    and (storage.foldername(name))[2] = (select auth.uid())::text
);

create policy "Users update their wallpaper objects"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = 'homepage-assets'
    and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = 'homepage-assets'
    and (storage.foldername(name))[2] = (select auth.uid())::text
);

create policy "Users delete their wallpaper objects"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = 'homepage-assets'
    and (storage.foldername(name))[2] = (select auth.uid())::text
);
