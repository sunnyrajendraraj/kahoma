import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [bookCount, setBookCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .then(({ count }) => {
          setBookCount(count ?? 0);
        });
    }
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? 'Unknown'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Books Created</Text>
          <Text style={styles.value}>{bookCount}</Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kahoma v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5EDD8',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  infoCard: {
    backgroundColor: '#0F0D0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 147, 58, 0.1)',
  },
  label: {
    fontSize: 12,
    color: '#6b5c4e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#F5EDD8',
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#D4443B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    color: '#D4443B',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    color: '#6b5c4e',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
