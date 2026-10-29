import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CourtCluster } from '@/type/CourtCluster';
import { useAppTheme } from '@/theme/appTheme';


type SearchBarProps = {
  topOffset?: number;
  autoFocus?: boolean;
  onBack?: () => void;

  value: string;
  onChangeText: (value: string) => void;
  onDismissSuggestions: () => void;
  onSelectSuggestion: (courtCluster: CourtCluster) => void;
  onSubmit: () => void;
  showSuggestions: boolean;
  suggestions: CourtCluster[];
  suggestionsLoading: boolean;
};

export default function SearchBar({
  topOffset,
  autoFocus = false,
  onBack,
  value,
  onChangeText,
  onDismissSuggestions,
  onSelectSuggestion,
  onSubmit,
  showSuggestions,
  suggestions,
  suggestionsLoading,
}: SearchBarProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrapper, { top: topOffset }]}>
      <View style={[styles.container, {backgroundColor: colors.background},]}>
        {onBack ? (
          <Pressable
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={onBack}
          >
              <Ionicons
                  name="arrow-back"
                  size={22}
                  color={colors.icons}
              />
          </Pressable>
        ) : (
            <Ionicons
                name="search"
                size={20}
                color={colors.icons}
            />
        )}
        <TextInput
          autoFocus={autoFocus}
          accessibilityLabel="Search courts by name or address"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Escape') onDismissSuggestions();
          }}
          onSubmitEditing={onSubmit}
          placeholder="Search name or address"
          placeholderTextColor={colors.secondaryText}
          returnKeyType="search"
          style={[styles.input, { color: colors.text },]}
          value={value}
        />
        {suggestionsLoading && <ActivityIndicator color="#006eff" size="small" />}
        {value.length > 0 && !suggestionsLoading && (
          <Pressable
            accessibilityLabel="Clear search"
            hitSlop={10}
            onPress={() => onChangeText('')}
          >
            <Ionicons name="close-circle" size={20} color={colors.icons} />
          </Pressable>
        )}
      </View>

      {showSuggestions && (
        <View style={[styles.suggestions, {backgroundColor: colors.background}]}>
          {suggestions.length > 0 ? suggestions.map((cluster) => {
            const representative = cluster.courts.find((court) => court.address) ?? cluster.courts[0];

            return (
              <Pressable
                accessibilityRole="button"
                key={cluster.id}
                onPress={() => onSelectSuggestion(cluster)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              >
                <Ionicons name="location-outline" size={20} color={colors.secondaryText} />
                <View style={styles.suggestionText}>
                  <Text numberOfLines={1} style={[styles.suggestionName, {color: colors.secondaryText}]}>{representative?.name ?? 'Unnamed court'}</Text>
                  <Text numberOfLines={1} style={[styles.suggestionDetails, {color: colors.secondaryText}]}>
                    {[representative?.address ?? 'Address unavailable', representative?.sport].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            );
          }) : !suggestionsLoading && (
            <Text style={[styles.emptySuggestion, {color: colors.secondaryText}] }>No stored courts found</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 2,
  },
  container: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 16,
    color: '#172b4d',
  },
  suggestions: {
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  suggestion: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomColor: '#e6e9ed',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionPressed: {
    backgroundColor: '#f0f6ff',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    color: '#172b4d',
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionDetails: {
    marginTop: 2,
    color: '#52606d',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  emptySuggestion: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 14,
  }
});
