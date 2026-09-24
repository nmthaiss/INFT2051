import { View, Text, StyleSheet} from 'react-native';
import { Marker } from 'react-native-maps';

export default function CourtsMarker() {
  return (
    <Marker
        coordinate={{
            latitude: -32.9283,
            longitude: 151.7817,
        }}
        title="Basketball court"
        description="Court description"
        >
        <View style={styles.marker}>
            <Text style={styles.markerText}>🏀</Text>
        </View>
    </Marker>
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