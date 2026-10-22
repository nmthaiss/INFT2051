create table if not exists public.courts (
    id text primary key,
    osm_type text not null check (osm_type in ('node', 'way', 'relation')),
    osm_id bigint not null,
    name text not null default 'Unnamed court',
    sport text not null,
    latitude double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180),
    address text,
    website text,
    source text not null default 'osm',
    verified boolean not null default false,
    last_seen_at timestamptz not null default now(),
    unique (osm_type, osm_id)
);

create index if not exists courts_latitude_longitude_idx
    on public.courts (latitude, longitude);

create index if not exists courts_name_lower_idx
    on public.courts (lower(name));

create table if not exists public.court_cache_tiles (
    tile_id text primary key,
    south double precision not null,
    west double precision not null,
    north double precision not null,
    east double precision not null,
    fetched_at timestamptz not null default now()
);

alter table public.courts enable row level security;
alter table public.court_cache_tiles enable row level security;

revoke all on public.courts from anon, authenticated;
revoke all on public.court_cache_tiles from anon, authenticated;
