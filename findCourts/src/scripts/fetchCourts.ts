import fetch from 'node-fetch';
import fs from 'fs';
import type OverpassResponse from './OverpassResponse';

const bbox = "-33.042924, 151.491600, -32.672819, 151.933682";  // newcastle region 
const EARTH_APPROX_RADIUS_METRES = 6371000;

// Returns the courts.
// Also returns address-bearing OSM features within 200 metres of those courts.
const query = `
    [out:json][timeout:30];
    (
    nwr["sport"="tennis"](${bbox});
    nwr["sport"="badminton"](${bbox});
    nwr["sport"="pickleball"](${bbox});
    )->.courts;
    (
      .courts;
      nwr(around.courts:200)["addr:street"];    
    );
    out center tags;
`;

async function fetchCourts() {
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });
  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status}`);
    }
  const data = (await response.json()) as OverpassResponse;

  const supportedSports = new Set(['tennis', 'badminton', 'pickleball']);
  // make cordinates element and center element the same format
  const coordinates = (el: OverpassResponse['elements'][number]) => el.type === "node"
    ? { lat: el.lat, lng: el.lon }
    : { lat: el.center.lat, lng: el.center.lon };
  
  // join seperate parts of address into one searchable string
  const formatAddress = (tags: Record<string, string>) => [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean).join(', ');

  // Haversine formula to calculate the approximate real-world distance between two coordinates, written by AI
  const distanceInMetres = (first: { lat: number; lng: number }, second: { lat: number; lng: number }) => {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = radians(second.lat - first.lat);
    const longitudeDelta = radians(second.lng - first.lng);
    const value = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(longitudeDelta / 2) ** 2;
    return EARTH_APPROX_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };

  // Map cordinates with address for each element
  const addressFeatures = data.elements
    .filter((el) => formatAddress(el.tags || {}))
    .map((el) => ({ ...coordinates(el), address: formatAddress(el.tags || {}) }));

  // foreach courts, calc distance between the current element and the nearest address, keep the feature with no more 200 distance then
  // sort the courts from nearest to furthest and assign the first address to that court
  const courts = data.elements.filter((el) => supportedSports.has(el.tags?.sport || '')).map((el) => {
    const tags = el.tags || {};
    const coords = coordinates(el);
    const nearestAddress = addressFeatures
      .map((feature) => ({ ...feature, distance: distanceInMetres(coords, feature) }))
      .filter((feature) => feature.distance <= 200)
      .sort((a, b) => a.distance - b.distance)[0]?.address;
    const address = formatAddress(tags) || nearestAddress;

    return {
      id: `osm-${el.type}-${el.id}`,
      name: tags.name || "Unnamed court",
      sport: tags.sport,
      latitude: coords.lat,
      longitude: coords.lng,
      website: tags.website || null,
      address: address || null,
      source: "osm",
      verified: false,
    };
  });

  fs.writeFileSync("./src/scripts/courts/osm-courts.json", JSON.stringify(courts, null, 2));
  console.log(`Saved ${courts.length} courts`);
}

fetchCourts();
