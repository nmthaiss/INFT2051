import { CourtsProvider } from '@/context/CourtsContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <CourtsProvider>
      <Stack />
    </CourtsProvider>
  );
}
