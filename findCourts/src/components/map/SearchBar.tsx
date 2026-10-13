import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
};

export default function SearchBar({ value, onChangeText, onSubmit }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#52606d" />
      <TextInput
        accessibilityLabel="Search courts by name or address"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Search name or address"
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChangeText('')}
        >
          <Ionicons name="close-circle" size={20} color="#52606d" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 2,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
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
});
