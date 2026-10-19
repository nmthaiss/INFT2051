import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import Ionicons from '@expo/vector-icons/Ionicons';
import CourtsMarker, { Court } from './CourtsMarker';
import SearchBar from './SearchBar';
import courtsData from '../../scripts/courts/osm-courts.json';

const courts = courtsData as Court[];

export default function Map() {
    const mapRef = useRef<MapView>(null);
    const [locationAllowed, setLocationAllowed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [markerSize, setMarkerSize] = useState(30);
    const filteredCourts = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        if (!normalizedQuery) return courts;

        return courts.filter((court) =>
            court.name.toLocaleLowerCase().includes(normalizedQuery)
            || court.address?.toLocaleLowerCase().includes(normalizedQuery),
        );
    }, [query]);

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

    async function enableLocation() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setError('Permission to access location was denied');
            return;
        }

        setLocationAllowed(true);

        const location = await Location.getCurrentPositionAsync({});

        // 
        mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,            // zoom level of map, 0.01 is ~ 1.1km
            longitudeDelta: 0.01,
        }, 500);
    }

    useEffect(() => {
        // Permission and position state are intentionally initialized on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        enableLocation().catch(() => {
            setError('Unable to get your current location.');
        });
    }, []);

    return (
    <View style={styles.container}>
        <MapView 
            style={styles.map}
            ref={mapRef}
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
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
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
