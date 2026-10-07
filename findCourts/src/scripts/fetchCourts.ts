import fetch from 'node-fetch';
import fs from 'fs';
import type OverpassResponse from './OverpassResponse';

const bbox = "-33.042924, 151.491600, -32.672819, 151.933682";  // newcastle region 

const query = `
    [out:json][timeout:30];
    (
    nwr["sport"="tennis"](${bbox});
    nwr["sport"="badminton"](${bbox});
    nwr["sport"="pickleball"](${bbox});
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

  const courts = data.elements.map((el) => {
    const tags = el.tags || {};
    const coords = el.type === "node"
      ? { lat: el.lat, lng: el.lon }
      : { lat: el.center.lat, lng: el.center.lon };

    return {
      id: `osm-${el.type}-${el.id}`,
      name: tags.name || "Unnamed court",
      sport: tags.sport,
      latitude: coords.lat,
      longitude: coords.lng,
      website: tags.website || null,
      source: "osm",
      verified: false,
    };
  });

  fs.writeFileSync("./courts/test.json", JSON.stringify(courts, null, 2));
  console.log(`Saved ${courts.length} courts`);
}

fetchCourts();
