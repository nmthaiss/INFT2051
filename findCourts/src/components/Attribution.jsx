
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

function Attribution() {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => Linking.openURL('https://www.flaticon.com/free-icons/badminton')}
      >
        <Text style={styles.link}>Badminton icons created by Handicon - Flaticon</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    link: {
        color: '#006eff',
        textDecorationLine: 'underline',
    },
});

export default Attribution;
