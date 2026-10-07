type OverpassElement = 
| {
  "type": "node",
  "id": number,
  "lat": number,
  "lon": number,
  "tags"?: Record<string, string>; 
} 
| {
    type: "way" | "relation";
    id: number;
    center: {
    lat: number;
    lon: number;
    };
    tags?: Record<string, string>;
};
export default interface OverpassResponse {
  elements: OverpassElement[];
}