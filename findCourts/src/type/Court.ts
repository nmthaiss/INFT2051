export type Court = {
    id: string;
    name: string;
    sport: string;
    latitude: number;
    longitude: number;
    address?: string | null;
};