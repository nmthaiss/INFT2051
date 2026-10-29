import SearchBar from "@/components/search/SearchBar"
import { useCourtSearch } from "@/hooks/useCourtSearch";
import type { CourtCluster } from "@/type/CourtCluster";
import { useResponsiveTopOffset } from '@/hooks/useResponsiveTopOffset';
import { router, Stack } from "expo-router";
import { View, StyleSheet, Text } from "react-native";
import { useCourtsContext } from "@/context/CourtsContext";
import { useAppTheme } from "@/theme/appTheme";

export default function SearchScreen() {
    const { courtClusters, setSelectedCluster } = useCourtsContext();
    const topOffset = useResponsiveTopOffset();
    const { colors } = useAppTheme();
    
    const {
        query,
        suggestions,
        suggestionsLoading,
        showSuggestions,
        changeQuery,
        searchError,
        dismissSuggestions,
        selectSuggestion,
    } = useCourtSearch(courtClusters);

    function handleSelectSuggestion(cluster: CourtCluster) {
        selectSuggestion(cluster);
        setSelectedCluster(cluster)
        router.back();
    }

    return (
        <View style={[ styles.screen, { backgroundColor: colors.background} ]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <SearchBar 
                topOffset={topOffset}
                autoFocus
                value={query}
                onBack={() => router.back()}
                onChangeText={changeQuery}
                onDismissSuggestions={dismissSuggestions}
                onSelectSuggestion={handleSelectSuggestion}
                onSubmit={() => {
                    if (suggestions[0]) { 
                        handleSelectSuggestion(suggestions[0])
                    }
                }}
                showSuggestions={showSuggestions}
                suggestions={suggestions}
                suggestionsLoading={suggestionsLoading}
            />
            {searchError && 
                <Text style={[styles.error, {color: colors.error}, ]}>{searchError}</Text>
            }
        </View>
    )
    
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    error: {
        marginTop: 80,
        marginHorizontal: 20,
        textAlign: 'center',
    }
});
