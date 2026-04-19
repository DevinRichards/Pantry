import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'DMSans-Regular':  DMSans_400Regular,
    'DMSans-Medium':   DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold':     DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      {/* #F3F5F2 bg — matches design */}
      <StatusBar style="dark" backgroundColor="#F3F5F2" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan"        options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
