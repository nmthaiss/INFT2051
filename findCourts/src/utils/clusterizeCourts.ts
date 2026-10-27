import type { Court } from "@/type/Court";
import type { CourtCluster } from "@/type/CourtCluster";

const CLUSTER_DISTANCE_METRES = 80;
const EARTH_APPROX_RADIUS_METRES = 6371000;
// Haversine formula to calculate the approximate real-world distance between two coordinates, copied from fetch courts
export function distanceInMetres(a: Court, b: Court) {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = radians(b.latitude - a.latitude);
    const longitudeDelta = radians(b.longitude - a.longitude);
    const latitude1 = radians(a.latitude);
    const latitude2 = radians(b.latitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

    return EARTH_APPROX_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

//Clusterize courts that have distance less than 80 into 1 marker on the map
export function clusterCourts(courts: Court[]): CourtCluster[] {
    // Set to track courts that was not grouped, deleting from said set after court found its cluster 
    const unvisited = new Set(courts.map((court) => court.id));
    const byId = new Map(courts.map((court) => [court.id, court]));
    const clusters: CourtCluster[] = [];

    for (const court of courts) {
        if (!unvisited.delete(court.id)) continue;

        const members = [court];
        for (let index = 0; index < members.length; index += 1) {
            const current = members[index];
            for (const candidateId of Array.from(unvisited)) {
                const candidate = byId.get(candidateId)!;
                if (distanceInMetres(current, candidate) <= CLUSTER_DISTANCE_METRES) {
                    unvisited.delete(candidateId);
                    members.push(candidate);
                }
            }
        }

        clusters.push({
            id: members.map((member) => member.id).sort().join(','),
            courts: members,
            // calc marker position by finding middle point of all courts in cluster
            latitude: members.reduce((sum, member) => sum + member.latitude, 0) / members.length,
            longitude: members.reduce((sum, member) => sum + member.longitude, 0) / members.length,
        });
    }

    return clusters;
}