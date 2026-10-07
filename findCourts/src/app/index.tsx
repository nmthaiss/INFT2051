import Map from '@/components/map/CourtsMap';
import { Link, Stack } from 'expo-router';

export default function App() {
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <Link href="/attribution" style={{color: 'white'}}>Attribution</Link>,
        }}
      />
      <Map />
    </>
  );
}
