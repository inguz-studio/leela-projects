import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initSentry } from '../lib/sentry';

// Sentry: no-op silencioso quando EXPO_PUBLIC_SENTRY_DSN não está definido
initSentry();

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Leela' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
