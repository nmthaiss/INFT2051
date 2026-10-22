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
const OVERPASS_URLS = [
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
];
const OVERPASS_REQUEST_TIMEOUT_MS = 15_000;

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

function overpassQuery(tiles: Tile[]) {
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

function courtsFromOverpass(elements: OverpassElement[]) {
    const supportedSports = new Set(['tennis', 'badminton', 'pickleball']);

    return elements.flatMap((element) => {
        const tags = element.tags ?? {};
        const coords = coordinates(element);

        if (!coords || !supportedSports.has(tags.sport ?? '')) return [];

        return [{
            id: `osm-${element.type}-${element.id}`,
            osm_type: element.type,
            osm_id: element.id,
            name: tags.name || 'Unnamed court',
            sport: tags.sport,
            latitude: coords.lat,
            longitude: coords.lng,
            address: formatAddress(tags) || null,
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
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'User-Agent': 'FindCourts/1.0 (student project)',
                },
                body: elementsQuery,
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
            .select('tile_id, fetched_at')
            .in('tile_id', tiles.map((tile) => tile.id));

        if (cacheReadError) throw cacheReadError;

        const storedTileIds = new Set(
            (cachedRows ?? []).map((row) => row.tile_id),
        );

        const missingTiles = tiles.filter(
            (tile) => !storedTileIds.has(tile.id),
        );

        if (missingTiles.length > 0) {
            const overpassData = await fetchOverpass(overpassQuery(missingTiles));
            const fetchedCourts = courtsFromOverpass(overpassData.elements);

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
                })), { onConflict: 'tile_id' });
            if (cacheWriteError) throw cacheWriteError;
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
