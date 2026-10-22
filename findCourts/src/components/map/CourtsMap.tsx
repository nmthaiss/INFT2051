import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import Ionicons from '@expo/vector-icons/Ionicons';
import CourtsMarker, { Court } from './CourtsMarker';
import SearchBar from './SearchBar';
import fallbackCourtsData from '../../scripts/courts/osm-courts.json';
import { isSupabaseConfigured } from '@/lib/supabase';
import { loadCachedCourts, saveCachedCourts } from '@/services/courtCache';
import { getCourts } from '@/services/courts';

const fallbackCourts = fallbackCourtsData as Court[];
const NEARBY_REGION_DELTA = 0.12;
const DEFAULT_REGION = {
    latitude: -32.9283,
    longitude: 151.7817,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

export default function Map() {
    const mapRef = useRef<MapView>(null);
    const [locationAllowed, setLocationAllowed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [markerSize, setMarkerSize] = useState(30);
    const [courts, setCourts] = useState<Court[]>(
        isSupabaseConfigured ? [] : fallbackCourts,
    );
    const [courtsLoading, setCourtsLoading] = useState(false);
    const filteredCourts = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        if (!normalizedQuery) return courts;

        return courts.filter((court) =>
            court.name.toLocaleLowerCase().includes(normalizedQuery)
            || court.address?.toLocaleLowerCase().includes(normalizedQuery),
        );
    }, [courts, query]);

    function focusSearchResults() {
        if (!query.trim() || filteredCourts.length === 0) return;
        if (filteredCourts.length === 1) {
            const firstCourt = filteredCourts[0];
            mapRef.current?.animateToRegion({
                latitude: firstCourt.latitude,
                longitude: firstCourt.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 400);
            return;
        }
        const coordinates = filteredCourts.map((court) => ({
            latitude: court.latitude,
            longitude: court.longitude,
        }));

        mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: {
                top: 100,
                right: 50,
                bottom: 100,
                left: 50,
            },
            animated: true,
        });
    }

    function markerSizeForRegion(region: Region) {
        const MAX_SIZE = 40;
        const MIN_SIZE = 16;
        const MIN_DELTA = 0.01;
        const HIDE_DELTA = 0.4;

        if (region.longitudeDelta >= HIDE_DELTA) {
            return 0;
        }

        const delta = Math.max(region.longitudeDelta, MIN_DELTA);

        const scale = Math.log(HIDE_DELTA / delta) / Math.log(HIDE_DELTA / MIN_DELTA);
        return Math.round(MIN_SIZE + scale * (MAX_SIZE - MIN_SIZE));
    }

    const loadCourtsForRegion = useCallback(async (region: Region) => {
        if (!isSupabaseConfigured) return;

        setCourtsLoading(true);
        setError(null);

        try {
            const result = await getCourts({
                south: region.latitude - region.latitudeDelta / 2,
                west: region.longitude - region.longitudeDelta / 2,
                north: region.latitude + region.latitudeDelta / 2,
                east: region.longitude + region.longitudeDelta / 2,
            });
            setCourts(result.courts);
            await saveCachedCourts(result.courts);
        } catch (loadError) {
            const cached = await loadCachedCourts();
            if (cached) {
                setCourts(cached.courts);
            }

            const message = loadError instanceof Error ? loadError.message : 'Unable to load courts.';
            setError(cached ? `${message} Showing saved courts.` : message);
        } finally {
            setCourtsLoading(false);
        }
    }, []);

    const enableLocation = useCallback(async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setError('Permission to access location was denied');
            await loadCourtsForRegion(DEFAULT_REGION);
            return;
        }

        setLocationAllowed(true);

        const location = await Location.getCurrentPositionAsync({});

        const userRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: NEARBY_REGION_DELTA,
            longitudeDelta: NEARBY_REGION_DELTA,
        };

        mapRef.current?.animateToRegion(userRegion, 500);
        await loadCourtsForRegion(userRegion);
    }, [loadCourtsForRegion]);

    useEffect(() => {
        let active = true;

        async function initializeMap() {
            const cached = await loadCachedCourts();
            if (active && cached) {
                setCourts(cached.courts);
            }

            await enableLocation();
        }

        initializeMap().catch(() => {
            if (active) setError('Unable to initialize the map.');
        });

        return () => {
            active = false;
        };
    }, [enableLocation]);

    return (
    <View style={styles.container}>
        <MapView 
            style={styles.map}
            ref={mapRef}
            initialRegion={DEFAULT_REGION}
            showsCompass
            showsUserLocation={locationAllowed}
            showsPointsOfInterests={false}
            onRegionChangeComplete={(region) => {
                setMarkerSize(markerSizeForRegion(region));
            }}
        >
            {markerSize > 0 && (
                <CourtsMarker 
                    courts={filteredCourts}
                    markerSize={markerSize} 
                />
            )}
            
        </MapView>
        <SearchBar 
            value={query} 
            onChangeText={setQuery} 
            onSubmit={focusSearchResults} />
        {courtsLoading && <Text style={styles.loading}>Loading courts...</Text>}
        {!courtsLoading && !error && !query.trim() && courts.length === 0 && (
            <Text style={styles.noResults}>No courts found nearby</Text>
        )}
        {query.trim().length > 0 && filteredCourts.length === 0 && (
            <Text style={styles.noResults}>No courts match “{query.trim()}”</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
            style={styles.locationButton}
            onPress={() => {
                enableLocation().catch(() => {
                setError('Unable to get your current location.');
                });
            }}
        >
            <Ionicons name="locate" size={26} color="#ffffff" />
        </Pressable>
    </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'row',
    },
    map: { 
        width: '100%', 
        height: '100%' 
    },
    error: {
        position: 'absolute',
        top: 128,
        alignSelf: 'center',
        backgroundColor: 'white',
        marginHorizontal: 16,
        padding: 10,
        borderRadius: 8,
        elevation: 3,
    },
    noResults: {
        position: 'absolute',
        top: 74,
        alignSelf: 'center',
        backgroundColor: '#ffffff',
        color: '#172b4d',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        elevation: 3,
    },
    loading: {
        position: 'absolute',
        top: 74,
        alignSelf: 'center',
        backgroundColor: '#ffffff',
        color: '#172b4d',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        elevation: 3,
    },
    locationButton: {
        position: 'absolute',
        right: 16,
        bottom: 40,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#006eff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    locationIcon: {
        width: 26,
        height: 26,
    },
});
