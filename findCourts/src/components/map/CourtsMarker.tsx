import { View, Text, StyleSheet} from 'react-native';
import { Marker } from 'react-native-maps';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CourtCluster } from '@/type/CourtCluster';
import { useAppTheme } from '@/theme/appTheme';

type CourtsMarkerProps = {
    clusters: CourtCluster[];
    markerSize: number;
    onSelect: (cluster: CourtCluster) => void;
};

function clusterTitle(cluster: CourtCluster) {
    const namedCourts = [...new Set(
        cluster.courts.map((court) => court.name).filter((name) => name !== 'Unnamed court'),
    )];
    return namedCourts[0] ?? `${cluster.courts.length} nearby courts`;
}

export default function CourtsMarker({ clusters, markerSize, onSelect }: CourtsMarkerProps) {
    const { colors } = useAppTheme();
    const clusterMarkerSize = markerSize + 8;
    return (
        <>
        {clusters.map((cluster) => {
            // new set of sports for each cluster since courts can be used for many sports
            const isCluster = cluster.courts.length > 1;
            const size = isCluster ? clusterMarkerSize : markerSize;
            const sports = [...new Set(cluster.courts.map((court) => court.sport))].join(', ');
            const address = cluster.courts.find((court) => court.address)?.address ?? 'Address unavailable';
            const details = [
                cluster.courts.length > 1 ? `${cluster.courts.length} courts` : undefined,
                sports,
                address,
            ].filter(Boolean).join(' · ');

            return (
            <Marker
                key={cluster.id}
                coordinate={{
                    latitude: cluster.latitude,
                    longitude: cluster.longitude,
                }}
                onPress={(event) => {
                    event.stopPropagation();
                    onSelect(cluster);
                }}
            >
                {/* change this to the main sport of the court instead of number thats chop */}
                <View style={[styles.marker, isCluster && styles.clusterMarker, 
                    {
                        width: size,
                        height: size,
                        borderRadius: size /2,
                    }]}
                >
                    {isCluster ? (
                        <Text style={[styles.markerText, {fontSize: markerSize * 0.44}]}
                        >
                            {cluster.courts.length}
                        </Text>
                    ) : (
                        <Ionicons name="tennisball" size={markerSize * 0.58} color={colors.icons} />
                    )}
                </View>
            </Marker>
            );
        })}
        </>
    )
}

const styles = StyleSheet.create({
    marker: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#c233ff',
        borderColor: '#ffffff',
        borderWidth: 2,
    },
    clusterMarker: {
        backgroundColor: '#be3a85',
    },
    markerText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
});
