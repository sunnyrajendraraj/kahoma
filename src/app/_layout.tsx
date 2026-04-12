import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth';

export default function RootLayout() {
  const { user, initialized, onboarded, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!initialized || onboarded === null) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Not logged in → go to auth
      router.replace('/auth/email');
    } else if (user && !onboarded && !inOnboarding) {
      // Logged in but not onboarded → go to onboarding
      router.replace('/onboarding');
    } else if (user && onboarded && (inAuthGroup || inOnboarding)) {
      // Logged in and onboarded → go to home
      router.replace('/(tabs)');
    }
  }, [user, initialized, onboarded, segments, router]);

  // Show loading spinner while initializing
  if (!initialized || onboarded === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C9933A" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050508' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="auth/email" />
        <Stack.Screen name="auth/verify" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="session/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="book/[id]"
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#050508',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
