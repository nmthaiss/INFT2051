import Map from '@/components/map/CourtsMap';
import { Stack } from 'expo-router';

export default function App() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Map />
    </>
  );
}
