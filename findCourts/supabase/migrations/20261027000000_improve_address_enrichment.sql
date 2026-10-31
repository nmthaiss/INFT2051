drop function if exists public.claim_court_address_tiles(
    text[],
    integer,
    timestamptz
);

create or replace function public.claim_court_address_tiles(
    requested_tile_ids text[],
    required_address_version integer,
    failed_retry_before timestamptz,
    unresolved_retry_before timestamptz
)
returns setof public.court_cache_tiles
language sql
security definer
set search_path = public
as $$
    update public.court_cache_tiles as tile
    set address_attempted_at = now()
    where tile.tile_id = any(requested_tile_ids)
      and (
          (
              tile.address_version
                  < required_address_version
              and (
                  tile.address_attempted_at is null
                  or tile.address_attempted_at
                      <= failed_retry_before
              )
          )
          or
          (
              tile.address_version
                  >= required_address_version
              and (
                  tile.address_attempted_at is null
                  or tile.address_attempted_at
                      <= unresolved_retry_before
              )
              and exists (
                  select 1
                  from public.courts as court
                  where court.address is null
                    and court.latitude >= tile.south
                    and court.latitude < tile.north
                    and court.longitude >= tile.west
                    and court.longitude < tile.east
              )
          )
      )
    returning tile.*;
$$;

revoke all on function public.claim_court_address_tiles(
    text[],
    integer,
    timestamptz,
    timestamptz
) from public, anon, authenticated;

grant execute on function public.claim_court_address_tiles(
    text[],
    integer,
    timestamptz,
    timestamptz
) to service_role;