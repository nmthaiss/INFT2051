import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import MapView from 'react-native-maps';
import Ionicons from '@expo/vector-icons/Ionicons';
import CourtsMarker from './CourtsMarker';

export default function Map() {
    const mapRef = useRef<MapView>(null);
    const [locationAllowed, setLocationAllowed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function enableLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
    }

    setLocationAllowed(true);

    const location = await Location.getCurrentPositionAsync({});

    mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    }, 500);
    }
    useEffect(() => {
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
        >
            <CourtsMarker />
        </MapView>
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
