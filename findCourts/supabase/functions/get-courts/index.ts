import { createSupabaseContext } from 'npm:@supabase/server@1';

type Bounds = {
    south: number;
    west: number;
    north: number;
    east: number;
};

type Tile = Bounds & {
    id: string;
};

type OverpassElement = {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
};

const TILE_SIZE_DEGREES = 0.1;
const MAX_TILES_PER_REQUEST = 25;
const COURT_DATA_VERSION = 2;
const ADDRESS_DATA_VERSION = 1;
const ADDRESS_RETRY_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const NEARBY_ADDRESS_RADIUS_METRES = 200;
const EARTH_RADIUS_METRES = 6_371_000;
const OVERPASS_URLS = [
    'https://overpass.maprva.org/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
];
const OVERPASS_REQUEST_TIMEOUT_MS = 25_000;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

function json(body: unknown, status = 200) {
    return Response.json(body, { status, headers: corsHeaders });
}

function isValidBounds(value: unknown): value is Bounds {
    if (!value || typeof value !== 'object') return false;

    const bounds = value as Record<string, unknown>;
    const values = [bounds.south, bounds.west, bounds.north, bounds.east];

    return values.every((item) => typeof item === 'number' && Number.isFinite(item))
        && (bounds.south as number) >= -90
        && (bounds.north as number) <= 90
        && (bounds.west as number) >= -180
        && (bounds.east as number) <= 180
        && (bounds.south as number) < (bounds.north as number)
        && (bounds.west as number) < (bounds.east as number);
}

function tilesForBounds(bounds: Bounds): Tile[] {
    const southIndex = Math.floor(bounds.south / TILE_SIZE_DEGREES);
    const northIndex = Math.floor((bounds.north - Number.EPSILON) / TILE_SIZE_DEGREES);
    const westIndex = Math.floor(bounds.west / TILE_SIZE_DEGREES);
    const eastIndex = Math.floor((bounds.east - Number.EPSILON) / TILE_SIZE_DEGREES);
    const tiles: Tile[] = [];

    for (let latitudeIndex = southIndex; latitudeIndex <= northIndex; latitudeIndex += 1) {
        for (let longitudeIndex = westIndex; longitudeIndex <= eastIndex; longitudeIndex += 1) {
            tiles.push({
                id: `${latitudeIndex}:${longitudeIndex}`,
                south: latitudeIndex * TILE_SIZE_DEGREES,
                west: longitudeIndex * TILE_SIZE_DEGREES,
                north: (latitudeIndex + 1) * TILE_SIZE_DEGREES,
                east: (longitudeIndex + 1) * TILE_SIZE_DEGREES,
            });
        }
    }

    return tiles;
}

declare const EdgeRuntime: {
    waitUntil(promise: Promise<unknown>): void;
};

function courtOverpassQuery(tiles: Tile[]) {
    const courtClauses = tiles.flatMap((tile) => {
        const box = `${tile.south},${tile.west},${tile.north},${tile.east}`;
        return [
            `nwr["sport"="tennis"](${box});`,
            `nwr["sport"="badminton"](${box});`,
            `nwr["sport"="pickleball"](${box});`,
        ];
    }).join('\n');

    return `
        [out:json][timeout:30];
        (
          ${courtClauses}
        );
        out center tags;
    `;
}

function addressOverpassQuery(elements: OverpassElement[]) {
    const addressClauses = elements.flatMap((element) => {
        const coords = coordinates(element);
        const hasDirectAddress = Boolean(formatAddress(element.tags ?? {}));

        return coords && !hasDirectAddress
            ? [`node(around:${NEARBY_ADDRESS_RADIUS_METRES},${coords.lat},${coords.lng})["addr:street"];`]
            : [];
    });

    if (addressClauses.length === 0) return null;

    return `
        [out:json][timeout:30];
        (
          ${addressClauses.join('\n')}
        );
        out center tags;
    `;
}

function coordinates(element: OverpassElement) {
    if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
        return { lat: element.lat, lng: element.lon };
    }

    if (element.center) {
        return { lat: element.center.lat, lng: element.center.lon };
    }

    return null;
}

function formatAddress(tags: Record<string, string>) {
    return [
        [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
        tags['addr:suburb'],
        tags['addr:city'],
        tags['addr:state'],
        tags['addr:postcode'],
    ].filter(Boolean).join(', ');
}

function distanceInMetres(
    first: { lat: number; lng: number },
    second: { lat: number; lng: number },
) {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = radians(second.lat - first.lat);
    const longitudeDelta = radians(second.lng - first.lng);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat))
        * Math.sin(longitudeDelta / 2) ** 2;

    return EARTH_RADIUS_METRES * 2
        * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function courtsFromOverpass(
    elements: OverpassElement[],
    nearbyAddressElements: OverpassElement[] = [],
) {
    const supportedSports = new Set(['tennis', 'badminton', 'pickleball']);
    const addressFeatures = nearbyAddressElements.flatMap((element) => {
        const coords = coordinates(element);
        const address = formatAddress(element.tags ?? {});

        return coords && address ? [{ ...coords, address }] : [];
    });

    return elements.flatMap((element) => {
        const tags = element.tags ?? {};
        const coords = coordinates(element);

        if (!coords || !supportedSports.has(tags.sport ?? '')) return [];

        const directAddress = formatAddress(tags);
        const nearbyAddress = directAddress ? null : addressFeatures
            .map((feature) => ({
                ...feature,
                distance: distanceInMetres(coords, feature),
            }))
            .filter((feature) => feature.distance <= NEARBY_ADDRESS_RADIUS_METRES)
            .sort((first, second) => first.distance - second.distance)[0]?.address;

        return [{
            id: `osm-${element.type}-${element.id}`,
            osm_type: element.type,
            osm_id: element.id,
            name: tags.name || 'Unnamed court',
            sport: tags.sport,
            latitude: coords.lat,
            longitude: coords.lng,
            address: directAddress || nearbyAddress || null,
            website: tags.website || null,
            source: 'osm',
            verified: false,
            last_seen_at: new Date().toISOString(),
        }];
    });
}

async function fetchOverpass(elementsQuery: string) {
    const failures: string[] = [];

    for (const url of OVERPASS_URLS) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': 'FindCourts/1.0 (student project)',
                },
                body: new URLSearchParams({ data: elementsQuery }),
                signal: AbortSignal.timeout(OVERPASS_REQUEST_TIMEOUT_MS),
            });

            if (response.ok) {
                return await response.json() as { elements: OverpassElement[] };
            }

            const responseText = await response.text();
            failures.push(`${url}: ${response.status} ${responseText.slice(0, 200)}`);
        } catch (error) {
            failures.push(`${url}: ${error instanceof Error ? error.message : 'request failed'}`);
        }
    }

    throw new Error(`All Overpass instances failed. ${failures.join(' | ')}`);
}

export default {
async fetch(request: Request) {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405);
    }

    const { data: context, error: authError } = await createSupabaseContext(request, {
        auth: 'publishable',
    });

    if (authError || !context) {
        return json({ error: authError?.message ?? 'Unauthorized.' }, authError?.status ?? 401);
    }

    try {
        const bounds: unknown = await request.json();
        if (!isValidBounds(bounds)) {
            return json({ error: 'A valid south, west, north and east bounding box is required.' }, 400);
        }

        const tiles = tilesForBounds(bounds);
        if (tiles.length > MAX_TILES_PER_REQUEST) {
            return json({ error: `Requested area is too large; maximum ${MAX_TILES_PER_REQUEST} tiles.` }, 400);
        }

        const { data: cachedRows, error: cacheReadError } = await context.supabaseAdmin
            .from('court_cache_tiles')
            .select('tile_id, data_version, address_version, address_attempted_at')
            .in('tile_id', tiles.map((tile) => tile.id));

        if (cacheReadError) throw cacheReadError;

        const storedTileIds = new Set(
            (cachedRows ?? [])
                .filter((row) => row.data_version >= COURT_DATA_VERSION)
                .map((row) => row.tile_id),
        );

        const missingTiles = tiles.filter(
            (tile) => !storedTileIds.has(tile.id),
        );

        let newlyFetchedElements: OverpassElement[] = [];

        if (missingTiles.length > 0) {
            const overpassData = await fetchOverpass(courtOverpassQuery(missingTiles));
            newlyFetchedElements = overpassData.elements;
            const fetchedCourts = [...new Map(
                courtsFromOverpass(overpassData.elements).map((court) => [court.id, court]),
            ).values()];

            if (fetchedCourts.length > 0) {
                const { error: courtWriteError } = await context.supabaseAdmin
                    .from('courts')
                    .upsert(fetchedCourts, { onConflict: 'id' });
                if (courtWriteError) throw courtWriteError;
            }

            const fetchedAt = new Date().toISOString();
            const { error: cacheWriteError } = await context.supabaseAdmin
                .from('court_cache_tiles')
                .upsert(missingTiles.map((tile) => ({
                    tile_id: tile.id,
                    south: tile.south,
                    west: tile.west,
                    north: tile.north,
                    east: tile.east,
                    fetched_at: fetchedAt,
                    data_version: COURT_DATA_VERSION,
                })), { onConflict: 'tile_id' });
            if (cacheWriteError) throw cacheWriteError;
        }

        const retryBefore = new Date(Date.now() - ADDRESS_RETRY_INTERVAL_MS).toISOString();
        const { data: claimedRows, error: claimError } = await context.supabaseAdmin
            .rpc('claim_court_address_tiles', {
                requested_tile_ids: tiles.map((tile) => tile.id),
                required_address_version: ADDRESS_DATA_VERSION,
                retry_before: retryBefore,
            });

        if (claimError) throw claimError;

        const claimedTileIds = new Set(
            (claimedRows ?? []).map((row: { tile_id: string }) => row.tile_id),
        );

        if (claimedTileIds.size > 0) {
            const missingTileIds = new Set(missingTiles.map((tile) => tile.id));
            const claimedExistingTiles = tiles.filter(
                (tile) => claimedTileIds.has(tile.id) && !missingTileIds.has(tile.id),
            );
            const shouldUseNewElements = missingTiles.some((tile) => claimedTileIds.has(tile.id));

            const enrichmentTask = (async () => {
                try {
                    const existingTileData = claimedExistingTiles.length > 0
                        ? await fetchOverpass(courtOverpassQuery(claimedExistingTiles))
                        : { elements: [] };
                    const courtElements = [
                        ...(shouldUseNewElements ? newlyFetchedElements : []),
                        ...existingTileData.elements,
                    ];
                    const addressQuery = addressOverpassQuery(courtElements);
                    const addressData = addressQuery
                        ? await fetchOverpass(addressQuery)
                        : { elements: [] };
                    const enrichedCourts = [...new Map(
                        courtsFromOverpass(courtElements, addressData.elements)
                            .map((court) => [court.id, court]),
                    ).values()];

                    if (enrichedCourts.length > 0) {
                        const { error: enrichmentWriteError } = await context.supabaseAdmin
                            .from('courts')
                            .upsert(enrichedCourts, { onConflict: 'id' });
                        if (enrichmentWriteError) throw enrichmentWriteError;
                    }

                    const { error: versionWriteError } = await context.supabaseAdmin
                        .from('court_cache_tiles')
                        .update({ address_version: ADDRESS_DATA_VERSION })
                        .in('tile_id', [...claimedTileIds]);
                    if (versionWriteError) throw versionWriteError;
                } catch (error) {
                    console.warn('Court address enrichment failed; retry is time-gated.', error);
                }
            })();

            EdgeRuntime.waitUntil(enrichmentTask);
        }

        const { data: courts, error: courtReadError } = await context.supabaseAdmin
            .from('courts')
            .select('id, name, sport, latitude, longitude, address')
            .gte('latitude', bounds.south)
            .lte('latitude', bounds.north)
            .gte('longitude', bounds.west)
            .lte('longitude', bounds.east)
            .order('name');

        if (courtReadError) throw courtReadError;

        return json({
            courts: courts ?? [],
            cache: {
                fetchedTiles: missingTiles.length,
                reusedTiles: tiles.length - missingTiles.length,
                addressEnrichmentStarted: claimedTileIds.size,
            },
        });
    } catch (error) {
        console.error('get-courts failed', error);
        return json({
            error: error instanceof Error ? error.message : 'Unable to load courts.',
        }, 500);
    }
},
};
