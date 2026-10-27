create extension if not exists pg_trgm;

alter table public.court_cache_tiles
    add column if not exists data_version integer not null default 1;

create index if not exists courts_name_trgm_idx
    on public.courts using gin (lower(name) gin_trgm_ops);

create index if not exists courts_address_trgm_idx
    on public.courts using gin (lower(address) gin_trgm_ops)
    where address is not null;

create or replace function public.search_courts(
    search_query text,
    result_limit integer default 8
)
returns table (
    id text,
    name text,
    sport text,
    latitude double precision,
    longitude double precision,
    address text
)
language sql
stable
security definer
set search_path = public
as $$
    select
        courts.id,
        courts.name,
        courts.sport,
        courts.latitude,
        courts.longitude,
        courts.address
    from public.courts
    where length(trim(search_query)) >= 2
      and (
          lower(courts.name) like '%' || lower(trim(search_query)) || '%'
          or lower(coalesce(courts.address, '')) like '%' || lower(trim(search_query)) || '%'
      )
    order by
        case
            when lower(courts.name) like lower(trim(search_query)) || '%' then 0
            when lower(courts.name) like '%' || lower(trim(search_query)) || '%' then 1
            else 2
        end,
        similarity(lower(courts.name), lower(trim(search_query))) desc,
        courts.name
    limit least(greatest(result_limit, 1), 8);
$$;

revoke all on function public.search_courts(text, integer) from public, anon, authenticated;
grant execute on function public.search_courts(text, integer) to service_role;
