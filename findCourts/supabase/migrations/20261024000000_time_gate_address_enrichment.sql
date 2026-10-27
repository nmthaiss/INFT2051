alter table public.court_cache_tiles
    add column if not exists address_version integer not null default 0,
    add column if not exists address_attempted_at timestamptz;

update public.court_cache_tiles
set address_version = 1
where data_version >= 3;

-- Every existing tile already has its base court coverage stored. Address
-- enrichment is now tracked independently instead of forcing another court fetch.
update public.court_cache_tiles
set data_version = 2
where data_version <> 2;

create or replace function public.claim_court_address_tiles(
    requested_tile_ids text[],
    required_address_version integer,
    retry_before timestamptz
)
returns setof public.court_cache_tiles
language sql
security definer
set search_path = public
as $$
    update public.court_cache_tiles
    set address_attempted_at = now()
    where tile_id = any(requested_tile_ids)
      and address_version < required_address_version
      and (
          address_attempted_at is null
          or address_attempted_at <= retry_before
      )
    returning *;
$$;

revoke all on function public.claim_court_address_tiles(text[], integer, timestamptz)
    from public, anon, authenticated;
grant execute on function public.claim_court_address_tiles(text[], integer, timestamptz)
    to service_role;
