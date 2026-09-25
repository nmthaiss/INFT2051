import { View, Text, StyleSheet} from 'react-native';
import { Marker } from 'react-native-maps';
import courts from '../../scripts/courts/osm-courts.json'

export default function CourtsMarker() {
    return (
        <>
        {courts.map((court) => (
            <Marker
                key={court.id}
                coordinate={{
                    latitude: court.latitude,
                    longitude: court.longitude,
                }}
                title={court.name}
                description={court.sport + " court"}
            >
                <View style={styles.marker}>
                    
                    <Text style={styles.markerText}>ok</Text>
                    
                </View>
            </Marker>
        ))}
        </>
    )
}

const styles = StyleSheet.create({
    marker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerText: {
        fontSize: 20,
    },
});