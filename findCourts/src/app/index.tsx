import Map from '@/components/map/CourtsMap';
import { Color, Link, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function App() {
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (<Link href="/attribution" style={{color: 'white'}} asChild>
              <Pressable style={styles.buttons}>
                <Text style={styles.text}>Attribution</Text>
              </Pressable>
            </Link>),
        }}
      />
      <Map />
    </>
  );
}

const styles ={
  buttons: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    color: 'white',
  }
}
